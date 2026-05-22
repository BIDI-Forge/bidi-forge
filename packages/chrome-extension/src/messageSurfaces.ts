/**
 * Read-only chat message surfaces (Claude assistant replies, etc.).
 * Composers are handled in content.ts; this module fixes rendered markdown/ProseMirror output.
 */

import { fixMixedText, stripBidiMarkers } from "@rtl-text-fixer/core";

import { fixBlockCoalescedTextNodes, shouldFixMixedText } from "./blockFix.js";
import { querySelectorAllDeepFrom } from "./domDeep.js";
import { isGeminiHost, isInsideGeminiComposer } from "./geminiQuill.js";

const EDITABLE_SELECTOR =
  '[contenteditable="true"],textarea,[role="textbox"][contenteditable="true"]';

const MESSAGE_BLOCK_SELECTOR = "p, li, blockquote, h1, h2, h3, h4, h5, h6";

const CLAUDE_MESSAGE_ROOTS = [
  '[data-testid="assistant-message"]',
  '[data-testid="user-message"]',
  ".standard-markdown",
  ".font-claude-message",
];

/** ProseMirror output that is not the live composer. */
const GENERIC_READONLY_PROSE = '.ProseMirror:not([contenteditable="true"])';

/** Gemini assistant output — avoid `.ProseMirror` (matches the live Quill composer). */
const GEMINI_MESSAGE_ROOTS = [
  ".markdown",
  ".message-content",
  '[class*="model-response"]',
  '[class*="response-container"]',
  "message-content",
];

const hintedRoots = new WeakSet<HTMLElement>();
const lastRootSignature = new WeakMap<HTMLElement, string>();

export function isClaudeLikeHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "claude.ai" || h.endsWith(".claude.ai") || h.includes("anthropic.com");
}

export function getMessageRootSelectors(hostname: string): string[] {
  if (isGeminiHost(hostname)) return GEMINI_MESSAGE_ROOTS;
  if (isClaudeLikeHost(hostname)) {
    return [...CLAUDE_MESSAGE_ROOTS, GENERIC_READONLY_PROSE];
  }
  return [GENERIC_READONLY_PROSE];
}

function shouldFixText(text: string): boolean {
  return shouldFixMixedText(text);
}

function isInsideEditable(el: Element): boolean {
  return Boolean(el.closest(EDITABLE_SELECTOR));
}

function applyReaderBidiStack(root: HTMLElement): void {
  root.setAttribute("dir", "auto");
  root.style.setProperty("unicode-bidi", "plaintext", "important");
  root.style.setProperty("direction", "auto", "important");
  root.style.setProperty("text-align", "start", "important");

  for (const el of root.querySelectorAll(
    `${MESSAGE_BLOCK_SELECTOR}, ol, ul, table, .markdown, .prose`,
  )) {
    if (!(el instanceof HTMLElement)) continue;
    el.setAttribute("dir", "auto");
    el.style.setProperty("unicode-bidi", "plaintext", "important");
    el.style.setProperty("direction", "auto", "important");
    el.style.setProperty("text-align", "start", "important");
  }

  for (const code of root.querySelectorAll("pre, code")) {
    if (code instanceof HTMLElement) {
      code.setAttribute("dir", "ltr");
      code.style.setProperty("direction", "ltr", "important");
      code.style.setProperty("unicode-bidi", "embed", "important");
      code.style.setProperty("text-align", "left", "important");
    }
  }
}

function fixReadOnlyBlock(block: HTMLElement): boolean {
  if (block.closest("pre")) return false;
  if (block.matches("pre, code, kbd, samp")) return false;
  if (block.querySelector("pre")) return false;

  const raw = stripBidiMarkers(block.textContent ?? "");
  if (!raw.trim() || !shouldFixText(raw)) return false;

  const fixed = fixMixedText(raw);
  if (fixed === raw) return false;

  if (block.childElementCount === 0) {
    block.textContent = fixed;
    return true;
  }

  return fixBlockCoalescedTextNodes(block, fixed);
}

function isStillStreaming(root: HTMLElement): boolean {
  const streaming = root.closest('[data-is-streaming="true"]');
  return streaming instanceof HTMLElement;
}

function processMessageRoot(root: HTMLElement, hostname: string): void {
  if (isInsideEditable(root)) return;
  if (isInsideGeminiComposer(root, hostname)) return;
  if (root.closest("rich-textarea, .ql-container, .ql-editor")) return;
  if (isStillStreaming(root)) return;

  if (!hintedRoots.has(root)) {
    applyReaderBidiStack(root);
    hintedRoots.add(root);
  }

  const signature = stripBidiMarkers(root.textContent ?? "");
  if (lastRootSignature.get(root) === signature) return;

  for (const block of root.querySelectorAll(MESSAGE_BLOCK_SELECTOR)) {
    if (block instanceof HTMLElement && !isInsideEditable(block)) {
      fixReadOnlyBlock(block);
    }
  }

  lastRootSignature.set(root, stripBidiMarkers(root.textContent ?? ""));
}

/**
 * Scan assistant/user message containers for BiDi CSS + marker fixes.
 */
export function scanMessageSurfaces(doc: Document, hostname: string): void {
  if (!doc.body) return;

  const selectors = getMessageRootSelectors(hostname);
  const seen = new Set<Element>();

  for (const sel of selectors) {
    for (const el of querySelectorAllDeepFrom(doc, sel)) {
      if (!(el instanceof HTMLElement)) continue;
      if (seen.has(el)) continue;
      seen.add(el);
      if (isInsideEditable(el)) continue;
      if (isInsideGeminiComposer(el, hostname)) continue;
      processMessageRoot(el, hostname);
    }
  }
}

export function scanMessageSurfacesFromElement(el: Element, hostname: string): void {
  const doc = el.ownerDocument;
  if (!doc) return;
  const selectors = getMessageRootSelectors(hostname);
  for (const sel of selectors) {
    if (
      el.matches(sel) &&
      el instanceof HTMLElement &&
      !isInsideEditable(el) &&
      !isInsideGeminiComposer(el, hostname)
    ) {
      processMessageRoot(el, hostname);
    }
    for (const found of el.querySelectorAll(sel)) {
      if (
        found instanceof HTMLElement &&
        !isInsideEditable(found) &&
        !isInsideGeminiComposer(found, hostname)
      ) {
        processMessageRoot(found, hostname);
      }
    }
  }
}
