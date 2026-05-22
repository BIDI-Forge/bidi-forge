export type Direction = "RTL" | "LTR" | "NUMBER" | "PUNCTUATION" | "WHITESPACE" | "OTHER";

export type TokenKind = "normal" | "url" | "email" | "path" | "code";

export interface Token {
  value: string;
  dir: Direction;
  kind?: TokenKind;
}

export type ParagraphDirection = "rtl" | "ltr" | "neutral";

export type UiTextDirection = "rtl" | "ltr" | "auto";

export interface FixMixedTextOptions {
  /** `legacy` = v0.1 LRM-only; `enhanced` = isolates + atomic runs (default). */
  mode?: "legacy" | "enhanced";
  /** Strip existing bidi markers before re-applying (default true in enhanced). */
  stripExistingMarkers?: boolean;
}

export interface FormatUiTextOptions {
  baseDirection?: UiTextDirection;
}
