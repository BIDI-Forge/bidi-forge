import { fixMixedText } from "@rtl-text-fixer/core";

import { getEnabled, storageKey } from "./storage.js";

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "CODE", "PRE", "NOSCRIPT"]);
const LRM = "\u200E";
const RLM = "\u200F";

function shouldSkipNode(node: Node): boolean {
  const parent = node.parentElement;
  if (!parent) return false;
  if (SKIP_TAGS.has(parent.tagName)) return true;
  if (parent.isContentEditable) return true;
  return false;
}

function seemsMixedDirection(text: string): boolean {
  // Cheap heuristic: only consider strings that contain RTL + (Latin letters or digits).
  // This avoids running the full tokenizer/fixer on most noisy DOM updates.
  const hasRtl = /[\u0590-\u08FF\uFB1D-\uFEFC]/.test(text);
  if (!hasRtl) return false;
  const hasLatinOrDigit = /[A-Za-z0-9]/.test(text);
  return hasLatinOrDigit;
}

function hasBidiMarker(text: string): boolean {
  return text.includes(LRM) || text.includes(RLM);
}

function fixTextNode(textNode: Text): void {
  if (shouldSkipNode(textNode)) return;
  const original = textNode.nodeValue ?? "";
  if (!original.trim()) return;
  if (!seemsMixedDirection(original) && !hasBidiMarker(original)) return;

  const fixed = fixMixedText(original);
  if (fixed !== original) textNode.nodeValue = fixed;
}

function walkAndFix(root: Node): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current: Node | null;
  while ((current = walker.nextNode())) {
    fixTextNode(current as Text);
  }
}

type ContentMessage =
  | { type: "SET_ENABLED"; enabled: boolean }
  | { type: "GET_ENABLED" }
  | { type: "ENABLED_CHANGED"; enabled: boolean };

let enabled = false;
let observer: MutationObserver | undefined;
let queued = new Set<Node>();
let scheduled = false;
let scheduleTimer: number | undefined;
let idleId: number | undefined;

function requestIdle(cb: () => void, timeoutMs: number): number | undefined {
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number })
    .requestIdleCallback;
  if (typeof ric !== "function") return undefined;
  return ric(cb, { timeout: timeoutMs });
}

function cancelIdle(id: number): void {
  const cic = (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
  if (typeof cic !== "function") return;
  cic(id);
}

function clearScheduledWork(): void {
  if (scheduleTimer !== undefined) {
    window.clearTimeout(scheduleTimer);
    scheduleTimer = undefined;
  }
  if (idleId !== undefined) {
    cancelIdle(idleId);
    idleId = undefined;
  }
  scheduled = false;
}

function scheduleFlush(): void {
  if (!enabled) return;
  if (scheduled) return;
  scheduled = true;

  const runFlush = () => {
    scheduled = false;
    flushQueue();
  };

  // Prefer idle time; fall back to a small timeout to coalesce bursts.
  idleId = requestIdle(runFlush, 250);
  if (idleId === undefined) {
    scheduleTimer = window.setTimeout(runFlush, 25);
  }
}

function enqueueNode(node: Node): void {
  if (!enabled) return;
  queued.add(node);
  scheduleFlush();
}

function flushQueue(): void {
  if (!enabled) return;
  if (queued.size === 0) return;

  const batch = Array.from(queued);
  queued = new Set<Node>();

  // Cap work per flush to avoid long tasks; reschedule if needed.
  const MAX = 300;
  const toProcess = batch.slice(0, MAX);
  const leftover = batch.slice(MAX);
  for (const n of leftover) queued.add(n);

  for (const node of toProcess) {
    if (node.nodeType === Node.TEXT_NODE) {
      fixTextNode(node as Text);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      walkAndFix(node);
    }
  }

  if (queued.size > 0) scheduleFlush();
}

function startObserver(): void {
  if (observer) return;
  if (!document.body) return;

  observer = new MutationObserver((mutations: MutationRecord[]) => {
    for (const m of mutations) {
      if (m.type === "characterData" && m.target.nodeType === Node.TEXT_NODE) {
        enqueueNode(m.target);
        continue;
      }

      if (m.type === "childList") {
        const addedNodes = Array.from(m.addedNodes as unknown as NodeListOf<Node>);
        for (const added of addedNodes) {
          if (added.nodeType === Node.TEXT_NODE || added.nodeType === Node.ELEMENT_NODE) {
            enqueueNode(added);
          }
        }
      }
    }
  });

  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
  });
}

function stopObserver(): void {
  observer?.disconnect();
  observer = undefined;
  queued.clear();
  clearScheduledWork();
}

function applyEnabled(next: boolean): void {
  if (enabled === next) return;
  enabled = next;

  if (!enabled) {
    stopObserver();
    return;
  }

  if (document.body) {
    walkAndFix(document.body);
    startObserver();
  } else {
    window.addEventListener(
      "DOMContentLoaded",
      () => {
        if (!enabled) return;
        if (!document.body) return;
        walkAndFix(document.body);
        startObserver();
      },
      { once: true },
    );
  }
}

async function init(): Promise<void> {
  applyEnabled(await getEnabled());

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync") return;
    const c = changes[storageKey()];
    if (!c) return;
    applyEnabled(Boolean(c.newValue));
  });

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    const m = msg as ContentMessage | undefined;
    if (m?.type === "SET_ENABLED" || m?.type === "ENABLED_CHANGED") {
      applyEnabled(Boolean(m.enabled));
      sendResponse?.({ ok: true });
      return;
    }
    if (m?.type === "GET_ENABLED") {
      sendResponse?.({ enabled });
    }
  });
}

void init();
