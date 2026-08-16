import { describe, expect, it } from "vitest";
import { fixMixedText, hasBidiMarkers, stripBidiMarkers, LRI, PDI, LRM } from "../index.js";

describe("hasBidiMarkers", () => {
  it("gives the same answer on repeated calls", () => {
    const value = `${LRM}React${LRM}`;
    expect([1, 2, 3, 4].map(() => hasBidiMarkers(value))).toEqual([true, true, true, true]);
  });
});

describe("bidi edge cases (URLs, emails, emoji)", () => {
  it("isolates email in RTL sentence", () => {
    const input = "ایمیل: user@example.com تماس";
    const output = fixMixedText(input);
    expect(output).toContain(`${LRI}user@example.com${PDI}`);
    expect(stripBidiMarkers(output)).toBe(input);
    expect(fixMixedText(output)).toBe(output);
  });

  it("isolates URL after emoji in RTL context", () => {
    const input = "😀 لینک https://example.com/path است";
    const output = fixMixedText(input);
    expect(output).toContain(`${LRI}https://example.com/path${PDI}`);
    expect(stripBidiMarkers(output)).toBe(input);
  });

  it("handles multiple atomic LTR spans in one RTL line", () => {
    const input = "ببین user@test.com و https://a.com و `code()`";
    const output = fixMixedText(input);
    expect(output).toContain(`${LRI}user@test.com${PDI}`);
    expect(output).toContain(`${LRI}https://a.com${PDI}`);
    expect(stripBidiMarkers(output)).toBe(input);
  });

  it("keeps Persian digits in numbers with English words", () => {
    const input = "قیمت ۱۲۳۴ تومان و SKU ABC-99";
    const output = fixMixedText(input);
    expect(output).toContain(`${LRM}SKU${LRM}`);
    expect(stripBidiMarkers(output)).toBe(input);
    expect(fixMixedText(output)).toBe(output);
  });
});
