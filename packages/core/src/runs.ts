import type { TokenKind } from "@rtl-text-fixer/shared";

export interface AtomicLtrSpan {
  start: number;
  end: number;
  kind: TokenKind;
  value: string;
}

interface SpanPattern {
  kind: TokenKind;
  re: RegExp;
}

const PATTERNS: SpanPattern[] = [
  { kind: "url", re: /https?:\/\/[^\s<>"')\]]+/gi },
  { kind: "email", re: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  {
    kind: "path",
    re: /(?:[A-Za-z]:\\(?:[^\s\\]+\\)*[^\s\\]+|\/(?:[\w.-]+\/)+[\w.-]+)/g,
  },
  { kind: "code", re: /`[^`\n]+`/g },
];

function overlaps(a: AtomicLtrSpan, b: AtomicLtrSpan): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Find URL/email/path/code spans that should be isolated as atomic LTR runs.
 */
export function findAtomicLtrSpans(text: string): AtomicLtrSpan[] {
  const found: AtomicLtrSpan[] = [];

  for (const { kind, re } of PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const value = m[0];
      if (value.length === 0) continue;
      found.push({ start: m.index, end: m.index + value.length, kind, value });
    }
  }

  found.sort((a, b) => a.start - b.start || b.end - a.end - (a.end - a.start));

  const merged: AtomicLtrSpan[] = [];
  for (const span of found) {
    if (merged.some((s) => overlaps(s, span))) continue;
    merged.push(span);
  }

  return merged.sort((a, b) => a.start - b.start);
}

export function spanAt(
  spans: AtomicLtrSpan[],
  index: number,
): AtomicLtrSpan | undefined {
  return spans.find((s) => index >= s.start && index < s.end);
}
