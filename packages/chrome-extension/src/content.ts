import { fixMixedText } from "@rtl-text-fixer/core";

import { hookShadowRootsInTree, querySelectorAllDeepFrom } from "./domDeep.js";
import { getExtensionRuntimeState, SYNC_SETTING_KEYS } from "./storage.js";
import { computeEffectiveEnabled } from "./siteScope.js";

/** Workspace core types load from `packages/core/dist` after build; keep a narrow boundary for ESLint. */
function fixMixedTextSafe(text: string): string {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call -- core return is string
  return fixMixedText(text);
}

const EDITABLE_SELECTOR =
  'textarea,[contenteditable]:not([contenteditable="false"]),[role="textbox"][contenteditable]:not([contenteditable="false"])';
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
  return s.replace(/\u200E|\u200F/g, "");
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

function comparableLogicalText(el: Element): string {
  if (el instanceof HTMLTextAreaElement) return stripBidiMarkers(el.value ?? "");
  if (el instanceof HTMLElement) return stripBidiMarkers(el.textContent ?? "");
  return "";
}

/**
 * Many AI chat UIs set `direction: ltr` on the editor; LRM/RLM then do almost nothing visually.
 * `!important` beats strong site CSS; see `applyShadowHostBidiHintsFrom` for Google’s shadow-wrapped composers.
 */
function applyComposerBidiHint(host: HTMLElement): void {
  const ok =
    host instanceof HTMLTextAreaElement || (host instanceof HTMLElement && host.isContentEditable);
  if (!ok) return;
  host.setAttribute("dir", "auto");
  host.style.setProperty("unicode-bidi", "plaintext", "important");
  host.style.setProperty("direction", "auto", "important");
}

function isLikelyGoogleAiSurface(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "gemini.google.com" ||
    h.endsWith(".gemini.google.com") ||
    h.includes("bard.google") ||
    h === "ogs.google.com" ||
    h.endsWith(".ogs.google.com") ||
    h === "notebooklm.google.com" ||
    h === "aistudio.google.com" ||
    h === "labs.google.com"
  );
}

