export { detectLanguage, getCharClass } from "./languageDetector.js";
export { tokenizeText } from "./tokenizer.js";
export { applyBidiMarkers, LRM, RLM } from "./bidiFixer.js";

import { tokenizeText } from "./tokenizer.js";
import { applyBidiMarkers } from "./bidiFixer.js";

export function fixMixedText(text: string): string {
  const tokens = tokenizeText(text);
  const fixed = applyBidiMarkers(tokens);
  return fixed.map((t) => t.value).join("");
}
