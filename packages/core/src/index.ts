export { detectLanguage, getCharClass } from "./languageDetector.js";
export { tokenizeText, tokenizeNormalized } from "./tokenizer.js";
export {
  applyBidiMarkers,
  LRM,
  RLM,
  LRI,
  RLI,
  FSI,
  PDI,
} from "./bidiFixer.js";
export { normalizeText } from "./normalize.js";
export { stripBidiMarkers, wrapIsolate, wrapLrm, wrapRlm, hasBidiMarkers } from "./isolates.js";
export {
  detectParagraphDirection,
  detectFirstStrongDirection,
  needsLeadingRlmForRtlParagraph,
  needsLeadingLrmForLtrMixedParagraph,
  isEnglishFirstMixedLine,
  leadingBidiMarkerFor,
  hasWeakLeadingRun,
  maskAtomicLtrSpans,
  hasRtlStrong,
  hasLtrStrong,
} from "./detectDirection.js";
export { formatUiText } from "./formatUiText.js";
export { findAtomicLtrSpans } from "./runs.js";
export { iterateGraphemes } from "./segments.js";

import type { FixMixedTextOptions } from "@rtl-text-fixer/shared";
import { normalizeText } from "./normalize.js";
import { stripBidiMarkers } from "./isolates.js";
import { tokenizeNormalized } from "./tokenizer.js";
import { applyBidiMarkers } from "./bidiFixer.js";
import { detectParagraphDirection, leadingBidiMarkerFor } from "./detectDirection.js";

const LINE_SPLIT_RE = /(\r\n|\n|\r)/;
const CODE_FENCE_RE = /^\s{0,3}(?:```|~~~)/;

/** One rendered line = one BiDi paragraph, so direction is resolved per line. */
function fixLine(line: string, mode: "legacy" | "enhanced", stripMarkers: boolean): string {
  if (!line) return line;

  const tokens = tokenizeNormalized(line, false);
  const paragraphDirection = detectParagraphDirection(line);
  const fixed = applyBidiMarkers(tokens, {
    mode,
    stripExistingMarkers: stripMarkers,
    paragraphDirection,
  });

  const output = fixed.map((t) => t.value).join("");
  if (mode === "legacy") return output;

  const leading = leadingBidiMarkerFor(line, paragraphDirection);
  if (!leading || output.startsWith(leading)) return output;
  return leading + output;
}

export function fixMixedText(text: string, options?: FixMixedTextOptions): string {
  const mode = options?.mode ?? "enhanced";
  const stripMarkers =
    options?.stripExistingMarkers ?? (mode === "enhanced");

  const normalized = normalizeText(text);
  const prepared = stripMarkers ? stripBidiMarkers(normalized) : normalized;

  let inFence = false;
  return prepared
    .split(LINE_SPLIT_RE)
    .map((part, i) => {
      // Odd indices are the captured line separators.
      if (i % 2 === 1) return part;
      if (CODE_FENCE_RE.test(part)) {
        inFence = !inFence;
        return part;
      }
      if (inFence) return part;
      return fixLine(part, mode, stripMarkers);
    })
    .join("");
}
