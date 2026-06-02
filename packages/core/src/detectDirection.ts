import type { ParagraphDirection } from "@rtl-text-fixer/shared";
import { getCharClass, type CharClass } from "./languageDetector.js";
import { iterateGraphemes } from "./segments.js";

function isWeakLeadingCharClass(cc: CharClass): boolean {
  return cc === "SPACE" || cc === "PUNCT" || cc === "NUMBER" || cc === "OTHER";
}

function indexOfFirstRtlChar(text: string): number {
  let i = 0;
  for (const ch of text) {
    if (getCharClass(ch) === "RTL") return i;
    i += ch.length;
  }
  return -1;
}

/**
 * English phrase first, then Persian (e.g. "Hello سلام", "1. Hello سلام").
 * Not Persian with embedded English ("React در JS").
 */
export function isEnglishFirstMixedLine(text: string): boolean {
  if (detectFirstStrongDirection(text) !== "ltr") return false;
  if (!hasRtlStrong(text) || !hasLtrStrong(text)) return false;
  const rtlAt = indexOfFirstRtlChar(text);
  if (rtlAt < 0) return false;
  return !hasLtrStrong(text.slice(rtlAt));
}

/** Persian/Arabic first, then trailing English (e.g. "1. سلام hello"). */
export function isRtlFirstMixedLine(text: string): boolean {
  if (detectFirstStrongDirection(text) !== "rtl") return false;
  if (!hasRtlStrong(text) || !hasLtrStrong(text)) return false;
  const rtlAt = indexOfFirstRtlChar(text);
  if (rtlAt < 0) return false;
  return !hasLtrStrong(text.slice(0, rtlAt));
}

/**
 * Detect dominant paragraph direction from strong characters.
 */
export function detectParagraphDirection(text: string): ParagraphDirection {
  if (isEnglishFirstMixedLine(text)) return "ltr";
  if (isRtlFirstMixedLine(text)) return "rtl";

  let rtl = 0;
  let ltr = 0;

  for (const ch of text) {
    const cc = getCharClass(ch);
    if (cc === "RTL") rtl++;
    else if (cc === "LTR") ltr++;
  }

  if (rtl === 0 && ltr === 0) return "neutral";
  if (rtl > ltr) return "rtl";
  if (ltr > rtl) return "ltr";

  const firstStrong = detectFirstStrongDirection(text);
  if (firstStrong === "rtl" || firstStrong === "ltr") return firstStrong;
  return "neutral";
}

/** First strong RTL/LTR character, skipping emoji, numbers, punctuation, and whitespace. */
export function detectFirstStrongDirection(text: string): "rtl" | "ltr" | null {
  for (const g of iterateGraphemes(text)) {
    const cc = getCharClass(g);
    if (cc === "RTL") return "rtl";
    if (cc === "LTR") return "ltr";
  }
  return null;
}

export function hasRtlStrong(text: string): boolean {
  for (const ch of text) {
    if (getCharClass(ch) === "RTL") return true;
  }
  return false;
}

export function hasLtrStrong(text: string): boolean {
  for (const ch of text) {
    if (getCharClass(ch) === "LTR") return true;
  }
  return false;
}

/**
 * RTL-heavy lines that start with emoji, list numbers, or other weak runs need a leading RLM
 * so `dir=auto` / plaintext does not anchor on the number or neutral emoji.
 */
export function needsLeadingRlmForRtlParagraph(
  text: string,
  _paragraphDirection: ParagraphDirection,
): boolean {
  if (!hasRtlStrong(text)) return false;
  if (detectFirstStrongDirection(text) !== "rtl") return false;

  let sawWeakLeading = false;
  for (const g of iterateGraphemes(text)) {
    const cc = getCharClass(g);
    if (cc === "RTL") return sawWeakLeading;
    if (cc === "LTR") return false;
    if (isWeakLeadingCharClass(cc)) sawWeakLeading = true;
  }
  return false;
}

/**
 * English-first mixed lines that start with emoji, list numbers, or bullets need a leading LRM
 * so `dir=auto` does not anchor on neutral weak characters before the English run.
 */
export function needsLeadingLrmForLtrMixedParagraph(
  text: string,
  paragraphDirection: ParagraphDirection,
): boolean {
  if (paragraphDirection !== "ltr") return false;
  if (!isEnglishFirstMixedLine(text)) return false;

  let sawWeakLeading = false;
  for (const g of iterateGraphemes(text)) {
    const cc = getCharClass(g);
    if (cc === "LTR") return sawWeakLeading;
    if (cc === "RTL") return false;
    if (isWeakLeadingCharClass(cc)) sawWeakLeading = true;
  }
  return false;
}
