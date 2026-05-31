import type { ParagraphDirection } from "@rtl-text-fixer/shared";
import { getCharClass, type CharClass } from "./languageDetector.js";
import { iterateGraphemes } from "./segments.js";

function isWeakLeadingCharClass(cc: CharClass): boolean {
  return cc === "SPACE" || cc === "PUNCT" || cc === "NUMBER" || cc === "OTHER";
}

/**
 * Detect dominant paragraph direction from strong characters.
 */
export function detectParagraphDirection(text: string): ParagraphDirection {
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
