/**
 * Rich chat composers that break when LRM/RLM are inserted (Quill, ProseMirror, etc.).
 * CSS `dir=auto` + `unicode-bidi: plaintext` only; strip stray markers, never fixMixedText while typing.
 */

import { stripBidiMarkers } from "@bidi-forge/core";

import { isAdapterLiveComposer, resolveAdapterComposerEditor } from "./adapters/composerResolve.js";
import { isCssOnlyAdapter, resolveAdapter } from "./adapters/registry.js";
import { isChatGptHost } from "./adapters/chatgpt.js";
import { isClaudeLikeHost } from "./adapters/claude.js";
import { isGeminiHost } from "./adapters/gemini.js";
import { grokAdapter } from "./adapters/grok.js";
import {
  applyBlockBidiStyles,
  applyListContainerBidiStyles,
  applyListItemBidiStyles,
  markComposerRoot,
  BIDI_COMPOSER_BLOCK_SELECTOR,
  BIDI_LIST_SELECTOR,
} from "./bidiDomStyles.js";
import { getCaretLogicalOffsetInBlock, setCaretLogicalOffsetInBlock } from "./blockFix.js";

const BIDI_MARKER_RE = /[\u200E\u200F\u2066-\u2069]/;

/** ProseMirror/tiptap often expose `contenteditable` via attribute before `isContentEditable` is true. */
function isLiveComposerElement(el: HTMLElement): boolean {
  if (el instanceof HTMLTextAreaElement) return !el.disabled;
  if (el.isContentEditable) return true;
  const ce = el.getAttribute("contenteditable");
  return ce != null && ce !== "false";
}

const GROK_COMPOSER_SHELL_SELECTOR =
  '[class*="composer"], [class*="Composer"], [data-testid*="composer"], [data-testid*="Composer"], form, [role="textbox"][contenteditable]';

const GROK_MESSAGE_BUBBLE_SELECTOR =
  '[data-testid*="message"], article[role="article"], [class*="message-bubble"]';

const CHATGPT_MESSAGE_BUBBLE_SELECTOR = "[data-message-author-role]";

const CHATGPT_COMPOSER_SHELL_SELECTOR =
  '#prompt-textarea, form[data-type="unified-composer"], [data-testid="composer"], footer form, [class*="composer"]';

// ── Host / surface (re-exported from adapters) ───────────────────────────────

export { isGeminiHost, isGoogleAiHost } from "./adapters/gemini.js";
export { isChatGptHost } from "./adapters/chatgpt.js";
export { isClaudeLikeHost };
export { isGrokHost, isGrokSurface } from "./adapters/grok.js";
export {
  isCopilotHost,
  isPerplexityHost,
  isDeepSeekHost,
} from "./adapters/hosts.js";

/** Hosts where the live composer must not receive LRM/RLM (CSS hints only). */
export function isCssOnlySurface(hostname: string, pathname = ""): boolean {
  const adapter = resolveAdapter(hostname, pathname);
  return isCssOnlyAdapter(adapter);
}

// ── Gemini (Quill) ───────────────────────────────────────────────────────────

export function isGeminiQuillComposer(hostname: string, el: Element): boolean {
  if (!isGeminiHost(hostname)) return false;
  const editor = el.closest(".ql-editor");
  if (!(editor instanceof HTMLElement)) return false;
  return editor.isContentEditable;
}

export function isInsideGeminiComposer(el: Element, hostname: string): boolean {
  if (!isGeminiHost(hostname)) return false;
  const editor = el.closest(".ql-editor");
  return editor instanceof HTMLElement && editor.isContentEditable;
}

function findGeminiQuillEditor(anchor: Element): HTMLElement | null {
  const ed = anchor.closest(".ql-editor");
  if (ed instanceof HTMLElement && ed.isContentEditable) return ed;
  if (
    anchor instanceof HTMLElement &&
    anchor.classList.contains("ql-editor") &&
    anchor.isContentEditable
  ) {
    return anchor;
  }
  return null;
}

