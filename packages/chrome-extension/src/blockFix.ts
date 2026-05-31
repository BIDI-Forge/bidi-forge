import { fixMixedText, stripBidiMarkers } from "@rtl-text-fixer/core";

import { isInsideCssOnlyComposer } from "./cssOnlyComposer.js";

const PERSIAN_RE = /[\u0600-\u06FF]/;
const ENGLISH_RE = /[a-zA-Z]/;

function isMarkerChar(ch: string): boolean {
  return /[\u200E\u200F\u2066-\u2069]/.test(ch);
}

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

/** Map logical (marker-free) offset to DOM offset inside one text node. */
export function mapLogicalOffsetToDomOffset(textWithMarkers: string, logicalOffset: number): number {
  const target = Math.max(0, logicalOffset);
  let logical = 0;
  for (let i = 0; i < textWithMarkers.length; i++) {
    if (logical >= target) return i;
    if (!isMarkerChar(textWithMarkers[i]!)) logical++;
  }
  return textWithMarkers.length;
}

/** Map logical offset in marker-free text to DOM offset in marker-inclusive fixed text. */
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
    if (isMarkerChar(fc)) {
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

  while (i < fixed.length && isMarkerChar(fixed[i]!)) i++;
  return i;
}

/** Caret offset in DOM text order (includes bidi markers). Avoids `Range.toString()` visual reordering. */
export function getCaretDomOffsetInBlock(block: HTMLElement): number | null {
  const sel = block.ownerDocument.getSelection?.();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!block.contains(range.startContainer) || !range.collapsed) return null;

  const walker = block.ownerDocument.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let dom = 0;
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const t = n as Text;
    const v = t.nodeValue ?? "";
    if (range.startContainer === t) {
      return dom + range.startOffset;
    }
    dom += v.length;
  }
  return null;
}

/** Caret offset in logical marker-free text (stable for mixed RTL/LTR). */
export function getCaretLogicalOffsetInBlock(block: HTMLElement): number | null {
  const sel = block.ownerDocument.getSelection?.();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!block.contains(range.startContainer) || !range.collapsed) return null;

  const walker = block.ownerDocument.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let logical = 0;
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const t = n as Text;
    const v = t.nodeValue ?? "";
    if (range.startContainer === t) {
      logical += stripBidiMarkers(v.slice(0, range.startOffset)).length;
      return logical;
    }
    logical += stripBidiMarkers(v).length;
  }
  return null;
}

/** @deprecated Prefer getCaretDomOffsetInBlock or getCaretLogicalOffsetInBlock. */
export function getCaretOffsetInBlock(block: HTMLElement): number | null {
  return getCaretDomOffsetInBlock(block);
}

export function setCaretDomOffsetInBlock(block: HTMLElement, domOffset: number): void {
  const doc = block.ownerDocument;
  const walker = doc.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let remaining = Math.max(0, domOffset);
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

/** Restore caret using logical (marker-free) offset. */
export function setCaretLogicalOffsetInBlock(block: HTMLElement, logicalOffset: number): void {
  const doc = block.ownerDocument;
  const walker = doc.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let remaining = Math.max(0, logicalOffset);
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const t = n as Text;
    const v = t.nodeValue ?? "";
    const logicalLen = stripBidiMarkers(v).length;
    if (remaining <= logicalLen) {
      const domOffset = mapLogicalOffsetToDomOffset(v, remaining);
      const sel = doc.getSelection?.();
      if (!sel) return;
      const r = doc.createRange();
      r.setStart(t, domOffset);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
      return;
    }
    remaining -= logicalLen;
  }
}

/** @deprecated Prefer setCaretDomOffsetInBlock or setCaretLogicalOffsetInBlock. */
export function setCaretOffsetInBlock(block: HTMLElement, offset: number): void {
  setCaretDomOffsetInBlock(block, offset);
}

function isBlockFocused(block: HTMLElement): boolean {
  const doc = block.ownerDocument;
  const active = doc.activeElement;
  return active === block || (active instanceof Node && block.contains(active));
}

/** Last strong character before caret (logical order). */
export function lastStrongBeforeCaret(block: HTMLElement): "ltr" | "rtl" | null {
  const offset = getCaretLogicalOffsetInBlock(block);
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

/** @deprecated Use lastStrongBeforeCaret — now logical. */
export function lastStrongBeforeCaretLogical(block: HTMLElement): "ltr" | "rtl" | null {
  return lastStrongBeforeCaret(block);
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

  const focused = isBlockFocused(block);
  const logicalCaret = focused ? getCaretLogicalOffsetInBlock(block) : null;

  let changed = false;
  if (block.childElementCount === 0) {
    block.textContent = fixed;
    changed = true;
  } else {
    changed = fixBlockCoalescedTextNodes(block, fixed);
  }

  if (changed && focused && logicalCaret !== null) {
    const domCaret = mapOffsetThroughMarkerFix(raw, fixed, logicalCaret);
    setCaretDomOffsetInBlock(block, domCaret);
  }

  return changed;
}
