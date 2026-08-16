/**
 * Read-only chat message surfaces (Claude assistant replies, etc.).
 * Composers are handled in content.ts; this module fixes rendered markdown/ProseMirror output.
 *
 * The fix is attribute-only (see readerBidi.ts). Earlier versions rewrote the text nodes to
 * inject LRM/RLM, which duplicated the content of inline `<code>`/`<a>` elements and leaked
 * invisible markers into anything the user copied.
 */

import {
  applyReaderBidi,
  BF_ROLE_ATTR,
  clearReaderBidi,
} from "./readerBidi.js";
import { querySelectorAllDeepFrom } from "./domDeep.js";
import { getMessageRootSelectors as getAdapterMessageRoots } from "./adapters/registry.js";
import { isInsideCssOnlyComposer } from "./cssOnlyComposer.js";

const EDITABLE_SELECTOR =
  '[contenteditable="true"],textarea,[role="textbox"][contenteditable="true"]';

const lastRootSignature = new WeakMap<HTMLElement, string>();

export { isChatGptHost, isClaudeLikeHost } from "./adapters/hosts.js";
export { clearReaderBidi };

export function getMessageRootSelectors(hostname: string, pathname = ""): string[] {
  return getAdapterMessageRoots(hostname, pathname);
}

function isInsideEditable(el: Element): boolean {
  return Boolean(el.closest(EDITABLE_SELECTOR));
}

/**
 * Cheap change detector. Content length covers streaming appends; the role probe catches
 * re-renders that dropped our attributes while the text stayed the same.
 */
function rootSignature(root: HTMLElement): string {
  const text = root.textContent ?? "";
  const hinted = root.querySelector(`[${BF_ROLE_ATTR}]`) ? "1" : "0";
  return `${hinted}|${text.length}|${text}`;
}

function isSkippedRoot(root: HTMLElement, hostname: string): boolean {
  if (isInsideEditable(root)) return true;
  if (root.isContentEditable) return true;
  if (isInsideCssOnlyComposer(root, hostname)) return true;
  if (root.id === "prompt-textarea") return true;
  if (root.closest("#prompt-textarea")) return true;
  return Boolean(root.closest("rich-textarea, .ql-container, .ql-editor"));
}

/** Fix read-only message container (call inside mutation-suppress guard). */
export function scanMessageRoot(root: HTMLElement, hostname: string): void {
  if (isSkippedRoot(root, hostname)) return;

  const signature = rootSignature(root);
  if (lastRootSignature.get(root) === signature) return;

  applyReaderBidi(root);
  lastRootSignature.set(root, rootSignature(root));
}

/**
 * Scan assistant/user message containers for BiDi direction hints.
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
  const seen = new Set<Element>();

  for (const sel of selectors) {
    if (el.matches(sel) && el instanceof HTMLElement && !seen.has(el)) {
      seen.add(el);
      scanMessageRoot(el, hostname);
    }
    for (const found of el.querySelectorAll(sel)) {
      if (!(found instanceof HTMLElement) || seen.has(found)) continue;
      seen.add(found);
      scanMessageRoot(found, hostname);
    }
  }
}