export function resolveGeminiQuillEditor(anchor: Element): HTMLElement | null {
  return findGeminiQuillEditor(anchor);
}

// ── Grok (ProseMirror / assistant-ui) ───────────────────────────────────────

function isOnGrokSurface(hostname: string): boolean {
  const pathname = typeof location !== "undefined" ? location.pathname : "";
  return grokAdapter.matchesHost(hostname, pathname);
}

function isInsideGrokMessageBubble(el: Element): boolean {
  const bubble = el.closest(GROK_MESSAGE_BUBBLE_SELECTOR);
  if (!bubble) return false;
  return !el.closest(GROK_COMPOSER_SHELL_SELECTOR);
}

function resolveGrokEditor(hostname: string, anchor: Element): HTMLElement | null {
  if (!isOnGrokSurface(hostname)) return null;

  for (const sel of [
    '.ProseMirror[contenteditable="true"]',
    '.ProseMirror[contenteditable=""]',
    '[contenteditable="true"][role="textbox"]',
  ]) {
    const found = anchor.closest(sel);
    if (
      found instanceof HTMLElement &&
      found.isContentEditable &&
      !isInsideGrokMessageBubble(found)
    ) {
      return found;
    }
  }

  const shell = anchor.closest(GROK_COMPOSER_SHELL_SELECTOR);
  if (shell) {
    const ce = shell.querySelector('[contenteditable="true"]');
    if (ce instanceof HTMLElement && ce.isContentEditable && !isInsideGrokMessageBubble(ce)) {
      return ce;
    }
    const ta = shell.querySelector("textarea:not([disabled])");
    if (ta instanceof HTMLTextAreaElement) return ta;
  }

  if (anchor instanceof HTMLTextAreaElement && !isInsideGrokMessageBubble(anchor)) {
    return anchor;
  }

  return null;
}

export function isGrokLiveComposer(hostname: string, el: Element): boolean {
  if (!isOnGrokSurface(hostname)) return false;
  const editor = resolveGrokEditor(hostname, el);
  if (!editor) return false;
  return editor === el || editor.contains(el);
}

// ── ChatGPT (ProseMirror) ───────────────────────────────────────────────────

function isInsideChatGptMessageBubble(el: Element): boolean {
  const bubble = el.closest(CHATGPT_MESSAGE_BUBBLE_SELECTOR);
  if (!bubble) return false;
  return !el.closest(CHATGPT_COMPOSER_SHELL_SELECTOR);
}

function resolveChatGptEditor(hostname: string, anchor: Element): HTMLElement | null {
  if (!isChatGptHost(hostname)) return null;

  for (const sel of [
    "#prompt-textarea",
    '.ProseMirror[contenteditable="true"]',
    '.ProseMirror[contenteditable=""]',
    '[contenteditable="true"][role="textbox"]',
  ]) {
    const found = anchor.closest(sel);
    if (
      found instanceof HTMLElement &&
      (found.isContentEditable || found instanceof HTMLTextAreaElement) &&
      !isInsideChatGptMessageBubble(found)
    ) {
      return found;
    }
  }

  const shell = anchor.closest(CHATGPT_COMPOSER_SHELL_SELECTOR);
  if (shell) {
    const byId = shell.querySelector("#prompt-textarea");
    if (
      byId instanceof HTMLElement &&
      (byId.isContentEditable || byId instanceof HTMLTextAreaElement) &&
      !isInsideChatGptMessageBubble(byId)
    ) {
      return byId;
    }
    const ce = shell.querySelector('[contenteditable="true"]');
    if (ce instanceof HTMLElement && ce.isContentEditable && !isInsideChatGptMessageBubble(ce)) {
      return ce;
    }
    const ta = shell.querySelector("textarea:not([disabled])");
    if (ta instanceof HTMLTextAreaElement && !isInsideChatGptMessageBubble(ta)) {
      return ta;
    }
  }

  if (
    anchor instanceof HTMLTextAreaElement &&
    !isInsideChatGptMessageBubble(anchor)
  ) {
    return anchor;
  }

  return null;
}

