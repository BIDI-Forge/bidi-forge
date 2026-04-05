import { fixMixedText } from "@rtl-text-fixer/core";

import { getExtensionRuntimeState, SYNC_SETTING_KEYS } from "./storage.js";
import { computeEffectiveEnabled } from "./siteScope.js";

/** Workspace core types load from `packages/core/dist` after build; keep a narrow boundary for ESLint. */
function fixMixedTextSafe(text: string): string {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call -- core return is string
  return fixMixedText(text);
}

const EDITABLE_SELECTOR = 'textarea,[contenteditable]:not([contenteditable="false"])';
const SKIP_FIX_SELECTOR = "pre,code,script,style";

const PERSIAN_RE = /[\u0600-\u06FF]/;
const ENGLISH_RE = /[a-zA-Z]/;

function isMixedPersianEnglish(text: string): boolean {
  return PERSIAN_RE.test(text) && ENGLISH_RE.test(text);
}

function closestElement(node: Node): Element | null {
  if (node.nodeType === Node.ELEMENT_NODE) return node as Element;
  return (node as ChildNode).parentElement ?? null;
}

function isInSkippedContainer(node: Node): boolean {
  const el = closestElement(node);
  return Boolean(el?.closest?.(SKIP_FIX_SELECTOR));
}

function isInsideEditable(node: Node): boolean {
  const el = closestElement(node);
  if (!el) return false;
  const editable = el.closest?.(EDITABLE_SELECTOR);
  return Boolean(editable);
}

function isEditableElement(
  el: Element,
): el is HTMLTextAreaElement | (HTMLElement & { isContentEditable: boolean }) {
  if (el.tagName === "TEXTAREA") return true;
  if (el instanceof HTMLElement && el.isContentEditable) return true;
  return false;
}

function isBidiMarker(ch: string): boolean {
  return ch === "\u200E" || ch === "\u200F";
}

function mapOriginalOffsetToFixed(original: string, fixed: string, originalOffset: number): number {
  const target = Math.max(0, Math.min(originalOffset, original.length));
  let j = 0; // original index
  let i = 0; // fixed index

  while (i < fixed.length && j < target) {
    const fc = fixed[i]!;
    if (isBidiMarker(fc)) {
      i++;
      continue;
    }

    const oc = original[j]!;
    if (fc === oc) {
      i++;
      j++;
      continue;
    }

    // Fallback: if something unexpected diverged, advance in fixed to avoid infinite loops.
    i++;
  }

  // Include any markers that were inserted right at this boundary.
  while (i < fixed.length && isBidiMarker(fixed[i]!)) i++;
  return i;
}

interface SelectionOffsets {
  start: number;
  end: number;
}

