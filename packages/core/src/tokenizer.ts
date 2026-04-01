import type { Token, Direction } from "@rtl-text-fixer/shared";
import { getCharClass } from "./languageDetector.js";
import { LRM, RLM } from "./bidiFixer.js";

function dirFromCharClass(cc: ReturnType<typeof getCharClass>): Direction {
  switch (cc) {
    case "RTL":
      return "RTL";
    case "LTR":
      return "LTR";
    case "NUMBER":
      return "NUMBER";
    case "PUNCT":
      return "PUNCTUATION";
    case "SPACE":
      return "WHITESPACE";
    default:
      return "OTHER";
  }
}

export function tokenizeText(text: string): Token[] {
  const tokens: Token[] = [];
  let current: Token | undefined;
  let pendingMarkers = "";

  for (const ch of text) {
    // Keep bidi markers attached to adjacent strong tokens for idempotence.
    if (ch === LRM || ch === RLM) {
      if (current) current.value += ch;
      else pendingMarkers += ch;
      continue;
    }

    const dir = dirFromCharClass(getCharClass(ch));

    if (!current) {
      current = { value: pendingMarkers + ch, dir };
      pendingMarkers = "";
      continue;
    }

    // Keep whitespace separate (preserve exact spacing/newlines).
    if (current.dir === "WHITESPACE" || dir === "WHITESPACE") {
      tokens.push(current);
      current = { value: pendingMarkers + ch, dir };
      pendingMarkers = "";
      continue;
    }

    // Group consecutive chars of same direction.
    if (current.dir === dir) {
      current.value += ch;
      continue;
    }

    // Heuristic: attach common currency/percent punctuation to adjacent numbers
    // so `100$` or `$100` remain a single token.
    const isCurrencyOrPercent = ch === "$" || ch === "%" || ch === "€" || ch === "£";
    if (
      current.dir === "NUMBER" &&
      (dir === "PUNCTUATION" || dir === "OTHER") &&
      isCurrencyOrPercent
    ) {
      current.value += ch;
      continue;
    }
    if (
      (current.dir === "PUNCTUATION" || current.dir === "OTHER") &&
      current.value.length === 1 &&
      isCurrencyOrPercent &&
      dir === "NUMBER"
    ) {
      current.value += ch;
      current.dir = "NUMBER";
      continue;
    }

    tokens.push(current);
    current = { value: pendingMarkers + ch, dir };
    pendingMarkers = "";
  }

  if (pendingMarkers) {
    if (current) current.value += pendingMarkers;
    else tokens.push({ value: pendingMarkers, dir: "OTHER" });
  }
  if (current) tokens.push(current);
  return tokens;
}