export function isChatGptLiveComposer(hostname: string, el: Element): boolean {
  if (!isChatGptHost(hostname)) return false;
  const editor = resolveChatGptEditor(hostname, el);
  if (!editor) return false;
  return editor === el || editor.contains(el);
}

// ── Claude (ProseMirror) ────────────────────────────────────────────────────

const CLAUDE_MESSAGE_BUBBLE_SELECTOR =
  '[data-testid="assistant-message"], [data-testid="user-message"]';

const CLAUDE_COMPOSER_SHELL_SELECTOR =
  'form, footer, [class*="composer"], [class*="Composer"], [data-testid*="composer"]';

function isInsideClaudeMessageBubble(el: Element): boolean {
  return Boolean(el.closest(CLAUDE_MESSAGE_BUBBLE_SELECTOR));
}

function resolveClaudeEditor(hostname: string, anchor: Element): HTMLElement | null {
  if (!isClaudeLikeHost(hostname)) return null;

  for (const sel of [
    '[data-testid="chat-input"]',
    '.tiptap[contenteditable="true"]',
    '.tiptap[contenteditable=""]',
    '.ProseMirror[contenteditable="true"]',
    '.ProseMirror[contenteditable=""]',
    '[contenteditable="true"][role="textbox"]',
  ]) {
    const found = anchor.closest(sel);
    if (
      found instanceof HTMLElement &&
      isLiveComposerElement(found) &&
      !isInsideClaudeMessageBubble(found)
    ) {
      return found;
    }
  }

  const shell = anchor.closest(CLAUDE_COMPOSER_SHELL_SELECTOR);
  if (shell) {
    const ce = shell.querySelector(
      '[data-testid="chat-input"], .tiptap[contenteditable="true"], .ProseMirror[contenteditable="true"], [contenteditable="true"][role="textbox"]',
    );
    if (ce instanceof HTMLElement && isLiveComposerElement(ce) && !isInsideClaudeMessageBubble(ce)) {
      return ce;
    }
    const ta = shell.querySelector("textarea:not([disabled])");
    if (ta instanceof HTMLTextAreaElement && !isInsideClaudeMessageBubble(ta)) {
      return ta;
    }
  }

  if (anchor instanceof HTMLTextAreaElement && !isInsideClaudeMessageBubble(anchor)) {
    return anchor;
  }

  if (
    anchor instanceof HTMLElement &&
    (anchor.classList.contains("ProseMirror") ||
      anchor.classList.contains("tiptap") ||
      anchor.getAttribute("data-testid") === "chat-input") &&
    anchor.getAttribute("contenteditable") != null &&
    anchor.getAttribute("contenteditable") !== "false" &&
    !isInsideClaudeMessageBubble(anchor)
  ) {
    return anchor;
  }

  return null;
}

const CLAUDE_LIVE_COMPOSER_SELECTOR =
  '[data-testid="chat-input"], .tiptap[contenteditable="true"], .tiptap[contenteditable=""], .ProseMirror[contenteditable="true"], .ProseMirror[contenteditable=""][role="textbox"]';

function resolveClaudeComposerFromDom(el: Element): HTMLElement | null {
  const found = el.closest(CLAUDE_LIVE_COMPOSER_SELECTOR);
  if (!(found instanceof HTMLElement) || !isLiveComposerElement(found)) return null;
  if (isInsideClaudeMessageBubble(found)) return null;
  return found;
}

/** True when node is inside Claude's live composer (not assistant/user message bubbles). */
export function isInClaudeLiveComposer(node: Node, hostname?: string): boolean {
  const el = anchorElement(node);
  if (!el) return false;

  const byDom = resolveClaudeComposerFromDom(el);
  if (byDom) {
    const host = (hostname ?? (typeof location !== "undefined" ? location.hostname : "")).toLowerCase();
    if (!host || isClaudeLikeHost(host)) return byDom === el || byDom.contains(node);
  }

  const host = (hostname ?? (typeof location !== "undefined" ? location.hostname : "")).toLowerCase();
  if (!isClaudeLikeHost(host)) return false;
  const ed = resolveClaudeEditor(host, el);
  if (!ed) return false;
  return ed === el || ed.contains(node);
}

