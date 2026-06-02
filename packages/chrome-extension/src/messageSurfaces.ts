/**
 * Read-only chat message surfaces (Claude assistant replies, etc.).
 * Composers are handled in content.ts; this module fixes rendered markdown/ProseMirror output.
 */

import { fixMixedText, stripBidiMarkers } from "@bidi-forge/core";

import { fixBlockCoalescedTextNodes, shouldFixMixedText } from "./blockFix.js";
import {
  applyBlockBidiStyles,
  applyListContainerBidiStyles,
  applyListItemBidiStyles,
  BIDI_BLOCK_SELECTOR,
  BIDI_LIST_SELECTOR,
} from "./bidiDomStyles.js";
import { querySelectorAllDeepFrom } from "./domDeep.js";
import { getMessageRootSelectors as getAdapterMessageRoots } from "./adapters/registry.js";
import { isInsideCssOnlyComposer } from "./cssOnlyComposer.js";

const EDITABLE_SELECTOR =
  '[contenteditable="true"],textarea,[role="textbox"][contenteditable="true"]';

const MESSAGE_BLOCK_SELECTOR = BIDI_BLOCK_SELECTOR;

const hintedRoots = new WeakSet<HTMLElement>();
const lastRootSignature = new WeakMap<HTMLElement, string>();

export { isChatGptHost, isClaudeLikeHost } from "./adapters/hosts.js";

export function getMessageRootSelectors(hostname: string, pathname = ""): string[] {
  return getAdapterMessageRoots(hostname, pathname);
}

function shouldFixText(text: string): boolean {
  return shouldFixMixedText(text);
}

function isInsideEditable(el: Element): boolean {
  return Boolean(el.closest(EDITABLE_SELECTOR));
}

function applyReaderBidiStack(root: HTMLElement): void {
  applyBlockBidiStyles(root);

  for (const el of root.querySelectorAll(`${MESSAGE_BLOCK_SELECTOR}, ${BIDI_LIST_SELECTOR}, table, .markdown, .prose`)) {
    if (!(el instanceof HTMLElement)) continue;
    if (el.tagName === "OL" || el.tagName === "UL") applyListContainerBidiStyles(el);
    else if (el.tagName === "LI") applyListItemBidiStyles(el);
    else applyBlockBidiStyles(el);
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
  if (root.closest('[data-is-streaming="true"]')) return true;
  if (root.matches(".result-streaming, .streaming")) return true;
  if (root.querySelector(".result-streaming, .streaming")) return true;
  const busy = root.closest('[aria-busy="true"]');
  return busy instanceof HTMLElement;
}

/** Fix read-only message container (call inside mutation-suppress guard). */
export function scanMessageRoot(root: HTMLElement, hostname: string): void {
  if (isInsideEditable(root)) return;
  if (isInsideCssOnlyComposer(root, hostname)) return;
  if (root.id === "prompt-textarea") return;
  if (root.closest("#prompt-textarea")) return;
  if (root.closest("rich-textarea, .ql-container, .ql-editor")) return;
  if (isStillStreaming(root)) return;

  if (!hintedRoots.has(root)) {
    applyReaderBidiStack(root);
    hintedRoots.add(root);
  }

  const signature = stripBidiMarkers(root.textContent ?? "");
  if (lastRootSignature.get(root) === signature) return;

  for (const block of root.querySelectorAll(`${MESSAGE_BLOCK_SELECTOR}, li > p`)) {
    if (!(block instanceof HTMLElement)) continue;
    if (isInsideEditable(block)) continue;
    if (isInsideCssOnlyComposer(block, hostname)) continue;
    if (block.closest("#prompt-textarea")) continue;
    fixReadOnlyBlock(block);
  }

  lastRootSignature.set(root, stripBidiMarkers(root.textContent ?? ""));
}

/**
 * Scan assistant/user message containers for BiDi CSS + marker fixes.
 */
export function scanMessageSurfaces(doc: Document, hostname: string, pathname = ""): void {
  if (!doc.body) return;

  const selectors = getMessageRootSelectors(hostname, pathname);
  const seen = new Set<Element>();

  for (const sel of selectors) {
    for (const el of querySelectorAllDeepFrom(doc, sel)) {
      if (!(el instanceof HTMLElement)) continue;
      if (seen.has(el)) continue;
      seen.add(el);
      if (isInsideEditable(el)) continue;
      if (isInsideCssOnlyComposer(el, hostname)) continue;
      scanMessageRoot(el, hostname);
    }
  }
}

export function scanMessageSurfacesFromElement(
  el: Element,
  hostname: string,
  pathname = "",
): void {
  const doc = el.ownerDocument;
  if (!doc) return;
  const selectors = getMessageRootSelectors(hostname, pathname);
  for (const sel of selectors) {
    if (
      el.matches(sel) &&
      el instanceof HTMLElement &&
      !isInsideEditable(el) &&
      !isInsideCssOnlyComposer(el, hostname)
    ) {
      scanMessageRoot(el, hostname);
    }
    for (const found of el.querySelectorAll(sel)) {
      if (
        found instanceof HTMLElement &&
        !isInsideEditable(found) &&
        !isInsideCssOnlyComposer(found, hostname)
      ) {
        scanMessageRoot(found, hostname);
      }
    }
  }
}
