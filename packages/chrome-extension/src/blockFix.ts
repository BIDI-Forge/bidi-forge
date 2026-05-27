import { fixMixedText, stripBidiMarkers } from "@rtl-text-fixer/core";

import { isInsideCssOnlyComposer } from "./cssOnlyComposer.js";

const PERSIAN_RE = /[\u0600-\u06FF]/;
const ENGLISH_RE = /[a-zA-Z]/;
const BIDI_MARKER_RE = /[\u200E\u200F\u2066-\u2069]/;

export function shouldFixMixedText(text: string): boolean {
  return PERSIAN_RE.test(text) && ENGLISH_RE.test(text);
}

export function fixBlockCoalescedTextNodes(block: HTMLElement, fixed: string): boolean {
  const doc = block.ownerDocument;
  const walker = doc.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      const t = n as Text;
      if (!t.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
      if (t.parentElement?.closest("pre, code, kbd, samp")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) nodes.push(n as Text);
  if (nodes.length === 0) return false;

  nodes[0]!.nodeValue = fixed;
  for (let i = 1; i < nodes.length; i++) nodes[i]!.nodeValue = "";
  return true;
}

/** Non-destructive block fix (no execCommand) for live composers. */
export function mapOffsetThroughMarkerFix(
  original: string,
  fixed: string,
  originalOffset: number,
): number {
  const target = Math.max(0, Math.min(originalOffset, original.length));
  let j = 0;
  let i = 0;

  while (i < fixed.length && j < target) {
    const fc = fixed[i]!;
    if (BIDI_MARKER_RE.test(fc)) {
      i++;
      continue;
    }
    const oc = original[j]!;
    if (fc === oc) {
      i++;
      j++;
      continue;
    }
    i++;
  }

  while (i < fixed.length && BIDI_MARKER_RE.test(fixed[i]!)) i++;
  return i;
}

export function getCaretOffsetInBlock(block: HTMLElement): number | null {
  const sel = block.ownerDocument.getSelection?.();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!block.contains(range.startContainer) || !range.collapsed) return null;

  const pre = block.ownerDocument.createRange();
  pre.selectNodeContents(block);
  pre.setEnd(range.startContainer, range.startOffset);
  return pre.toString().length;
}

export function setCaretOffsetInBlock(block: HTMLElement, offset: number): void {
  const doc = block.ownerDocument;
  const walker = doc.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let remaining = Math.max(0, offset);
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const t = n as Text;
    const len = t.nodeValue?.length ?? 0;
    if (remaining <= len) {
      const sel = doc.getSelection?.();
      if (!sel) return;
      const r = doc.createRange();
      r.setStart(t, remaining);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
      return;
    }
    remaining -= len;
  }
}

/** Last strong character before caret (logical DOM order in range). */
export function lastStrongBeforeCaret(block: HTMLElement): "ltr" | "rtl" | null {
  const sel = block.ownerDocument.getSelection?.();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!block.contains(range.startContainer)) return null;

  const pre = block.ownerDocument.createRange();
  pre.selectNodeContents(block);
  pre.setEnd(range.startContainer, range.startOffset);
  const text = stripBidiMarkers(pre.toString());

  for (let i = text.length - 1; i >= 0; i--) {
    const ch = text[i]!;
    if (/\s/.test(ch)) continue;
    if (ENGLISH_RE.test(ch) || /[0-9]/.test(ch)) return "ltr";
    if (PERSIAN_RE.test(ch)) return "rtl";
    return null;
  }
  return null;
}

/** Caret boundary using `textContent` (stable in Quill); avoids mixed-bidi `Range.toString()` drift. */
export function lastStrongBeforeCaretLogical(block: HTMLElement): "ltr" | "rtl" | null {
  const offset = getCaretOffsetInBlock(block);
  if (offset === null) return null;
  const before = stripBidiMarkers(block.textContent ?? "").slice(0, offset);
  for (let i = before.length - 1; i >= 0; i--) {
    const ch = before[i]!;
    if (/\s/.test(ch)) continue;
    if (ENGLISH_RE.test(ch) || /[0-9]/.test(ch)) return "ltr";
    if (PERSIAN_RE.test(ch)) return "rtl";
    return null;
  }
  return null;
}

export function tryFixMixedBlockCoalesced(block: HTMLElement): boolean {
  if (block.closest("pre")) return false;
  if (block.matches("pre, code, kbd, samp")) return false;
  if (block.querySelector("pre, code, kbd, samp, a[href]")) return false;

  const host = typeof location !== "undefined" ? location.hostname : "";
  if (host && isInsideCssOnlyComposer(block, host)) return false;

  const raw = stripBidiMarkers(block.textContent ?? "");
  if (!raw.trim() || !shouldFixMixedText(raw)) return false;

  const fixed = fixMixedText(raw);
  if (fixed === raw) return false;

  if (block.childElementCount === 0) {
    block.textContent = fixed;
    return true;
  }

  return fixBlockCoalescedTextNodes(block, fixed);
}