export function isClaudeLiveComposer(hostname: string, el: Element): boolean {
  if (!isClaudeLikeHost(hostname)) return false;
  const editor = resolveClaudeEditor(hostname, el);
  if (!editor) return false;
  return editor === el || editor.contains(el);
}

// ── Unified ───────────────────────────────────────────────────────────────────

function anchorElement(node: Element | Node): Element | null {
  return node instanceof Element ? node : node.parentElement;
}

export function resolveCssOnlyEditor(hostname: string, anchor: Element | Node): HTMLElement | null {
  const el = anchorElement(anchor);
  if (!el) return null;
  const pathname = typeof location !== "undefined" ? location.pathname : "";
  if (isClaudeLikeHost(hostname)) return resolveClaudeEditor(hostname, el);
  return (
    findGeminiQuillEditor(el) ??
    resolveGrokEditor(hostname, el) ??
    resolveChatGptEditor(hostname, el) ??
    resolveAdapterComposerEditor(hostname, el, pathname)
  );
}

export function isCssOnlyComposer(hostname: string, el: Element): boolean {
  const pathname = typeof location !== "undefined" ? location.pathname : "";
  if (isClaudeLiveComposer(hostname, el)) return true;
  if (isGeminiQuillComposer(hostname, el)) return true;
  if (isGrokLiveComposer(hostname, el)) return true;
  if (isChatGptLiveComposer(hostname, el)) return true;
  return isAdapterLiveComposer(hostname, el, pathname);
}

/** Claude: CSS-only in composer — no Unicode markers (they break ProseMirror typing). */
export function applyComposerMarkersOnBlur(_hostname: string): boolean {
  return false;
}

/** Accepts text nodes from MutationObserver targets (no `.closest`). */
export function isInsideCssOnlyComposer(
  node: Element | Node,
  hostname: string,
  pathname = "",
): boolean {
  const el = anchorElement(node);
  if (!el) return false;
  if (isClaudeLikeHost(hostname)) {
    const ed = resolveClaudeEditor(hostname, el);
    if (!ed) return false;
    return ed === el || ed.contains(node);
  }
  if (!isCssOnlySurface(hostname, pathname)) return false;
  if (isInsideGeminiComposer(el, hostname)) return true;
  const ed = resolveCssOnlyEditor(hostname, el);
  if (!ed) return false;
  return ed === el || ed.contains(node);
}

// ── DOM maintenance ─────────────────────────────────────────────────────────

function getCaretBlockInEditor(editor: HTMLElement): HTMLElement | null {
  const sel = editor.ownerDocument.getSelection?.();
  if (!sel || sel.rangeCount === 0) return null;
  const anchor = sel.anchorNode;
  if (!anchor || !editor.contains(anchor)) return null;
  const el =
    anchor.nodeType === Node.ELEMENT_NODE
      ? (anchor as Element)
      : (anchor.parentElement ?? null);
  if (!el) return null;
  const block = el.closest("p, li");
  if (block instanceof HTMLElement && editor.contains(block)) return block;
  return editor;
}

const geminiDirObservers = new WeakMap<HTMLElement, MutationObserver>();
const cssOnlyEditorHinted = new WeakSet<HTMLElement>();

function syncBlockBidiStyles(block: HTMLElement): void {
  block.classList.remove("ql-direction-rtl", "ql-direction-ltr");
  if (block.tagName === "LI") applyListItemBidiStyles(block);
  else applyBlockBidiStyles(block);
  const list = block.closest(BIDI_LIST_SELECTOR);
  if (list instanceof HTMLElement) applyListContainerBidiStyles(list);
}

