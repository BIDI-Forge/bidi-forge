import type { ParagraphDirection } from "@rtl-text-fixer/shared";
import { getCharClass, type CharClass } from "./languageDetector.js";
import { LRM, RLM } from "./isolates.js";
import { findAtomicLtrSpans } from "./runs.js";
import { iterateGraphemes } from "./segments.js";

function isWeakLeadingCharClass(cc: CharClass): boolean {
  return cc === "SPACE" || cc === "PUNCT" || cc === "NUMBER" || cc === "OTHER";
}

/**
 * Blank out `code`/URL/email/path runs before deciding a paragraph direction.
 * A Persian sentence that merely *starts* with `` `npm install` `` is still a Persian
 * sentence; without masking, the technical run wins and the whole line flips to LTR.
 */
export function maskAtomicLtrSpans(text: string): string {
  const spans = findAtomicLtrSpans(text);
  if (spans.length === 0) return text;

  let out = "";
  let cursor = 0;
  for (const span of spans) {
    out += text.slice(cursor, span.start);
    out += " ".repeat(span.end - span.start);
    cursor = span.end;
  }
  return out + text.slice(cursor);
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
  const prose = maskAtomicLtrSpans(text);

  if (isEnglishFirstMixedLine(prose)) return "ltr";
  if (isRtlFirstMixedLine(prose)) return "rtl";

  let rtl = 0;
  let ltr = 0;

  for (const ch of prose) {
    const cc = getCharClass(ch);
    if (cc === "RTL") rtl++;
    else if (cc === "LTR") ltr++;
  }

  if (rtl === 0 && ltr === 0) return "neutral";
  if (rtl > ltr) return "rtl";
  if (ltr > rtl) return "ltr";

  const firstStrong = detectFirstStrongDirection(prose);
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

/** True when weak characters (bullet, list number, emoji, quote) precede the first strong one. */
export function hasWeakLeadingRun(text: string): boolean {
  let sawWeakLeading = false;
  for (const g of iterateGraphemes(text)) {
    const cc = getCharClass(g);
    if (cc === "RTL" || cc === "LTR") return sawWeakLeading;
    if (isWeakLeadingCharClass(cc)) sawWeakLeading = true;
  }
  return false;
}

/**
 * Marker to prepend so the renderer resolves the *same* base direction we tokenized for.
 *
 * `dir="auto"` and the Unicode BiDi algorithm both anchor on the first strong character, so a
 * Persian line that opens with `` `code` ``, an English term, a bullet, or a list number would
 * otherwise render LTR (misplaced bullets, punctuation jumping sides). A leading RLM/LRM is a
 * strong character of the intended direction, which pins the paragraph without changing the text.
 */
export function leadingBidiMarkerFor(
  text: string,
  paragraphDirection: ParagraphDirection,
): string {
  if (paragraphDirection === "neutral") return "";
  if (!text) return "";

  const firstStrong = detectFirstStrongDirection(text);

  if (paragraphDirection === "rtl") {
    if (!hasRtlStrong(text)) return "";
    return firstStrong !== "rtl" || hasWeakLeadingRun(text) ? RLM : "";
  }

  // Pure LTR text never needs pinning — leave English-only lines untouched.
  if (!hasRtlStrong(text)) return "";
  return firstStrong !== "ltr" || hasWeakLeadingRun(text) ? LRM : "";
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
