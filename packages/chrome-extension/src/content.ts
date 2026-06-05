import { fixMixedText, stripBidiMarkers as stripBidiMarkersCore } from "@bidi-forge/core";

import { tryFixMixedBlockCoalesced } from "./blockFix.js";
import {
  applyBlockBidiStyles,
  applyBidiStylesToSubtree,
} from "./bidiDomStyles.js";
import { hookShadowRootsInTree, querySelectorAllDeepFrom } from "./domDeep.js";
import {
  applyCssOnlyBidiOverrides,
  hintClaudeComposerOnce,
  isClaudeLikeHost,
  isCssOnlyComposer,
  isGoogleAiHost,
  isInsideCssOnlyComposer,
  isInClaudeLiveComposer,
  maintainCssOnlyComposer,
  maintainClaudeComposerEditor,
  resolveCssOnlyEditor,
} from "./cssOnlyComposer.js";
import { shouldPauseComposerDomFix } from "./selectionGuard.js";
import { listComposerBlocks } from "./bidiDomStyles.js";
import {
  scanMessageRoot,
  scanMessageSurfaces,
  scanMessageSurfacesFromElement,
} from "./messageSurfaces.js";
import { getExtensionRuntimeState, SYNC_SETTING_KEYS } from "./storage.js";
import { computeEffectiveEnabled } from "./siteScope.js";

function fixMixedTextSafe(text: string): string {
  return fixMixedText(text);
}

const EDITABLE_SELECTOR =
  'textarea,[contenteditable]:not([contenteditable="false"]),[role="textbox"][contenteditable]:not([contenteditable="false"])';
const SKIP_FIX_SELECTOR = "pre,code,script,style";
const COMPOSER_INPUT_DEBOUNCE_MS = 450;
const CSS_ONLY_MAINTAIN_DEBOUNCE_MS = 400;
const COMPOSER_AFTER_ENTER_GRACE_MS = 750;
/** After Backspace/Delete, defer marker fix so caret is not rewritten mid-delete. */
const COMPOSER_AFTER_DELETE_GRACE_MS = 650;
const MUTATION_BATCH_MS = 32;
const WIRE_EDITABLES_DEBOUNCE_MS = 500;
const MESSAGE_ROOT_SCAN_MS = 450;
const INITIAL_SCAN_IDLE_MS = 1500;

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

const MESSAGE_SURFACE_SELECTOR =
  '.ProseMirror:not([contenteditable="true"]):not(#prompt-textarea), [data-message-author-role], .markdown, .message-content, .standard-markdown';

function isInsideMessageSurface(node: Node): boolean {
  const el = closestElement(node);
  return Boolean(el?.closest(MESSAGE_SURFACE_SELECTOR));
}

function findMessageRootForNode(node: Node): HTMLElement | null {
  const el = closestElement(node);
  if (!el) return null;
  const host = currentHostname();
  if (isInsideCssOnlyComposer(el, host)) return null;
  const root = el.closest(MESSAGE_SURFACE_SELECTOR);
  if (!(root instanceof HTMLElement)) return null;
  if (isInsideCssOnlyComposer(root, host)) return null;
  if (root.isContentEditable) return null;
  return root;
}

function isDeleteInputEvent(ev: Event): boolean {
  const inputType = (ev as InputEvent).inputType;
  return typeof inputType === "string" && inputType.startsWith("delete");
}

function armComposerDeleteGrace(el: Element): void {
  skipComposerFixUntil.set(el, Date.now() + COMPOSER_AFTER_DELETE_GRACE_MS);
  const prev = scheduledInputFix.get(el);
  if (prev !== undefined) window.clearTimeout(prev);
  const reschedule = composerScheduleByEditable.get(el);
  if (!reschedule) return;
  const id = window.setTimeout(() => {
    scheduledInputFix.delete(el);
    reschedule();
  }, COMPOSER_AFTER_DELETE_GRACE_MS);
  scheduledInputFix.set(el, id);
}