function ensureCssOnlyEditorStyles(editor: HTMLElement, scope: "caret" | "all", caretBlock?: HTMLElement): void {
  if (!cssOnlyEditorHinted.has(editor)) {
    cssOnlyEditorHinted.add(editor);
    applyBidiStyles(editor, editor.classList.contains("ProseMirror"));
  }

  if (editor instanceof HTMLTextAreaElement) {
    applyBidiStyles(editor, false);
    return;
  }

  const blocks: HTMLElement[] =
    scope === "all"
      ? [
          ...Array.from(editor.querySelectorAll(BIDI_COMPOSER_BLOCK_SELECTOR)),
          ...Array.from(editor.querySelectorAll(BIDI_LIST_SELECTOR)),
        ].filter((el): el is HTMLElement => el instanceof HTMLElement)
      : caretBlock
        ? [caretBlock]
        : [];

  if (blocks.length === 0 && editor.isContentEditable) blocks.push(editor);

  for (const block of blocks) {
    if (block.tagName === "OL" || block.tagName === "UL") {
      applyListContainerBidiStyles(block);
      continue;
    }
    syncBlockBidiStyles(block);
  }
}

export function applyCssOnlyBidiOverrides(hostname: string, anchor: HTMLElement): void {
  if (isClaudeLikeHost(hostname)) {
    const editor = resolveClaudeEditor(hostname, anchor);
    if (editor) hintClaudeComposerOnce(editor);
    return;
  }

  if (isGeminiHost(hostname)) {
    const targets = new Set<HTMLElement>();
    for (const sel of [".ql-editor", ".ql-container", "rich-textarea", ".text-input-field"]) {
      const found = anchor.closest(sel);
      if (found instanceof HTMLElement) targets.add(found);
    }
    for (const el of targets) {
      applyBidiStyles(el, el.classList.contains("ql-editor"));
      if (el.tagName.toLowerCase() === "rich-textarea") watchGeminiRichTextareaDir(el);
    }
  }

  const editor = resolveCssOnlyEditor(hostname, anchor);
  if (editor && !cssOnlyEditorHinted.has(editor)) {
    cssOnlyEditorHinted.add(editor);
    applyBidiStyles(editor, editor.classList.contains("ProseMirror"));
  } else if (!editor && (anchor.isContentEditable || anchor instanceof HTMLTextAreaElement)) {
    applyBidiStyles(anchor, anchor.isContentEditable);
  }
}

/** @deprecated use applyCssOnlyBidiOverrides(hostname, anchor) */
export function applyGeminiQuillBidiOverrides(anchor: HTMLElement): void {
  applyCssOnlyBidiOverrides(
    typeof location !== "undefined" ? location.hostname : "",
    anchor,
  );
}

function applyBidiStyles(el: HTMLElement, proseMirrorEditor = false): void {
  applyBlockBidiStyles(el);
  markComposerRoot(el);
  if (proseMirrorEditor) {
    el.style.removeProperty("direction");
  }
}

function watchGeminiRichTextareaDir(rt: HTMLElement): void {
  if (geminiDirObservers.has(rt)) return;
  const obs = new MutationObserver(() => {
    if (rt.getAttribute("dir") === "rtl") {
      rt.setAttribute("dir", "auto");
      rt.style.setProperty("unicode-bidi", "plaintext", "important");
    }
  });
  obs.observe(rt, { attributes: true, attributeFilter: ["dir"] });
  geminiDirObservers.set(rt, obs);
}

function editorHasBidiMarkers(editor: HTMLElement): boolean {
  if (editor instanceof HTMLTextAreaElement) {
    return BIDI_MARKER_RE.test(editor.value);
  }
  const walker = editor.ownerDocument.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) {
    if (BIDI_MARKER_RE.test((n as Text).nodeValue ?? "")) return true;
  }
  return false;
}

function stripMarkersInEditor(editor: HTMLElement): void {
  if (editor instanceof HTMLTextAreaElement) {
    const stripped = stripBidiMarkers(editor.value);
    if (stripped !== editor.value) editor.value = stripped;
    return;
  }
  const walker = editor.ownerDocument.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const t = n as Text;
    const v = t.nodeValue ?? "";
    const stripped = stripBidiMarkers(v);
    if (stripped !== v) t.nodeValue = stripped;
  }
}

