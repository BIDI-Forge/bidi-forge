import { describe, expect, it } from "vitest";
import {
  fixMixedText,
  formatUiText,
  stripBidiMarkers,
  detectParagraphDirection,
  detectFirstStrongDirection,
  needsLeadingRlmForRtlParagraph,
  needsLeadingLrmForLtrMixedParagraph,
  LRM,
  RLM,
  LRI,
  PDI,
} from "../index.js";

describe("fixMixedText", () => {
  it("wraps LTR segment between RTL words", () => {
    expect(fixMixedText("سلام hello دنیا")).toBe(`سلام ${LRM}hello${LRM} دنیا`);
  });

  it("wraps LTR segments in mixed sentence and pins the RTL base direction", () => {
    // Leading RLM: without it `dir=auto` anchors on "React" and flips the Persian sentence to LTR.
    expect(fixMixedText("React در JS خیلی محبوب است")).toBe(
      `${RLM}${LRM}React${LRM} در ${LRM}JS${LRM} خیلی محبوب است`,
    );
  });

  it("keeps whitespace and newlines intact", () => {
    const input = "سلام  hello\nدنیا";
    const output = fixMixedText(input);
    expect(output).toBe(`سلام  ${LRM}hello${LRM}\nدنیا`);
  });

  it("is idempotent", () => {
    const input = "سلام hello دنیا";
    const once = fixMixedText(input);
    const twice = fixMixedText(once);
    expect(twice).toBe(once);
  });

  it("handles numbers and currency next to RTL context", () => {
    const input = "price برابر است با 100$";
    const output = fixMixedText(input);
    expect(output).toContain(`${LRM}price${LRM}`);
    expect(fixMixedText(output)).toBe(output);
  });

  it("isolates URLs in RTL context", () => {
    const input = "لینک: https://example.com/path است";
    const output = fixMixedText(input);
    expect(output).toContain(`${LRI}https://example.com/path${PDI}`);
    expect(fixMixedText(output)).toBe(output);
  });

  it("isolates backtick code in RTL context", () => {
    const input = "از `fixMixedText()` استفاده کنید";
    const output = fixMixedText(input);
    expect(output).toContain(`${LRI}\`fixMixedText()\`${PDI}`);
  });

  it("preserves legacy mode output", () => {
    const input = "سلام hello دنیا";
    expect(fixMixedText(input, { mode: "legacy" })).toBe(`سلام ${LRM}hello${LRM} دنیا`);
  });

  it("prepends RLM when RTL text follows emoji or list numbers", () => {
    const listLine = "1. سلام hello";
    expect(detectFirstStrongDirection(listLine)).toBe("rtl");
    expect(needsLeadingRlmForRtlParagraph(listLine, detectParagraphDirection(listLine))).toBe(true);
    expect(fixMixedText(listLine).startsWith(RLM)).toBe(true);

    const emojiLine = "😀 سلام hello";
    expect(detectFirstStrongDirection(emojiLine)).toBe("rtl");
    expect(needsLeadingRlmForRtlParagraph(emojiLine, detectParagraphDirection(emojiLine))).toBe(true);
    expect(fixMixedText(emojiLine).startsWith(RLM)).toBe(true);
  });

  it("does not prepend RLM for English-first mixed lines", () => {
    const output = fixMixedText("hello سلام");
    expect(output.startsWith(RLM)).toBe(false);
    expect(output).toContain(`${RLM}سلام${RLM}`);
  });

  it("wraps Persian in English-first sentences", () => {
    const input = "Hello, how are you? من خوبم.";
    const output = fixMixedText(input);
    expect(output.startsWith(RLM)).toBe(false);
    expect(stripBidiMarkers(output)).toBe(input);
    expect(output).toContain(RLM);
    expect(output).toMatch(/\u200fمن\u200f/);
  });

  it("treats English-first mixed lines as LTR even when Persian has more letters", () => {
    expect(detectParagraphDirection("hello سلام")).toBe("ltr");
    expect(detectParagraphDirection("42. Hello من خوبم")).toBe("ltr");
    expect(detectParagraphDirection("React در JS خیلی محبوب است")).toBe("rtl");
    const output = fixMixedText("test سلام");
    expect(output).toContain(`${RLM}سلام${RLM}`);
  });

  it("prepends LRM for emoji, list, or number prefix then English then Persian", () => {
    const cases = [
      "😀 Hello سلام",
      "1. Hello سلام",
      "- Hello سلام",
      "• Hello سلام",
      "42. Hello من خوبم",
      "۱. Hello سلام",
    ];

    for (const input of cases) {
      expect(detectParagraphDirection(input)).toBe("ltr");
      expect(needsLeadingLrmForLtrMixedParagraph(input, "ltr")).toBe(true);
      const output = fixMixedText(input);
      expect(output.startsWith(LRM), `expected leading LRM for ${input}`).toBe(true);
      expect(stripBidiMarkers(output)).toBe(input);
      expect(output).toMatch(/\u200f[\u0600-\u06FF]/);
    }
  });

  it("still prepends RLM for RTL-first lines with weak leading", () => {
    const input = "1. سلام hello";
    expect(detectParagraphDirection(input)).toBe("rtl");
    expect(fixMixedText(input).startsWith(RLM)).toBe(true);
    expect(stripBidiMarkers(fixMixedText(input))).toBe(input);
  });

  it("pins RTL lines that open with code, a bullet, a number, or an English term", () => {
    const cases = [
      "`useState` را در React استفاده کنید",
      "1. `npm install` را اجرا کنید",
      "- `useState` را صدا بزن",
      "• نکته مهم درباره React است",
      "(توضیح) React خوب است",
      "React در JS خیلی محبوب است",
      "https://example.com را باز کن و ادامه بده",
    ];

    for (const input of cases) {
      expect(detectParagraphDirection(input), input).toBe("rtl");
      const output = fixMixedText(input);
      expect(output.startsWith(RLM), `expected leading RLM for ${input}`).toBe(true);
      expect(stripBidiMarkers(output)).toBe(input);
      expect(fixMixedText(output)).toBe(output);
    }
  });

  it("never marks lines that have no RTL text", () => {
    for (const input of ["1. Deploy to prod", "Hello world", "- run `npm test`"]) {
      expect(fixMixedText(input), input).toBe(input);
    }
  });

  it("resolves direction per line instead of per block", () => {
    const input = "Here is the plan:\n1. Deploy to prod\n2. بررسی لاگ‌ها";
    const output = fixMixedText(input);
    const lines = output.split("\n");

    expect(lines[0]).toBe("Here is the plan:");
    expect(lines[1]).toBe("1. Deploy to prod");
    expect(lines[2]!.startsWith(RLM)).toBe(true);
    expect(stripBidiMarkers(output)).toBe(input);
    expect(fixMixedText(output)).toBe(output);
  });

  it("leaves fenced code blocks untouched", () => {
    const input = "توضیح کد:\n```ts\nconst first = 1; // مقدار\n```\nپایان توضیح";
    const output = fixMixedText(input);

    expect(output).toContain("\nconst first = 1; // مقدار\n");
    expect(stripBidiMarkers(output)).toBe(input);
    expect(fixMixedText(output)).toBe(output);
  });

  it("classifies Persian list digits as numbers not RTL letters", () => {
    expect(detectFirstStrongDirection("۱. Hello سلام")).toBe("ltr");
    expect(detectParagraphDirection("۱. Hello سلام")).toBe("ltr");
  });
});

