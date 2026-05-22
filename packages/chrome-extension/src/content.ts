import { fixMixedText, stripBidiMarkers as stripBidiMarkersCore } from "@rtl-text-fixer/core";

import { tryFixMixedBlockCoalesced } from "./blockFix.js";
import { hookShadowRootsInTree, querySelectorAllDeepFrom } from "./domDeep.js";
import {
  applyGeminiQuillBidiOverrides,
  isGeminiQuillComposer,
  isGoogleAiHost,
  maintainGeminiComposer,
  resolveGeminiQuillEditor,
} from "./geminiQuill.js";
import { scanMessageSurfaces, scanMessageSurfacesFromElement } from "./messageSurfaces.js";
import { getExtensionRuntimeState, SYNC_SETTING_KEYS } from "./storage.js";
import { computeEffectiveEnabled } from "./siteScope.js";

function fixMixedTextSafe(text: string): string {
  return fixMixedText(text);
}

const EDITABLE_SELECTOR =
  'textarea,[contenteditable]:not([contenteditable="false"]),[role="textbox"][contenteditable]:not([contenteditable="false"])';
const SKIP_FIX_SELECTOR = "pre,code,script,style";
const COMPOSER_INPUT_DEBOUNCE_MS = 450;
const GEMINI_MAINTAIN_DEBOUNCE_MS = 280;
const COMPOSER_AFTER_ENTER_GRACE_MS = 750;

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
  if (el instanceof HTMLElement && el.classList.contains("ql-clipboard")) return false;
  if (el.tagName === "TEXTAREA") return true;
  if (el instanceof HTMLElement && el.isContentEditable) return true;
  return false;
}

const LRM_CHAR = "\u200E";
const RLM_CHAR = "\u200F";

function isBidiMarker(ch: string): boolean {
  return ch === LRM_CHAR || ch === RLM_CHAR;
}