function stripMarkersInSubtree(root: HTMLElement): boolean {
  let changed = false;
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const t = n as Text;
    const v = t.nodeValue ?? "";
    const stripped = stripBidiMarkers(v);
    if (stripped !== v) {
      t.nodeValue = stripped;
      changed = true;
    }
  }
  return changed;
}

function subtreeHasBidiMarkers(root: HTMLElement): boolean {
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) {
    if (BIDI_MARKER_RE.test((n as Text).nodeValue ?? "")) return true;
  }
  return false;
}

function hintClaudeEditorOnce(editor: HTMLElement): void {
  // The class is re-checked every call: ProseMirror re-renders can drop it, and the editor
  // root is the one node whose attribute changes ProseMirror ignores.
  markComposerRoot(editor);
  if (cssOnlyEditorHinted.has(editor)) return;
  cssOnlyEditorHinted.add(editor);
  editor.setAttribute("dir", "auto");
  editor.style.setProperty("unicode-bidi", "plaintext");
}

/**
 * CSS hints for the Claude composer.
 *
 * Only the editor root is touched — paragraphs, list items, and lists inside are styled by
 * `content.css` (`unicode-bidi: plaintext` per block, markers `inside` so they follow each
 * line's own direction). Writing attributes on inner ProseMirror nodes makes it redraw them
 * and drop the hint, which is why the per-paragraph write was removed.
 */
export function hintClaudeComposerOnce(editor: HTMLElement): void {
  hintClaudeEditorOnce(editor);
}

/**
 * Claude: strip stray bidi markers only (e.g. after paste). Does not change dir while typing.
 */
export function maintainClaudeComposerEditor(editor: HTMLElement): void {
  const block = getCaretBlockInEditor(editor);
  const target = block && block !== editor ? block : editor;

  if (!subtreeHasBidiMarkers(target)) return;

  const focused =
    editor === editor.ownerDocument.activeElement ||
    editor.contains(editor.ownerDocument.activeElement);
  const logicalCaret = focused ? getCaretLogicalOffsetInBlock(target) : null;

  const changed = stripMarkersInSubtree(target);

  if (changed && logicalCaret !== null) {
    setCaretLogicalOffsetInBlock(target, logicalCaret);
  }
}

export function maintainCssOnlyComposer(
  editor: HTMLElement,
  scope: "caret" | "all" = "caret",
): void {
  const host = typeof location !== "undefined" ? location.hostname : "";
  if (isClaudeLikeHost(host)) {
    maintainClaudeComposerEditor(editor);
    return;
  }

  if (editor instanceof HTMLTextAreaElement) {
    if (!cssOnlyEditorHinted.has(editor)) {
      cssOnlyEditorHinted.add(editor);
      applyBidiStyles(editor, false);
    }
    const start = editor.selectionStart ?? 0;
    const logicalStart = stripBidiMarkers(editor.value.slice(0, start)).length;
    if (!editorHasBidiMarkers(editor)) return;
    stripMarkersInEditor(editor);
    try {
      editor.setSelectionRange(logicalStart, logicalStart);
    } catch {
      /* ignore */
    }
    return;
  }

  const block = getCaretBlockInEditor(editor) ?? editor;
  const logicalCaret = getCaretLogicalOffsetInBlock(block);

  ensureCssOnlyEditorStyles(editor, scope, scope === "all" ? undefined : block);

  if (!editorHasBidiMarkers(editor)) return;

  stripMarkersInEditor(editor);

  const focused =
    editor === editor.ownerDocument.activeElement ||
    editor.contains(editor.ownerDocument.activeElement);

  if (focused && logicalCaret !== null) {
    setCaretLogicalOffsetInBlock(block, logicalCaret);
  }
}

/** @deprecated use maintainCssOnlyComposer */
export function maintainGeminiComposer(editor: HTMLElement): void {
  maintainCssOnlyComposer(editor);
}

export function stripMarkersInGeminiEditor(editor: HTMLElement): void {
  stripMarkersInEditor(editor);
}
