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
export { detectParagraphDirection, detectFirstStrongDirection, needsLeadingRlmForRtlParagraph } from "./detectDirection.js";
export { formatUiText } from "./formatUiText.js";
export { findAtomicLtrSpans } from "./runs.js";
export { iterateGraphemes } from "./segments.js";

import type { FixMixedTextOptions } from "@rtl-text-fixer/shared";
import { normalizeText } from "./normalize.js";
import { stripBidiMarkers } from "./isolates.js";
import { tokenizeNormalized } from "./tokenizer.js";
import { applyBidiMarkers } from "./bidiFixer.js";
import { detectParagraphDirection, needsLeadingRlmForRtlParagraph } from "./detectDirection.js";
import { RLM } from "./isolates.js";

export function fixMixedText(text: string, options?: FixMixedTextOptions): string {
  const mode = options?.mode ?? "enhanced";
  const stripMarkers =
    options?.stripExistingMarkers ?? (mode === "enhanced");

  const normalized = normalizeText(text);
  const prepared = stripMarkers ? stripBidiMarkers(normalized) : normalized;
  const tokens = tokenizeNormalized(prepared, false);
  const paragraphDirection = detectParagraphDirection(prepared);
  const fixed = applyBidiMarkers(tokens, {
    mode,
    stripExistingMarkers: stripMarkers,
    paragraphDirection,
  });
  let output = fixed.map((t) => t.value).join("");
  if (needsLeadingRlmForRtlParagraph(prepared, paragraphDirection) && !output.startsWith(RLM)) {
    output = RLM + output;
  }
  return output;
}