function buildTextWalker(root: Node): TreeWalker {
  const doc = root.nodeType === Node.DOCUMENT_NODE ? (root as Document) : (root.ownerDocument ?? document);
  return doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n: Node) => {
      if (n.nodeType !== Node.TEXT_NODE) return NodeFilter.FILTER_REJECT;
      const t = n as Text;
      if (!t.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
      if (isInSkippedContainer(t)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
}

function selectionTextOffsetsWithin(root: HTMLElement): SelectionOffsets | undefined {
  const sel = root.ownerDocument.getSelection?.();
  if (!sel || sel.rangeCount === 0) return undefined;

  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return undefined;

  const startRange = root.ownerDocument.createRange();
  startRange.setStart(root, 0);
  startRange.setEnd(range.startContainer, range.startOffset);
  const start = startRange.toString().length;

  const endRange = root.ownerDocument.createRange();
  endRange.setStart(root, 0);
  endRange.setEnd(range.endContainer, range.endOffset);
  const end = endRange.toString().length;

  return { start, end };
}

function findTextPointAtOffset(
  root: HTMLElement,
  textOffset: number,
): { node: Text; offset: number } | undefined {
  const walker = buildTextWalker(root);
  let remaining = Math.max(0, textOffset);

  let n: Node | null;
  while ((n = walker.nextNode())) {
    const t = n as Text;
    const len = t.nodeValue?.length ?? 0;
    if (remaining <= len) return { node: t, offset: remaining };
    remaining -= len;
  }

  // No text nodes; fallback to placing caret at end.
  return undefined;
}

function shouldFixText(text: string): boolean {
  return isMixedPersianEnglish(text);
}

function fixTextarea(el: HTMLTextAreaElement): void {
  const original = el.value ?? "";
  if (!original.trim()) return;
  if (!shouldFixText(original)) return;

  const fixed = fixMixedTextSafe(original);
  if (fixed === original) return;

  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? start;
  const nextStart = mapOriginalOffsetToFixed(original, fixed, start);
  const nextEnd = mapOriginalOffsetToFixed(original, fixed, end);

  el.value = fixed;
  try {
    el.setSelectionRange(nextStart, nextEnd);
  } catch {
    // Ignore selection errors for edge-case elements.
  }
}

function fixContentEditableRoot(root: HTMLElement): boolean {
  if (!root.isContentEditable) return false;
  if (isInSkippedContainer(root)) return false;

  const selection = selectionTextOffsetsWithin(root);
  let nextSelection: SelectionOffsets | undefined = selection ? { ...selection } : undefined;

  const walker = buildTextWalker(root);
  let n: Node | null;
  let prefixLen = 0; // length in the *current* (mutating) text stream
  let changed = false;

  while ((n = walker.nextNode())) {
    const t = n as Text;
    const original = t.nodeValue ?? "";
    const originalLen = original.length;

    if (!shouldFixText(original)) {
      prefixLen += originalLen;
      continue;
    }

    const fixed = fixMixedTextSafe(original);
    if (fixed === original) {
      prefixLen += originalLen;
      continue;
    }

    // Map selection offsets through this node’s change.
    if (nextSelection) {
      const mapOffset = (globalOffset: number): number => {
        const local = globalOffset - prefixLen;
        if (local < 0) return globalOffset; // before this node
        if (local > originalLen) return globalOffset + (fixed.length - originalLen); // after this node
        const mappedLocal = mapOriginalOffsetToFixed(original, fixed, local);
        return prefixLen + mappedLocal;
      };
      nextSelection = {
        start: mapOffset(nextSelection.start),
        end: mapOffset(nextSelection.end),
      };
    }

    t.nodeValue = fixed;
    changed = true;
    prefixLen += fixed.length;
  }

  if (!changed) return false;

  if (nextSelection) {
    const startPoint = findTextPointAtOffset(root, nextSelection.start);
    const endPoint = findTextPointAtOffset(root, nextSelection.end) ?? startPoint;
    if (startPoint && endPoint) {
      const sel = root.ownerDocument.getSelection?.();
      if (sel) {
        const r = root.ownerDocument.createRange();
        r.setStart(startPoint.node, startPoint.offset);
        r.setEnd(endPoint.node, endPoint.offset);
        sel.removeAllRanges();
        sel.addRange(r);
      }
    }
  }

  return true;
}

export function fixInputElement(el: Element): void {
  if (!enabled) return;
  if (!isEditableElement(el)) return;
  if (isInSkippedContainer(el)) return;

  if (el instanceof HTMLTextAreaElement) {
    fixTextarea(el);
    return;
  }

  if (!(el instanceof HTMLElement)) return;
  fixContentEditableRoot(el);
}

export function fixTextNode(textNode: Text): void {
  if (!enabled) return;
  if (isInSkippedContainer(textNode)) return;
  if (isInsideEditable(textNode)) return;

  const original = textNode.nodeValue ?? "";
  const last = lastProcessedText.get(textNode);
  if (last !== undefined && last === original) return;
  if (!original.trim()) return;
  if (!shouldFixText(original)) return;

  const fixed = fixMixedTextSafe(original);
  if (fixed !== original) textNode.nodeValue = fixed;
  lastProcessedText.set(textNode, textNode.nodeValue ?? "");
}

function walkAndFix(root: Node): void {
  const walker = buildTextWalker(root);
  let current: Node | null;
  while ((current = walker.nextNode())) {
    fixTextNode(current as Text);
  }
}

export function scanDocument(doc: Document): void {
  if (!enabled) return;
  if (!doc.body) return;
  walkAndFix(doc.body);

  // Attach input handlers for editable elements we can see now.
  const editables = Array.from(doc.querySelectorAll(EDITABLE_SELECTOR));
  for (const el of editables) ensureEditableWired(el);

  // Best-effort: same-origin iframes.
  const iframes = Array.from(doc.querySelectorAll("iframe"));
  for (const iframe of iframes) tryInitIframe(iframe);
}

type ContentMessage =
  | { type: "SET_ENABLED"; enabled: boolean }
  | { type: "GET_ENABLED" }
  | { type: "ENABLED_CHANGED"; enabled: boolean };

let enabled = false;
const observers = new Map<Document, MutationObserver>();
let queued = new Set<Node>();
let scheduled = false;
let scheduleTimer: number | undefined;
let idleId: number | undefined;

const wiredEditables = new WeakSet<Element>();
const composing = new WeakMap<Element, boolean>();
const programmaticEdit = new WeakSet<Element>();
const lastAppliedInputText = new WeakMap<Element, string>();
const scheduledInputFix = new WeakMap<Element, number>();
const lastProcessedText = new WeakMap<Text, string>();

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
      const t = node as Text;
      const current = t.nodeValue ?? "";
      const last = lastProcessedText.get(t);
      if (last !== undefined && last === current) continue;
      fixTextNode(t);
      lastProcessedText.set(t, t.nodeValue ?? "");
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      if (!isInSkippedContainer(el)) walkAndFix(el);

      // Newly-added editables or iframes (including deeply nested).
      const root = el as ParentNode;
      const editables = Array.from(root.querySelectorAll?.(EDITABLE_SELECTOR) ?? []);
      for (const e of editables) ensureEditableWired(e);

      const iframes = Array.from(root.querySelectorAll?.("iframe") ?? []);
      for (const iframe of iframes) tryInitIframe(iframe);
    }
  }

  if (queued.size > 0) scheduleFlush();
}