describe("stripBidiMarkers", () => {
  it("removes LRM, RLM, and isolates", () => {
    const marked = `${LRM}hello${LRM}`;
    expect(stripBidiMarkers(marked)).toBe("hello");
  });
});

describe("detectParagraphDirection", () => {
  it("detects RTL for Persian text", () => {
    expect(detectParagraphDirection("سلام دنیا")).toBe("rtl");
  });

  it("detects LTR for English text", () => {
    expect(detectParagraphDirection("Hello world")).toBe("ltr");
  });

  it("returns neutral for empty punctuation-only", () => {
    expect(detectParagraphDirection("...")).toBe("neutral");
  });
});

describe("formatUiText", () => {
  it("formats mixed Persian and English for RTL UI", () => {
    const input = "RTL Fixer: متن کلیپ‌بورد اصلاح شد.";
    const out = formatUiText(input, { baseDirection: "rtl" });
    expect(out).toContain("RTL");
    expect(out).toContain("Fixer");
    expect(out.length).toBeGreaterThan(input.length - 5);
  });

  it("is idempotent when applied twice", () => {
    const input = "هشدار: be5invis.vscode-custom-css نصب نیست";
    const once = formatUiText(input, { baseDirection: "rtl" });
    const twice = formatUiText(once, { baseDirection: "rtl" });
    expect(twice).toBe(once);
  });
});
