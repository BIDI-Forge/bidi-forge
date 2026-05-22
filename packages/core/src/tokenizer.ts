import type { Token, Direction } from "@rtl-text-fixer/shared";
import { getCharClass } from "./languageDetector.js";
import { LRM, RLM, stripBidiMarkers } from "./isolates.js";
import { findAtomicLtrSpans, spanAt } from "./runs.js";
import { iterateGraphemes } from "./segments.js";

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

function isMarkerGrapheme(g: string): boolean {
  return g === LRM || g === RLM || /^[\u2066-\u2069]$/.test(g);
}

export function tokenizeText(text: string): Token[] {
  const atomicSpans = findAtomicLtrSpans(text);
  const tokens: Token[] = [];
  let current: Token | undefined;
  let pendingMarkers = "";
  let i = 0;

  while (i < text.length) {
    const atomic = spanAt(atomicSpans, i);
    if (atomic) {
      if (current) {
        tokens.push(current);
        current = undefined;
      }
      if (pendingMarkers) {
        tokens.push({ value: pendingMarkers, dir: "OTHER" });
        pendingMarkers = "";
      }
      tokens.push({
        value: atomic.value,
        dir: "LTR",
        kind: atomic.kind,
      });
      i = atomic.end;
      continue;
    }

    const graphemes = iterateGraphemes(text.slice(i));
    const g = graphemes[0] ?? "";
    const chLen = g.length;
    i += chLen;

    if (isMarkerGrapheme(g)) {
      if (current) current.value += g;
      else pendingMarkers += g;
      continue;
    }

    const dir = dirFromCharClass(getCharClass(g));

    if (!current) {
      current = { value: pendingMarkers + g, dir, kind: "normal" };
      pendingMarkers = "";
      continue;
    }

    if (current.dir === "WHITESPACE" || dir === "WHITESPACE") {
      tokens.push(current);
      current = { value: pendingMarkers + g, dir, kind: "normal" };
      pendingMarkers = "";
      continue;
    }

    if (current.dir === dir) {
      current.value += g;
      continue;
    }

    const isCurrencyOrPercent = g === "$" || g === "%" || g === "€" || g === "£";
    if (
      current.dir === "NUMBER" &&
      (dir === "PUNCTUATION" || dir === "OTHER") &&
      isCurrencyOrPercent
    ) {
      current.value += g;
      continue;
    }
    if (
      (current.dir === "PUNCTUATION" || current.dir === "OTHER") &&
      current.value.length === g.length &&
      isCurrencyOrPercent &&
      dir === "NUMBER"
    ) {
      current.value += g;
      current.dir = "NUMBER";
      continue;
    }

    tokens.push(current);
    current = { value: pendingMarkers + g, dir, kind: "normal" };
    pendingMarkers = "";
  }

  if (pendingMarkers) {
    if (current) current.value += pendingMarkers;
    else tokens.push({ value: pendingMarkers, dir: "OTHER", kind: "normal" });
  }
  if (current) tokens.push(current);
  return tokens;
}

/** Tokenize after stripping markers (for idempotent enhanced passes). */
export function tokenizeNormalized(text: string, stripMarkers = true): Token[] {
  const base = stripMarkers ? stripBidiMarkers(text) : text;
  return tokenizeText(base);
}
