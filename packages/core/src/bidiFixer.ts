import type { Token, Direction, FixMixedTextOptions, ParagraphDirection } from "@rtl-text-fixer/shared";
import { hasBidiMarkers, wrapIsolate, wrapLrm, wrapRlm } from "./isolates.js";

export { LRM, RLM, LRI, RLI, FSI, PDI } from "./isolates.js";

function isStrongDir(dir: Direction): dir is "RTL" | "LTR" {
  return dir === "RTL" || dir === "LTR";
}

function findPrevStrong(tokens: Token[], idx: number): "RTL" | "LTR" | undefined {
  for (let i = idx - 1; i >= 0; i--) {
    const d = tokens[i]?.dir;
    if (d && isStrongDir(d)) return d;
  }
  return undefined;
}

function findNextStrong(tokens: Token[], idx: number): "RTL" | "LTR" | undefined {
  for (let i = idx + 1; i < tokens.length; i++) {
    const d = tokens[i]?.dir;
    if (d && isStrongDir(d)) return d;
  }
  return undefined;
}

function isAtomicLtrToken(t: Token): boolean {
  return t.kind === "url" || t.kind === "email" || t.kind === "path" || t.kind === "code";
}

function applyLegacyMarkers(tokens: Token[]): Token[] {
  return tokens.map((t, idx) => {
    if (t.dir !== "LTR") return t;
    if (hasBidiMarkers(t.value)) return t;

    const prev = findPrevStrong(tokens, idx);
    const next = findNextStrong(tokens, idx);
    const inRtlContext = prev === "RTL" || next === "RTL";
    if (!inRtlContext) return t;

    return { ...t, value: wrapLrm(t.value) };
  });
}

function applyEnhancedMarkers(
  tokens: Token[],
  paragraphDirection: ParagraphDirection,
): Token[] {
  const wrapRtlInLtrParagraph = paragraphDirection === "ltr";

  return tokens.map((t, idx) => {
    if (hasBidiMarkers(t.value) && !isAtomicLtrToken(t)) return t;

    const prev = findPrevStrong(tokens, idx);
    const next = findNextStrong(tokens, idx);
    const inRtlContext = prev === "RTL" || next === "RTL";
    const inLtrContext = prev === "LTR" || next === "LTR";

    if (isAtomicLtrToken(t)) {
      if (inRtlContext || paragraphDirection === "rtl") {
        return { ...t, value: wrapIsolate(t.value, "ltr") };
      }
      return t;
    }

    if (t.dir === "LTR") {
      if (!inRtlContext) return t;
      return { ...t, value: wrapLrm(t.value) };
    }

    if (t.dir === "RTL") {
      if (!wrapRtlInLtrParagraph || !inLtrContext) return t;
      if (hasBidiMarkers(t.value)) return t;
      return { ...t, value: wrapRlm(t.value) };
    }

    if (t.dir === "NUMBER") {
      const hasRtlNeighbor = inRtlContext && !inLtrContext;
      const hasLtrNeighbor = inLtrContext && !inRtlContext;
      if (hasRtlNeighbor && /[0-9]/.test(t.value)) {
        return { ...t, value: wrapLrm(t.value) };
      }
      if (hasLtrNeighbor && /[\u06F0-\u06F9\u0660-\u0669]/.test(t.value)) {
        return { ...t, value: wrapRlm(t.value) };
      }
    }

    return t;
  });
}

/**
 * Inserts Unicode bidi markers around strong-direction tokens when surrounded by opposite-direction context.
 */
export interface ApplyBidiMarkersOptions extends FixMixedTextOptions {
  paragraphDirection?: ParagraphDirection;
}

export function applyBidiMarkers(
  tokens: Token[],
  options?: ApplyBidiMarkersOptions,
): Token[] {
  const mode = options?.mode ?? "enhanced";
  if (mode === "legacy") return applyLegacyMarkers(tokens);
  const paragraphDirection = options?.paragraphDirection ?? "neutral";
  return applyEnhancedMarkers(tokens, paragraphDirection);
}
