import type { ParagraphDirection } from "@rtl-text-fixer/shared";
import { getCharClass } from "./languageDetector.js";

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