/** DOM `innerText` follows visual order in mixed RTL/LTR; fixing that string corrupts text. Always strip old markers before re-tokenizing. */
function stripBidiMarkers(s: string): string {
  return stripBidiMarkersCore(s);
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

function shouldFixText(text: string): boolean {
  return isMixedPersianEnglish(text);
}

function comparableLogicalText(el: Element): string {
  if (el instanceof HTMLTextAreaElement) return stripBidiMarkers(el.value ?? "");
  if (el instanceof HTMLElement) return stripBidiMarkers(el.textContent ?? "");
  return "";
}

/**
 * Many AI chat UIs set `direction: ltr` on the editor; LRM/RLM then do almost nothing visually.
 * `!important` beats strong site CSS; see `applyShadowHostBidiHintsFrom` for Google’s shadow-wrapped composers.
 */
const bidiHintsApplied = new WeakSet<HTMLElement>();
const shadowBidiHintsApplied = new WeakSet<HTMLElement>();

function applyComposerBidiHint(host: HTMLElement): void {
  const ok =
    host instanceof HTMLTextAreaElement || (host instanceof HTMLElement && host.isContentEditable);
  if (!ok || bidiHintsApplied.has(host)) return;
  bidiHintsApplied.add(host);
  host.setAttribute("dir", "auto");
  host.style.setProperty("unicode-bidi", "plaintext", "important");
  host.style.setProperty("direction", "auto", "important");
}

function isLikelyGoogleAiSurface(hostname: string): boolean {
  return isGoogleAiHost(hostname);
}

/** Gemini / Bard often nest the field in open shadow trees whose hosts force LTR. */
function applyShadowHostBidiHintsFrom(leaf: HTMLElement): void {
  let n: Node | null = leaf;
  while (n) {
    const parent: Node | null = n.parentNode;
    if (parent instanceof ShadowRoot) {
      const hostEl = parent.host;
      if (hostEl instanceof HTMLElement && !shadowBidiHintsApplied.has(hostEl)) {
        shadowBidiHintsApplied.add(hostEl);
        hostEl.style.setProperty("unicode-bidi", "plaintext", "important");
        hostEl.style.setProperty("direction", "auto", "important");
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- ShadowRoot.host is Element; narrow not in all DOM typings
      n = hostEl;
      continue;
    }
    n = parent;
  }
}

/**
 * Gemini uses Quill: `<rich-textarea class="ql-container">` wraps `.ql-editor` and Angular wrappers.
 * Parent flex rows can stay LTR while we force `text-align: start` + bidi on the editor and each `<p>`.
 */
function applyComposerBidiHintsForSurface(el: HTMLElement): void {
  const host = currentHostname();
  if (isGeminiQuillComposer(host, el)) {
    applyGeminiQuillBidiOverrides(el);
    if (isLikelyGoogleAiSurface(host)) applyShadowHostBidiHintsFrom(el);
    return;
  }
  applyComposerBidiHint(el);
  if (isLikelyGoogleAiSurface(host)) applyShadowHostBidiHintsFrom(el);
}

function firstEditableAncestor(start: EventTarget | null): Element | null {
  let n: Node | null = start as Node | null;
  while (n) {
    if (n.nodeType === Node.ELEMENT_NODE) {
      const el = n as Element;
      if (isEditableElement(el)) return el;
    }
    const parent = n.parentNode;
    if (parent instanceof ShadowRoot) {
      n = parent.host;
      continue;
    }
    n = parent;
  }
  return null;
}

function walkTextNodesDeep(start: Element, handle: (t: Text) => void): void {
  const go = (n: Node) => {
    if (n.nodeType === Node.TEXT_NODE) {
      const t = n as Text;
      if (!t.nodeValue?.trim()) return;
      if (isInSkippedContainer(t)) return;
      handle(t);
      return;
    }
    if (n.nodeType !== Node.ELEMENT_NODE) return;
    const el = n as Element;
    if (el.matches(SKIP_FIX_SELECTOR)) return;
    for (const c of Array.from(el.childNodes)) go(c);
    if (el.shadowRoot) {
      for (const c of Array.from(el.shadowRoot.childNodes)) go(c);
    }
  };
  go(start);
}

function fixTextarea(el: HTMLTextAreaElement): void {
  const full = el.value ?? "";
  const logical = stripBidiMarkers(full);
  if (!logical.trim()) return;
  if (!shouldFixText(logical)) return;

  const fixed = fixMixedTextSafe(logical);
  if (fixed === full) return;

  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? start;
  const nextStart = mapOriginalOffsetToFixed(full, fixed, start);
  const nextEnd = mapOriginalOffsetToFixed(full, fixed, end);

  el.value = fixed;
  try {
    el.setSelectionRange(nextStart, nextEnd);
  } catch {
    // Ignore selection errors for edge-case elements.
  }
}

function getCaretBlock(root: HTMLElement): HTMLElement | null {
  const sel = root.ownerDocument.getSelection?.();
  if (!sel || sel.rangeCount === 0) return null;
  const anchor = sel.anchorNode;
  if (!anchor || !root.contains(anchor)) return null;
  const el = closestElement(anchor);
  if (!el) return null;
  const block = el.closest("p, li, [data-block], div[role='paragraph']");
  if (block instanceof HTMLElement && root.contains(block)) return block;
  return root;
}

function listComposerBlocks(root: HTMLElement): HTMLElement[] {
  const blocks: HTMLElement[] = [];
  for (const p of root.querySelectorAll("p")) {
    if (p instanceof HTMLElement) blocks.push(p);
  }
  if (blocks.length > 0) return blocks;
  for (const child of root.children) {
    if (child instanceof HTMLElement && child.tagName === "DIV") blocks.push(child);
  }
  if (blocks.length === 0) blocks.push(root);
  return blocks;
}

function fixContentEditableRoot(root: HTMLElement, mode: "typing" | "full" = "typing"): boolean {
  if (!root.isContentEditable) return false;
  if (isInSkippedContainer(root)) return false;

  const host = currentHostname();
  if (isGeminiQuillComposer(host, root)) {
    applyGeminiQuillBidiOverrides(root);
    if (mode === "typing") return false;
    const editor = resolveGeminiQuillEditor(root);
    if (editor) maintainGeminiComposer(editor);
    return true;
  }

  const blocks =
    mode === "typing"
      ? (() => {
          const caret = getCaretBlock(root);
          return caret ? [caret] : [];
        })()
      : listComposerBlocks(root);

  let changed = false;
  for (const block of blocks) {
    if (tryFixMixedBlockCoalesced(block)) changed = true;
  }

  return changed;
}

export function fixInputElement(el: Element, mode: "typing" | "full" = "typing"): void {
  if (!enabled) return;
  if (!isEditableElement(el)) return;
  if (isInSkippedContainer(el)) return;

  if (el instanceof HTMLTextAreaElement) {
    fixTextarea(el);
    return;
  }

  if (!(el instanceof HTMLElement)) return;
  fixContentEditableRoot(el, mode);
}

export function fixTextNode(textNode: Text): void {
  if (!enabled) return;
  if (isInSkippedContainer(textNode)) return;
  if (isInsideEditable(textNode)) return;

  const original = textNode.nodeValue ?? "";
  const last = lastProcessedText.get(textNode);
  if (last !== undefined && last === original) return;
  const logical = stripBidiMarkers(original);
  if (!logical.trim()) return;
  if (!shouldFixText(logical)) return;

  const fixed = fixMixedTextSafe(logical);
  if (fixed !== original) textNode.nodeValue = fixed;
  lastProcessedText.set(textNode, textNode.nodeValue ?? "");
}

function walkAndFix(root: Node): void {
  if (root.nodeType === Node.ELEMENT_NODE) walkTextNodesDeep(root as Element, fixTextNode);
}

function scanSubtreeFromElement(el: Element): void {
  if (!enabled) return;
  if (isInSkippedContainer(el)) return;
  if (isEditableElement(el) || isInsideEditable(el)) return;
  walkAndFix(el);
  scanMessageSurfacesFromElement(el, currentHostname());
  for (const node of querySelectorAllDeepFrom(el, EDITABLE_SELECTOR)) ensureEditableWired(node);
  hookShadowRootsInTree(el, (sr) => ensureObserverForShadowRoot(sr));
  for (const iframe of el.querySelectorAll("iframe")) tryInitIframe(iframe as HTMLIFrameElement);
}

export function scanDocument(doc: Document): void {
  if (!enabled) return;
  if (!doc.body) return;
  walkAndFix(doc.body);
  scanMessageSurfaces(doc, currentHostname());

  for (const el of querySelectorAllDeepFrom(doc, EDITABLE_SELECTOR)) ensureEditableWired(el);

  hookShadowRootsInTree(doc.body, (sr) => ensureObserverForShadowRoot(sr));

  const iframes = Array.from(doc.querySelectorAll("iframe"));
  for (const iframe of iframes) tryInitIframe(iframe);
}

type ContentMessage =
  | { type: "SET_ENABLED"; enabled: boolean }
  | { type: "GET_ENABLED" }
  | { type: "ENABLED_CHANGED"; enabled: boolean };

let enabled = false;
let focusInWireHandler: ((ev: Event) => void) | undefined;
const iframeFocusDocWired = new WeakSet<Document>();
const observers = new Map<Document | ShadowRoot, MutationObserver>();
let queued = new Set<Node>();
let scheduled = false;
let scheduleTimer: number | undefined;
let idleId: number | undefined;

const wiredEditables = new WeakSet<Element>();
const composing = new WeakMap<Element, boolean>();
const programmaticEdit = new WeakSet<Element>();
/** Normalized logical text (bidi markers stripped) to avoid re-entrant fixes and innerText vs marker drift. */
const lastAppliedComparableText = new WeakMap<Element, string>();
const scheduledInputFix = new WeakMap<Element, number>();
const skipComposerFixUntil = new WeakMap<Element, number>();
const composerScheduleByEditable = new WeakMap<Element, () => void>();
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
      scanSubtreeFromElement(node as Element);
    }
  }

  if (queued.size > 0) scheduleFlush();
}

