export type DetectedLanguage = "FA" | "EN" | "MIXED" | "UNKNOWN";

const PERSIAN_RE = /[\u0600-\u06FF]/;
const ENGLISH_RE = /[a-zA-Z]/;
const NUMBER_RE = /[0-9]/;

export type CharClass = "RTL" | "LTR" | "NUMBER" | "PUNCT" | "SPACE" | "OTHER";

export function detectLanguage(segment: string): DetectedLanguage {
  let hasFa = false;
  let hasEn = false;

  for (const ch of segment) {
    if (!hasFa && PERSIAN_RE.test(ch)) hasFa = true;
    if (!hasEn && ENGLISH_RE.test(ch)) hasEn = true;
    if (hasFa && hasEn) return "MIXED";
  }

  if (hasFa) return "FA";
  if (hasEn) return "EN";
  return "UNKNOWN";
}

function isAsciiPunctuation(ch: string): boolean {
  // Keep this intentionally narrow; treat the rest as OTHER.
  // Includes common ASCII punctuation and symbols.
  return /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/.test(ch);
}

export function getCharClass(ch: string): CharClass {
  if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") return "SPACE";
  if (PERSIAN_RE.test(ch)) return "RTL";
  if (ENGLISH_RE.test(ch)) return "LTR";
  if (NUMBER_RE.test(ch)) return "NUMBER";
  if (isAsciiPunctuation(ch)) return "PUNCT";

  // Arabic-Indic digits (commonly used in Persian contexts)
  if (/[\u06F0-\u06F9\u0660-\u0669]/.test(ch)) return "NUMBER";

  // Persian/Arabic punctuation (، ؛ ؟)
  if (/[\u060C\u061B\u061F]/.test(ch)) return "PUNCT";

  return "OTHER";
}