/** Gemini / Bard often nest the field in open shadow trees whose hosts force LTR. */
function applyShadowHostBidiHintsFrom(leaf: HTMLElement): void {
  let n: Node | null = leaf;
  while (n) {
    const parent: Node | null = n.parentNode;
    if (parent instanceof ShadowRoot) {
      const hostEl = parent.host;
      if (hostEl instanceof HTMLElement) {
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
function applyQuillGeminiBidiStack(field: HTMLElement): void {
  const qc = field.closest(".ql-container");
  if (qc instanceof HTMLElement) {
    qc.setAttribute("dir", "auto");
    qc.style.setProperty("unicode-bidi", "plaintext", "important");
    qc.style.setProperty("direction", "auto", "important");
  }
  const rt = field.closest("rich-textarea");
  if (rt instanceof HTMLElement && rt !== qc) {
    rt.setAttribute("dir", "auto");
    rt.style.setProperty("unicode-bidi", "plaintext", "important");
    rt.style.setProperty("direction", "auto", "important");
  }

  const editor = field.closest(".ql-editor");
  if (editor instanceof HTMLElement) {
    editor.setAttribute("dir", "auto");
    editor.style.setProperty("unicode-bidi", "plaintext", "important");
    editor.style.setProperty("direction", "auto", "important");
    editor.style.setProperty("text-align", "start", "important");
    for (const p of editor.querySelectorAll("p")) {
      if (p instanceof HTMLElement) {
        p.setAttribute("dir", "auto");
        p.style.setProperty("unicode-bidi", "plaintext", "important");
        p.style.setProperty("direction", "auto", "important");
        p.style.setProperty("text-align", "start", "important");
      }
    }
  }

  const block = field.closest(".text-input-field");
  if (block instanceof HTMLElement) {
    for (const sel of [
      ".text-input-field_textarea-wrapper",
      ".text-input-field-main-area",
      ".text-input-field_textarea-inner",
    ]) {
      const n = block.querySelector(sel);
      if (n instanceof HTMLElement) {
        n.style.setProperty("unicode-bidi", "plaintext", "important");
        n.style.setProperty("direction", "auto", "important");
      }
    }
    block.style.setProperty("unicode-bidi", "plaintext", "important");
    block.style.setProperty("direction", "auto", "important");
  }

  queueMicrotask(() => {
    if (qc instanceof HTMLElement) {
      qc.style.setProperty("direction", "auto", "important");
      qc.style.setProperty("unicode-bidi", "plaintext", "important");
    }
    if (editor instanceof HTMLElement) {
      editor.style.setProperty("direction", "auto", "important");
      editor.style.setProperty("text-align", "start", "important");
    }
  });
}

function applyComposerBidiHintsForSurface(el: HTMLElement): void {
  applyComposerBidiHint(el);
  if (el.closest(".ql-container")) applyQuillGeminiBidiStack(el);
  if (isLikelyGoogleAiSurface(window.location.hostname)) applyShadowHostBidiHintsFrom(el);
}

/**
 * ProseMirror/React editors revert raw DOM writes; `execCommand("insertText")` goes through the browser
 * input path and is usually accepted as a user edit (see e.g. ChatGPT/Claude-style composers).
 */
function findContentEditableHost(from: HTMLElement): HTMLElement | null {
  let el: HTMLElement | null = from;
  while (el) {
    if (el.isContentEditable) return el;
    const parent = el.parentNode;
    if (parent instanceof ShadowRoot) {
      el = parent.host as HTMLElement;
      continue;
    }
    el = el.parentElement;
  }
  return null;
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

function replaceEditableRangeWithInsertText(
  host: HTMLElement,
  target: HTMLElement,
  fixed: string,
): void {
  const doc = host.ownerDocument;
  const win = doc.defaultView;
  if (!win) {
    target.textContent = fixed;
    return;
  }
  host.focus();
  const sel = win.getSelection();
  if (!sel) {
    target.textContent = fixed;
    return;
  }
  const range = doc.createRange();
  range.selectNodeContents(target);
  sel.removeAllRanges();
  sel.addRange(range);
  if (!doc.execCommand("insertText", false, fixed)) {
    target.textContent = fixed;
  }
}

/**
 * ProseMirror-style editors split RTL/LTR across sibling spans; per–text-node fixes never see both scripts.
 * Fix the whole block when safe; prefer insertText so the editor keeps a consistent document.
 */
function tryFixBlockPlainText(block: HTMLElement): boolean {
  if (isInSkippedContainer(block)) return false;
  if (block.querySelector("pre, code, kbd, samp, a[href]")) return false;
  const raw = stripBidiMarkers(block.textContent ?? "");
  if (!raw.trim()) return false;
  if (!shouldFixText(raw)) return false;
  const fixed = fixMixedTextSafe(raw);
  if (fixed === raw) return false;
  const beforeTc = block.textContent ?? "";
  const host = findContentEditableHost(block);
  if (host) replaceEditableRangeWithInsertText(host, block, fixed);
  else block.textContent = fixed;
  if ((block.textContent ?? "") === beforeTc) return false;
  return true;
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

function fixContentEditableRoot(root: HTMLElement): boolean {
  if (!root.isContentEditable) return false;
  if (isInSkippedContainer(root)) return false;

  root.normalize();

  let blockChanged = false;
  for (const p of root.querySelectorAll("p")) {
    if (p instanceof HTMLElement && tryFixBlockPlainText(p)) blockChanged = true;
  }
  if (root.querySelectorAll("p").length === 0) {
    for (const child of root.children) {
      if (child instanceof HTMLElement && child.tagName === "DIV" && tryFixBlockPlainText(child)) {
        blockChanged = true;
      }
    }
    if (root.childElementCount === 0 && tryFixBlockPlainText(root)) blockChanged = true;
  }

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
    const logical = stripBidiMarkers(original);

    if (!shouldFixText(logical)) {
      prefixLen += originalLen;
      continue;
    }

    const fixed = fixMixedTextSafe(logical);
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

  if (!changed && !blockChanged) return false;

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
  walkAndFix(el);
  for (const node of querySelectorAllDeepFrom(el, EDITABLE_SELECTOR)) ensureEditableWired(node);
  hookShadowRootsInTree(el, (sr) => ensureObserverForShadowRoot(sr));
  for (const iframe of el.querySelectorAll("iframe")) tryInitIframe(iframe as HTMLIFrameElement);
}

export function scanDocument(doc: Document): void {
  if (!enabled) return;
  if (!doc.body) return;
  walkAndFix(doc.body);

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

function ensureEditableWired(el: Element): void {
  if (!enabled) return;
  if (!isEditableElement(el)) return;
  if (wiredEditables.has(el)) return;
  wiredEditables.add(el);

  if (el instanceof HTMLElement) applyComposerBidiHintsForSurface(el);

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

      if (el instanceof HTMLElement) applyComposerBidiHintsForSurface(el);

      const currentComparable = comparableLogicalText(el);
      const last = lastAppliedComparableText.get(el);
      if (last !== undefined && last === currentComparable) return;

      // Prevent our own write-back from re-triggering.
      programmaticEdit.add(el);
      try {
        fixInputElement(el);
      } finally {
        programmaticEdit.delete(el);
        lastAppliedComparableText.set(el, comparableLogicalText(el));
      }
    }, 55);
    scheduledInputFix.set(el, id);
  };

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
    if (!iframeFocusDocWired.has(doc)) {
      iframeFocusDocWired.add(doc);
      doc.addEventListener("focusin", onFocusInWireComposer, true);
    }
  } catch {
    // Cross-origin iframe; ignore.
  }
}

function onDomMutation(mutations: MutationRecord[]): void {
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
    if (c instanceof Element) scanSubtreeFromElement(c);
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
