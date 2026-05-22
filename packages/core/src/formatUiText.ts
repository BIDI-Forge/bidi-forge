import type { FormatUiTextOptions, ParagraphDirection } from "@rtl-text-fixer/shared";
import { detectParagraphDirection } from "./detectDirection.js";
import { tokenizeNormalized } from "./tokenizer.js";
import { applyBidiMarkers } from "./bidiFixer.js";
import { normalizeText } from "./normalize.js";
import { stripBidiMarkers } from "./isolates.js";

function resolveBaseDirection(
  text: string,
  option: FormatUiTextOptions["baseDirection"],
): ParagraphDirection {
  if (option === "rtl" || option === "ltr") return option;
  return detectParagraphDirection(text);
}

/**
 * Format extension-owned UI strings (notifications, status bar) for stable mixed-script display.
 */
export function formatUiText(text: string, options?: FormatUiTextOptions): string {
  const normalized = normalizeText(text);
  const stripped = stripBidiMarkers(normalized);
  const base = resolveBaseDirection(stripped, options?.baseDirection ?? "auto");

  if (base === "neutral") return stripped;

  const tokens = tokenizeNormalized(stripped, false);
  const fixed = applyBidiMarkers(tokens, {
    mode: "enhanced",
    stripExistingMarkers: false,
    paragraphDirection: base,
  });

  return fixed.map((t) => t.value).join("");
}