function wireGeminiComposerEditable(el: Element): void {
  if (!(el instanceof HTMLElement)) return;
  applyComposerBidiHintsForSurface(el);

  const editor = resolveGeminiQuillEditor(el);
  const scheduleMaintain = () => {
    if (!enabled) return;
    if (programmaticEdit.has(el)) return;
    if (composing.get(el)) return;
    if (Date.now() < (skipComposerFixUntil.get(el) ?? 0)) return;

    const prev = scheduledInputFix.get(el);
    if (prev !== undefined) window.clearTimeout(prev);
    const id = window.setTimeout(() => {
      scheduledInputFix.delete(el);
      const ed = resolveGeminiQuillEditor(el);
      if (ed) maintainGeminiComposer(ed);
      else if (el instanceof HTMLElement) applyGeminiQuillBidiOverrides(el);
    }, GEMINI_MAINTAIN_DEBOUNCE_MS);
    scheduledInputFix.set(el, id);
  };

  composerScheduleByEditable.set(el, scheduleMaintain);

  el.addEventListener("compositionstart", () => composing.set(el, true), { passive: true });
  el.addEventListener("compositionend", () => {
    composing.set(el, false);
    scheduleMaintain();
  });
  el.addEventListener("input", scheduleMaintain, { passive: true, capture: true });
  el.addEventListener(
    "paste",
    () => {
      window.setTimeout(() => {
        if (!enabled || programmaticEdit.has(el)) return;
        const ed = resolveGeminiQuillEditor(el);
        if (ed) maintainGeminiComposer(ed);
      }, 0);
    },
    { passive: true },
  );
  el.addEventListener(
    "keydown",
    (ev) => {
      if (ev.key !== "Enter") return;
      const grace = ev.shiftKey ? COMPOSER_AFTER_ENTER_GRACE_MS : 300;
      skipComposerFixUntil.set(el, Date.now() + grace);
    },
    { capture: true },
  );
  el.addEventListener(
    "blur",
    () => {
      const prev = scheduledInputFix.get(el);
      if (prev !== undefined) window.clearTimeout(prev);
      scheduledInputFix.delete(el);
      if (!enabled || programmaticEdit.has(el)) return;
      const ed = resolveGeminiQuillEditor(el);
      if (ed) maintainGeminiComposer(ed);
    },
    { passive: true },
  );

  if (editor) maintainGeminiComposer(editor);
  else applyGeminiQuillBidiOverrides(el);
}