function wireComposerDeleteGrace(el: Element): void {
  el.addEventListener(
    "beforeinput",
    (ev) => {
      if (!isDeleteInputEvent(ev)) return;
      armComposerDeleteGrace(el);
    },
    { capture: true },
  );
  el.addEventListener(
    "keydown",
    (ev) => {
      if (ev.key !== "Backspace" && ev.key !== "Delete") return;
      armComposerDeleteGrace(el);
    },
    { capture: true },
  );
}

function maintainCssOnlyComposerSafe(
  editor: HTMLElement,
  guardEl: Element,
  scope: "caret" | "all" = "caret",
): void {
  if (cssOnlyMaintaining.has(editor)) return;
  cssOnlyMaintaining.add(editor);
  programmaticEdit.add(guardEl);
  runWithoutMutationFeedback(() => {
    maintainCssOnlyComposer(editor, scope);
  });
  programmaticEdit.delete(guardEl);
  cssOnlyMaintaining.delete(editor);
}

function isMainContentFrame(): boolean {
  try {
    return window.self === window.top;
  } catch {
    return true;
  }
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
  applyBlockBidiStyles(host);
  if (host.isContentEditable) applyBidiStylesToSubtree(host);
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
  if (isInClaudeLiveComposer(el, host)) {
    const ed = resolveCssOnlyEditor(host, el);
    if (ed) hintClaudeComposerOnce(ed);
    return;
  }
  if (isCssOnlyComposer(host, el)) {
    applyCssOnlyBidiOverrides(host, el);
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

function fixTextarea(el: HTMLTextAreaElement): void {
  const full = el.value ?? "";
  const logical = stripBidiMarkers(full);
  if (!logical.trim()) return;
  if (!shouldFixText(logical)) return;

  const fixed = fixMixedTextSafe(logical);
  if (fixed === logical) return;

  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? start;
  const logicalStart = stripBidiMarkers(full.slice(0, start)).length;
  const logicalEnd = stripBidiMarkers(full.slice(0, end)).length;
  const nextStart = mapOriginalOffsetToFixed(logical, fixed, logicalStart);
  const nextEnd = mapOriginalOffsetToFixed(logical, fixed, logicalEnd);

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
  const block = el.closest("p, li, ol, ul, [data-block], div[role='paragraph']");
  if (block instanceof HTMLElement && root.contains(block)) return block;
  return root;
}

function listComposerBlocksFromRoot(root: HTMLElement): HTMLElement[] {
  return listComposerBlocks(root);
}

function fixContentEditableRoot(root: HTMLElement, mode: "typing" | "full" = "typing"): boolean {
  if (!root.isContentEditable) return false;
  if (isInSkippedContainer(root)) return false;
  if (mode === "typing" && shouldPauseComposerDomFix()) return false;

  const host = currentHostname();
  if (isInClaudeLiveComposer(root, host)) return false;

  if (isCssOnlyComposer(host, root)) {
    if (!isClaudeLikeHost(host)) applyCssOnlyBidiOverrides(host, root);
    if (mode === "typing") return false;
    const editor = resolveCssOnlyEditor(host, root);
    if (editor) maintainCssOnlyComposerSafe(editor, root, "all");
    return true;
  }

  const blocks =
    mode === "typing"
      ? (() => {
          const caret = getCaretBlock(root);
          return caret ? [caret] : [];
        })()
      : listComposerBlocksFromRoot(root);

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
  if (isInClaudeLiveComposer(el)) return;

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
  if (isInClaudeLiveComposer(textNode)) return;
  if (isInsideEditable(textNode)) return;
  if (isInsideMessageSurface(textNode)) return;

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

function scanSubtreeFromElement(el: Element): void {
  if (!enabled) return;
  if (isInSkippedContainer(el)) return;
  if (isEditableElement(el) || isInsideEditable(el)) return;
  runWithoutMutationFeedback(() =>
    scanMessageSurfacesFromElement(el, currentHostname(), currentPathname()),
  );
  scheduleWireEditablesFrom(el);
  scheduleShadowRootsHook(el);
}

export function scanDocument(doc: Document): void {
  if (!enabled) return;
  if (!doc.body) return;
  runWithoutMutationFeedback(() => scanMessageSurfaces(doc, currentHostname(), currentPathname()));
  scheduleWireEditablesFrom(doc.body);
  scheduleShadowRootsHook(doc.body);
}

type ContentMessage =
  | { type: "SET_ENABLED"; enabled: boolean }
  | { type: "GET_ENABLED" }
  | { type: "ENABLED_CHANGED"; enabled: boolean };

let enabled = false;
let focusInWireHandler: ((ev: Event) => void) | undefined;
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
const cssOnlyMaintaining = new WeakSet<HTMLElement>();
const lastProcessedText = new WeakMap<Text, string>();
let suppressMutationHandling = 0;
let pendingMutations: MutationRecord[] = [];
let mutationBatchTimer: number | undefined;
const pendingWireRoots = new Set<Element>();
let wireEditablesTimer: number | undefined;
const pendingShadowHookRoots = new Set<Element>();
const messageRootScanTimers = new WeakMap<HTMLElement, number>();

function runWithoutMutationFeedback(fn: () => void): void {
  suppressMutationHandling++;
  try {
    fn();
  } finally {
    suppressMutationHandling--;
  }
}

function scheduleMessageRootScan(root: HTMLElement): void {
  const prev = messageRootScanTimers.get(root);
  if (prev !== undefined) window.clearTimeout(prev);
  const id = window.setTimeout(() => {
    messageRootScanTimers.delete(root);
    if (!enabled || !root.isConnected) return;
    runWithoutMutationFeedback(() => scanMessageRoot(root, currentHostname()));
  }, MESSAGE_ROOT_SCAN_MS);
  messageRootScanTimers.set(root, id);
}

function flushWireAndShadowHooks(): void {
  wireEditablesTimer = undefined;

  const wireRoots = Array.from(pendingWireRoots);
  const shadowRoots = Array.from(pendingShadowHookRoots);
  pendingWireRoots.clear();
  pendingShadowHookRoots.clear();

  const wired = new Set<Element>();
  for (const root of wireRoots) {
    if (!root.isConnected) continue;
    for (const node of querySelectorAllDeepFrom(root, EDITABLE_SELECTOR)) {
      if (wired.has(node)) continue;
      wired.add(node);
      ensureEditableWired(node);
    }
  }

  for (const root of shadowRoots) {
    if (!root.isConnected) continue;
    hookShadowRootsInTree(root, (sr) => ensureObserverForShadowRoot(sr));
  }
}

function scheduleDeferredHooks(root: Element): void {
  pendingWireRoots.add(root);
  pendingShadowHookRoots.add(root);
  if (wireEditablesTimer !== undefined) window.clearTimeout(wireEditablesTimer);
  wireEditablesTimer = window.setTimeout(flushWireAndShadowHooks, WIRE_EDITABLES_DEBOUNCE_MS);
}

function scheduleWireEditablesFrom(root: Element): void {
  scheduleDeferredHooks(root);
}

function scheduleShadowRootsHook(root: Element): void {
  scheduleDeferredHooks(root);
}

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

function wireCssOnlyComposerEditable(el: Element): void {
  if (!(el instanceof HTMLElement)) return;
  const host = currentHostname();
  const isClaude = isClaudeLikeHost(host);

  if (!isClaude) {
    applyComposerBidiHintsForSurface(el);
  }

  const editor = resolveCssOnlyEditor(host, el);

  const scheduleMaintain = () => {
    if (!enabled) return;
    if (shouldPauseComposerDomFix()) return;
    if (programmaticEdit.has(el)) return;
    if (composing.get(el)) return;
    if (Date.now() < (skipComposerFixUntil.get(el) ?? 0)) return;

    const prev = scheduledInputFix.get(el);
    if (prev !== undefined) window.clearTimeout(prev);
    const id = window.setTimeout(() => {
      scheduledInputFix.delete(el);
      const ed = resolveCssOnlyEditor(host, el);
      if (ed) maintainCssOnlyComposerSafe(ed, el);
      else applyCssOnlyBidiOverrides(host, el);
    }, CSS_ONLY_MAINTAIN_DEBOUNCE_MS);
    scheduledInputFix.set(el, id);
  };

  if (!isClaude) {
    composerScheduleByEditable.set(el, scheduleMaintain);
  }

  wireComposerDeleteGrace(el);

  el.addEventListener("compositionstart", () => composing.set(el, true), { passive: true });
  el.addEventListener(
    "compositionend",
    () => {
      composing.set(el, false);
      if (!isClaude) scheduleMaintain();
    },
    { passive: true },
  );

  if (!isClaude) {
    el.addEventListener("input", scheduleMaintain, { passive: true, capture: true });
  }

  if (!isClaude) {
    el.addEventListener(
      "paste",
      () => {
        window.setTimeout(() => {
          if (!enabled || programmaticEdit.has(el)) return;
          const ed = resolveCssOnlyEditor(host, el);
          if (ed) maintainCssOnlyComposerSafe(ed, el);
        }, 0);
      },
      { passive: true },
    );
  }

  el.addEventListener(
    "keydown",
    (ev) => {
      if (ev.key === "Enter" && isClaude && !ev.shiftKey) {
        window.setTimeout(() => {
          if (!enabled || programmaticEdit.has(el)) return;
          const ed = resolveCssOnlyEditor(host, el);
          if (ed) hintClaudeComposerOnce(ed);
        }, 0);
      }
      if (ev.key !== "Enter") return;
      const grace = ev.shiftKey ? COMPOSER_AFTER_ENTER_GRACE_MS : 300;
      skipComposerFixUntil.set(el, Date.now() + grace);
    },
    { capture: true },
  );

  el.addEventListener(
    "focus",
    () => {
      if (!enabled || programmaticEdit.has(el)) return;
      const ed = resolveCssOnlyEditor(host, el);
      if (ed && isClaude) hintClaudeComposerOnce(ed);
    },
    { passive: true },
  );

  el.addEventListener(
    "blur",
    () => {
      const prev = scheduledInputFix.get(el);
      if (prev !== undefined) window.clearTimeout(prev);
      scheduledInputFix.delete(el);
      if (!isClaude || !enabled || programmaticEdit.has(el)) return;
      const ed = resolveCssOnlyEditor(host, el);
      if (!ed) return;
      programmaticEdit.add(el);
      runWithoutMutationFeedback(() => maintainClaudeComposerEditor(ed));
      programmaticEdit.delete(el);
    },
    { passive: true },
  );

  if (editor && isClaude) hintClaudeComposerOnce(editor);
  else if (!isClaude) applyCssOnlyBidiOverrides(host, el);
}

function ensureEditableWired(el: Element): void {
  if (!enabled) return;
  if (!isEditableElement(el)) return;
  if (wiredEditables.has(el)) return;
  wiredEditables.add(el);

  const host = currentHostname();
  const claudeEditor =
    isClaudeLikeHost(host) && el instanceof HTMLElement ? resolveCssOnlyEditor(host, el) : null;

  if (isCssOnlyComposer(host, el) || claudeEditor) {
    wireCssOnlyComposerEditable(el);
    return;
  }

  if (el instanceof HTMLElement) applyComposerBidiHintsForSurface(el);

  const runFix = (mode: "typing" | "full") => {
    if (!enabled) return;
    if (mode === "typing" && shouldPauseComposerDomFix()) return;
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
    if (shouldPauseComposerDomFix()) return;
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
  wireComposerDeleteGrace(el);

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

function wireComposerFromNode(node: Node): void {
  const editable = firstEditableAncestor(node);
  if (!editable || !isEditableElement(editable)) return;
  const host = currentHostname();
  if (wiredEditables.has(editable) && isCssOnlyComposer(host, editable)) return;
  ensureEditableWired(editable);
  if (isCssOnlyComposer(host, editable)) return;
  composerScheduleByEditable.get(editable)?.();
}

function handleDomMutations(mutations: MutationRecord[]): void {
  for (const m of mutations) {
    if (m.type === "characterData" && m.target.nodeType === Node.TEXT_NODE) {
      if (isInsideEditable(m.target)) {
        if (isInsideCssOnlyComposer(m.target, currentHostname())) continue;
        wireComposerFromNode(m.target);
        continue;
      }
      const msgRoot = findMessageRootForNode(m.target);
      if (msgRoot) {
        scheduleMessageRootScan(msgRoot);
        continue;
      }
      enqueueNode(m.target);
      continue;
    }

    if (m.type === "childList") {
      const addedNodes = Array.from(m.addedNodes as unknown as NodeListOf<Node>);
      for (const added of addedNodes) {
        if (isInsideEditable(added)) {
          if (isInsideCssOnlyComposer(added, currentHostname())) continue;
          wireComposerFromNode(added);
          continue;
        }
        if (added.nodeType === Node.ELEMENT_NODE) {
          const el = added as Element;
          scheduleWireEditablesFrom(el);
          scheduleShadowRootsHook(el);
          if (el.matches(MESSAGE_SURFACE_SELECTOR) && el instanceof HTMLElement) {
            if (!isInsideCssOnlyComposer(el, currentHostname()) && !el.isContentEditable) {
              scheduleMessageRootScan(el);
            }
          } else {
            const msgRoot = findMessageRootForNode(el);
            if (msgRoot) scheduleMessageRootScan(msgRoot);
            else enqueueNode(el);
          }
          continue;
        }
        if (added.nodeType === Node.TEXT_NODE) {
          const msgRoot = findMessageRootForNode(added);
          if (msgRoot) scheduleMessageRootScan(msgRoot);
          else enqueueNode(added);
        }
      }
    }
  }
}

function onDomMutation(mutations: MutationRecord[]): void {
  if (suppressMutationHandling > 0) return;
  pendingMutations.push(...mutations);
  if (mutationBatchTimer !== undefined) return;
  mutationBatchTimer = window.setTimeout(() => {
    mutationBatchTimer = undefined;
    const batch = pendingMutations;
    pendingMutations = [];
    handleDomMutations(batch);
  }, MUTATION_BATCH_MS);
}

function ensureObserverForShadowRoot(sr: ShadowRoot): void {
  if (!enabled) return;
  if (observers.has(sr)) return;

  const obs = new MutationObserver(onDomMutation);
  obs.observe(sr, { subtree: true, childList: true, characterData: true });
  observers.set(sr, obs);

  for (const c of Array.from(sr.children)) {
    if (c instanceof Element) scheduleWireEditablesFrom(c);
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

function runInitialScan(): void {
  if (!enabled) return;
  runWithoutMutationFeedback(() => scanDocument(document));
}

function startObservers(): void {
  ensureObserverForDocument(document);

  const runInitial = () => {
    if (!enabled) return;
    runInitialScan();
  };
  const idle = requestIdle(runInitial, INITIAL_SCAN_IDLE_MS);
  if (idle === undefined) {
    window.setTimeout(runInitial, 300);
  }

  focusInWireHandler = onFocusInWireComposer;
  document.addEventListener("focusin", focusInWireHandler, true);
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
  if (mutationBatchTimer !== undefined) {
    window.clearTimeout(mutationBatchTimer);
    mutationBatchTimer = undefined;
  }
  pendingMutations = [];
  if (wireEditablesTimer !== undefined) {
    window.clearTimeout(wireEditablesTimer);
    wireEditablesTimer = undefined;
  }
  pendingWireRoots.clear();
  pendingShadowHookRoots.clear();
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

function currentPathname(): string {
  return window.location.pathname;
}

async function readEffectiveEnabled(): Promise<boolean> {
  const state = await getExtensionRuntimeState();
  const host = currentHostname();
  const override = state.hostOverrides[host];
  if (!state.enabled) return false;
  if (override === false) return false;
  if (override === true) return true;
  return computeEffectiveEnabled(true, host, state.site);
}

function wireRuntimeListeners(): void {
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

async function init(): Promise<void> {
  wireRuntimeListeners();

  if (!isMainContentFrame()) return;

  applyEnabled(await readEffectiveEnabled());
}

void init();