function ensureEditableWired(el: Element): void {
  if (!enabled) return;
  if (!isEditableElement(el)) return;
  if (wiredEditables.has(el)) return;
  wiredEditables.add(el);

  const schedule = () => {
    if (!enabled) return;
    if (programmaticEdit.has(el)) return;
    if (composing.get(el)) return;

    const prev = scheduledInputFix.get(el);
    if (prev !== undefined) window.clearTimeout(prev);
    const id = window.setTimeout(() => {
      scheduledInputFix.delete(el);
      if (!enabled) return;
      if (programmaticEdit.has(el)) return;
      if (composing.get(el)) return;

      const currentText =
        el instanceof HTMLTextAreaElement ? el.value ?? "" : (el as HTMLElement).innerText ?? "";
      const last = lastAppliedInputText.get(el);
      if (last !== undefined && last === currentText) return;

      // Prevent our own write-back from re-triggering.
      programmaticEdit.add(el);
      try {
        fixInputElement(el);
      } finally {
        programmaticEdit.delete(el);
        const afterText = el instanceof HTMLTextAreaElement ? el.value ?? "" : (el as HTMLElement).innerText ?? "";
        lastAppliedInputText.set(el, afterText);
      }
    }, 30);
    scheduledInputFix.set(el, id);
  };

  el.addEventListener("compositionstart", () => composing.set(el, true), { passive: true });
  el.addEventListener("compositionend", () => {
    composing.set(el, false);
    schedule();
  });
  el.addEventListener("input", schedule, { passive: true });

  // Initial pass (if the user already has mixed content in the composer).
  schedule();
}

function tryInitIframe(iframe: HTMLIFrameElement): void {
  if (!enabled) return;
  try {
    const doc = iframe.contentDocument;
    if (!doc) return;
    ensureObserverForDocument(doc);
    scanDocument(doc);
  } catch {
    // Cross-origin iframe; ignore.
  }
}

function ensureObserverForDocument(doc: Document): void {
  if (!enabled) return;
  if (observers.has(doc)) return;
  if (!doc.body) return;

  const obs = new MutationObserver((mutations: MutationRecord[]) => {
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

  obs.observe(doc.body, {
    subtree: true,
    childList: true,
    characterData: true,
  });

  observers.set(doc, obs);
}

function startObservers(): void {
  // Initialize the top-level document and best-effort same-origin iframes.
  ensureObserverForDocument(document);
  scanDocument(document);

  const iframes = Array.from(document.querySelectorAll("iframe"));
  for (const iframe of iframes) tryInitIframe(iframe);
}

function stopObservers(): void {
  for (const obs of observers.values()) {
    obs.disconnect();
  }
  observers.clear();
  queued.clear();
  clearScheduledWork();
}

function applyEnabled(next: boolean): void {
  if (enabled === next) return;
  enabled = next;

  if (!enabled) {
    stopObservers();
    return;
  }

  if (document.body) {
    startObservers();
  } else {
    window.addEventListener(
      "DOMContentLoaded",
      () => {
        if (!enabled) return;
        if (!document.body) return;
        startObservers();
      },
      { once: true },
    );
  }
}

function currentHostname(): string {
  return window.location.hostname.toLowerCase();
}

async function readEffectiveEnabled(): Promise<boolean> {
  const state = await getExtensionRuntimeState();
  return computeEffectiveEnabled(state.enabled, currentHostname(), state.site);
}

async function init(): Promise<void> {
  applyEnabled(await readEffectiveEnabled());

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync") return;
    if (!SYNC_SETTING_KEYS.some((k) => changes[k])) return;
    void readEffectiveEnabled().then(applyEnabled);
  });

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    const m = msg as ContentMessage | undefined;
    if (m?.type === "SET_ENABLED" || m?.type === "ENABLED_CHANGED") {
      void readEffectiveEnabled().then(applyEnabled);
      sendResponse?.({ ok: true });
      return;
    }
    if (m?.type === "GET_ENABLED") {
      sendResponse?.({ enabled });
    }
  });
}

void init();
