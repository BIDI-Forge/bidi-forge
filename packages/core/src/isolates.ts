/** Unicode bidirectional formatting characters. */
export const LRM = "\u200E";
export const RLM = "\u200F";
export const LRI = "\u2066";
export const RLI = "\u2067";
export const FSI = "\u2068";
export const PDI = "\u2069";

const ALL_MARKERS_RE = /[\u200E\u200F\u2066-\u2069]/g;

const LEGACY_EMBEDDING_RE = /[\u202A-\u202E]/g;

export function hasBidiMarkers(value: string): boolean {
  return ALL_MARKERS_RE.test(value);
}

export function hasLegacyEmbedding(value: string): boolean {
  return LEGACY_EMBEDDING_RE.test(value);
}

export function wrapLrm(value: string): string {
  if (value.length === 0) return value;
  if (value.startsWith(LRM) && value.endsWith(LRM)) return value;
  return `${LRM}${value}${LRM}`;
}

export function wrapRlm(value: string): string {
  if (value.length === 0) return value;
  if (value.startsWith(RLM) && value.endsWith(RLM)) return value;
  return `${RLM}${value}${RLM}`;
}

export function wrapIsolate(value: string, dir: "ltr" | "rtl"): string {
  if (value.length === 0) return value;
  const open = dir === "ltr" ? LRI : RLI;
  if (value.startsWith(open) && value.endsWith(PDI)) return value;
  if (value.startsWith(FSI) && value.endsWith(PDI)) return value;
  return `${open}${value}${PDI}`;
}

export function stripBidiMarkers(s: string): string {
  return s.replace(ALL_MARKERS_RE, "");
}

export function stripLegacyEmbedding(s: string): string {
  return s.replace(LEGACY_EMBEDDING_RE, "");
}
