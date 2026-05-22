import { describe, expect, it } from "vitest";
import {
  fixMixedText,
  formatUiText,
  stripBidiMarkers,
  detectParagraphDirection,
  LRM,
  LRI,
  PDI,
} from "../index.js";

describe("fixMixedText", () => {
  it("wraps LTR segment between RTL words", () => {
    expect(fixMixedText("سلام hello دنیا")).toBe(`سلام ${LRM}hello${LRM} دنیا`);
  });

  it("wraps LTR segments in mixed sentence", () => {
    expect(fixMixedText("React در JS خیلی محبوب است")).toBe(
      `${LRM}React${LRM} در ${LRM}JS${LRM} خیلی محبوب است`,
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
