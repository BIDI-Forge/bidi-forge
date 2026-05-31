/**
 * Rich chat composers that break when LRM/RLM are inserted (Quill, ProseMirror, etc.).
 * CSS `dir=auto` + `unicode-bidi: plaintext` only; strip stray markers, never fixMixedText while typing.
 */

import { stripBidiMarkers } from "@rtl-text-fixer/core";

import {
  applyBlockBidiStyles,
  applyListContainerBidiStyles,
  applyListItemBidiStyles,
  BIDI_COMPOSER_BLOCK_SELECTOR,
  BIDI_LIST_SELECTOR,
} from "./bidiDomStyles.js";
import { getCaretLogicalOffsetInBlock, setCaretLogicalOffsetInBlock } from "./blockFix.js";

const BIDI_MARKER_RE = /[\u200E\u200F\u2066-\u2069]/;

const GROK_COMPOSER_SHELL_SELECTOR =
  '[class*="composer"], [class*="Composer"], [data-testid*="composer"], [data-testid*="Composer"], form, [role="textbox"][contenteditable]';

const GROK_MESSAGE_BUBBLE_SELECTOR =
  '[data-testid*="message"], article[role="article"], [class*="message-bubble"]';

const CHATGPT_MESSAGE_BUBBLE_SELECTOR = "[data-message-author-role]";

const CHATGPT_COMPOSER_SHELL_SELECTOR =
  '#prompt-textarea, form[data-type="unified-composer"], [data-testid="composer"], footer form, [class*="composer"]';

// ── Host / surface ───────────────────────────────────────────────────────────

export function isGeminiHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "gemini.google.com" || h.endsWith(".gemini.google.com");
}

export function isGrokHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "grok.com" ||
    h.endsWith(".grok.com") ||
    h === "grok.x.com" ||
    h.endsWith(".grok.x.com") ||
    h === "x.ai" ||
    h.endsWith(".x.ai")
  );
}

function isXHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "x.com" ||
    h.endsWith(".x.com") ||
    h === "twitter.com" ||
    h.endsWith(".twitter.com")
  );
}

/** Grok UI on dedicated hosts or X/Twitter `/grok` routes only. */
export function isGrokSurface(hostname: string, pathname = ""): boolean {
  if (isGrokHost(hostname)) return true;
  if (!isXHost(hostname)) return false;
  const p = pathname.toLowerCase();
  return p.includes("/grok");
}

export function isGoogleAiHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    isGeminiHost(hostname) ||
    h.includes("bard.google") ||
    h === "ogs.google.com" ||
    h.endsWith(".ogs.google.com") ||
    h === "notebooklm.google.com" ||
    h === "aistudio.google.com" ||
    h === "labs.google.com"
  );
}

export function isChatGptHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "chatgpt.com" ||
    h.endsWith(".chatgpt.com") ||
    h === "chat.openai.com" ||
    h.endsWith(".chat.openai.com") ||
    h === "openai.com" ||
    h.endsWith(".openai.com")
  );
}

export function isClaudeLikeHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "claude.ai" || h.endsWith(".claude.ai") || h.includes("anthropic.com");
}

export function isCssOnlySurface(hostname: string, pathname = ""): boolean {
  return (
    isGeminiHost(hostname) ||
    isGrokSurface(hostname, pathname) ||
    isChatGptHost(hostname) ||
    isClaudeLikeHost(hostname)
  );
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

function isInsideGrokMessageBubble(el: Element): boolean {
  const bubble = el.closest(GROK_MESSAGE_BUBBLE_SELECTOR);
  if (!bubble) return false;
  return !el.closest(GROK_COMPOSER_SHELL_SELECTOR);
}

function resolveGrokEditor(hostname: string, anchor: Element): HTMLElement | null {
  if (!isGrokSurface(hostname)) return null;

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
  if (!isGrokSurface(hostname)) return false;
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
    '.ProseMirror[contenteditable="true"]',
    '.ProseMirror[contenteditable=""]',
    '[contenteditable="true"][role="textbox"]',
  ]) {
    const found = anchor.closest(sel);
    if (
      found instanceof HTMLElement &&
      found.isContentEditable &&
      !isInsideClaudeMessageBubble(found)
    ) {
      return found;
    }
  }

  const shell = anchor.closest(CLAUDE_COMPOSER_SHELL_SELECTOR);
  if (shell) {
    const ce = shell.querySelector('.ProseMirror[contenteditable="true"], [contenteditable="true"][role="textbox"]');
    if (ce instanceof HTMLElement && ce.isContentEditable && !isInsideClaudeMessageBubble(ce)) {
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

  return null;
}

export function isClaudeLiveComposer(hostname: string, el: Element): boolean {
  if (!isClaudeLikeHost(hostname)) return false;
  const editor = resolveClaudeEditor(hostname, el);
  if (!editor) return false;
  return editor === el || editor.contains(el);
}

// ── Unified ───────────────────────────────────────────────────────────────────

export function resolveCssOnlyEditor(hostname: string, anchor: Element): HTMLElement | null {
  return (
    findGeminiQuillEditor(anchor) ??
    resolveGrokEditor(hostname, anchor) ??
    resolveChatGptEditor(hostname, anchor) ??
    resolveClaudeEditor(hostname, anchor)
  );
}

export function isCssOnlyComposer(hostname: string, el: Element): boolean {
  if (isGeminiQuillComposer(hostname, el)) return true;
  if (isGrokLiveComposer(hostname, el)) return true;
  if (isChatGptLiveComposer(hostname, el)) return true;
  return isClaudeLiveComposer(hostname, el);
}

export function isInsideCssOnlyComposer(el: Element, hostname: string): boolean {
  if (isInsideGeminiComposer(el, hostname)) return true;
  const ed = resolveCssOnlyEditor(hostname, el);
  if (!ed) return false;
  return ed === el || ed.contains(el);
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
  if (editor) ensureCssOnlyEditorStyles(editor, "all");
  else if (anchor.isContentEditable || anchor instanceof HTMLTextAreaElement) {
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

export function maintainCssOnlyComposer(
  editor: HTMLElement,
  scope: "caret" | "all" = "caret",
): void {
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