function ensureEditableWired(el: Element): void {
  if (!enabled) return;
  if (!isEditableElement(el)) return;
  if (wiredEditables.has(el)) return;
  wiredEditables.add(el);

  if (isGeminiQuillComposer(currentHostname(), el)) {
    wireGeminiComposerEditable(el);
    return;
  }

  if (el instanceof HTMLElement) applyComposerBidiHintsForSurface(el);

  const runFix = (mode: "typing" | "full") => {
    if (!enabled) return;
    if (programmaticEdit.has(el)) return;
    if (composing.get(el)) return;
    if (Date.now() < (skipComposerFixUntil.get(el) ?? 0)) return;

    const currentComparable = comparableLogicalText(el);
    const last = lastAppliedComparableText.get(el);
    if (mode === "typing" && last !== undefined && last === currentComparable) return;

    programmaticEdit.add(el);
    try {
      fixInputElement(el, mode);
    } finally {
      programmaticEdit.delete(el);
      lastAppliedComparableText.set(el, comparableLogicalText(el));
    }
  };

  const schedule = () => {
    if (!enabled) return;
    if (programmaticEdit.has(el)) return;
    if (composing.get(el)) return;
    if (Date.now() < (skipComposerFixUntil.get(el) ?? 0)) return;

    const prev = scheduledInputFix.get(el);
    if (prev !== undefined) window.clearTimeout(prev);
    const id = window.setTimeout(() => {
      scheduledInputFix.delete(el);
      runFix("typing");
    }, COMPOSER_INPUT_DEBOUNCE_MS);
    scheduledInputFix.set(el, id);
  };

  composerScheduleByEditable.set(el, schedule);

  el.addEventListener("compositionstart", () => composing.set(el, true), { passive: true });
  el.addEventListener("compositionend", () => {
    composing.set(el, false);
    schedule();
  });
  el.addEventListener("input", schedule, { passive: true, capture: true });
  el.addEventListener(
    "paste",
    () => {
      window.setTimeout(schedule, 0);
    },
    { passive: true },
  );
  el.addEventListener(
    "keydown",
    (ev) => {
      if (ev.key !== "Enter") return;
      const grace = ev.shiftKey ? COMPOSER_AFTER_ENTER_GRACE_MS : 300;
      skipComposerFixUntil.set(el, Date.now() + grace);
    },
    { capture: true },
  );
  el.addEventListener(
    "blur",
    () => {
      const prev = scheduledInputFix.get(el);
      if (prev !== undefined) window.clearTimeout(prev);
      scheduledInputFix.delete(el);
      runFix("full");
    },
    { passive: true },
  );

  window.setTimeout(() => runFix("typing"), 0);
}

