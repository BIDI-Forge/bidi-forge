export type Direction = "RTL" | "LTR" | "NUMBER" | "PUNCTUATION" | "WHITESPACE" | "OTHER";

export interface Token {
  value: string;
  dir: Direction;
}
