import type { Token, Direction } from "@rtl-text-fixer/shared";

export const LRM = "\u200E";
export const RLM = "\u200F";

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

function hasBidiMarkers(value: string): boolean {
  return value.includes(LRM) || value.includes(RLM);
}

function wrapIfNeeded(value: string, marker: string): string {
  if (value.length === 0) return value;
  // Avoid double-wrapping already-marked strings; keep idempotent.
  if (value.startsWith(marker) && value.endsWith(marker)) return value;
  return `${marker}${value}${marker}`;
}

/**
 * Inserts Unicode bidi markers around strong-direction tokens when surrounded by opposite-direction context.
 * Returns tokens with updated `value` fields (directions unchanged).
 */
export function applyBidiMarkers(tokens: Token[]): Token[] {
  return tokens.map((t, idx) => {
    // v0.1 behavior: wrap only LTR runs when they appear in RTL context,
    // matching the expected example outputs.
    if (t.dir !== "LTR") return t;
    if (hasBidiMarkers(t.value)) return t;

    const prev = findPrevStrong(tokens, idx);
    const next = findNextStrong(tokens, idx);

    const inRtlContext = prev === "RTL" || next === "RTL";
    if (!inRtlContext) return t;

    return { ...t, value: wrapIfNeeded(t.value, LRM) };
  });
}