function tryInitIframe(iframe: HTMLIFrameElement): void {
  if (!enabled) return;
  try {
    const doc = iframe.contentDocument;
    if (!doc) return;
    ensureObserverForDocument(doc);
    scanDocument(doc);
    if (!iframeFocusDocWired.has(doc)) {
      iframeFocusDocWired.add(doc);
      doc.addEventListener("focusin", onFocusInWireComposer, true);
    }
  } catch {
    // Cross-origin iframe; ignore.
  }
}

function wireComposerFromNode(node: Node): void {
  const editable = firstEditableAncestor(node);
  if (!editable || !isEditableElement(editable)) return;
  ensureEditableWired(editable);
  composerScheduleByEditable.get(editable)?.();
}

function ensureEditablesWiredInTree(root: Element): void {
  for (const node of querySelectorAllDeepFrom(root, EDITABLE_SELECTOR)) {
    ensureEditableWired(node);
  }
}

function onDomMutation(mutations: MutationRecord[]): void {
  for (const m of mutations) {
    if (m.type === "characterData" && m.target.nodeType === Node.TEXT_NODE) {
      if (isInsideEditable(m.target)) {
        wireComposerFromNode(m.target);
        continue;
      }
      enqueueNode(m.target);
      continue;
    }

    if (m.type === "childList") {
      const addedNodes = Array.from(m.addedNodes as unknown as NodeListOf<Node>);
      for (const added of addedNodes) {
        if (isInsideEditable(added)) {
          wireComposerFromNode(added);
          continue;
        }
        if (added.nodeType === Node.ELEMENT_NODE) {
          ensureEditablesWiredInTree(added as Element);
        }
        if (added.nodeType === Node.TEXT_NODE || added.nodeType === Node.ELEMENT_NODE) {
          enqueueNode(added);
        }
        if (added.nodeType === Node.ELEMENT_NODE) {
          hookShadowRootsInTree(added as Element, (sr) => ensureObserverForShadowRoot(sr));
        }
      }
    }
  }
}

function ensureObserverForShadowRoot(sr: ShadowRoot): void {
  if (!enabled) return;
  if (observers.has(sr)) return;

  const obs = new MutationObserver(onDomMutation);
  obs.observe(sr, { subtree: true, childList: true, characterData: true });
  observers.set(sr, obs);

  for (const c of Array.from(sr.children)) {
    if (c instanceof Element) {
      ensureEditablesWiredInTree(c);
      scanSubtreeFromElement(c);
    }
  }
}

function ensureObserverForDocument(doc: Document): void {
  if (!enabled) return;
  if (observers.has(doc)) return;
  if (!doc.body) return;

  const obs = new MutationObserver(onDomMutation);
  obs.observe(doc.body, { subtree: true, childList: true, characterData: true });
  observers.set(doc, obs);

  hookShadowRootsInTree(doc.body, (sr) => ensureObserverForShadowRoot(sr));
}

function onFocusInWireComposer(ev: Event): void {
  if (!enabled) return;
  const found = firstEditableAncestor(ev.target);
  if (found) ensureEditableWired(found);
}

function startObservers(): void {
  // Initialize the top-level document and best-effort same-origin iframes.
  ensureObserverForDocument(document);
  scanDocument(document);

  focusInWireHandler = onFocusInWireComposer;
  document.addEventListener("focusin", focusInWireHandler, true);

  const iframes = Array.from(document.querySelectorAll("iframe"));
  for (const iframe of iframes) tryInitIframe(iframe);
}

function stopObservers(): void {
  if (focusInWireHandler !== undefined) {
    document.removeEventListener("focusin", focusInWireHandler, true);
    focusInWireHandler = undefined;
  }
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
