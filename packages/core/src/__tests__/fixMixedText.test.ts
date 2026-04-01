import { describe, expect, it } from "vitest";
import { fixMixedText, LRM } from "../index.js";

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
    // We guarantee stable output, not a particular marker placement on numbers for v0.1.
    const input = "price برابر است با 100$";
    const output = fixMixedText(input);
    expect(output).toContain(`${LRM}price${LRM}`);
    expect(fixMixedText(output)).toBe(output);
  });
});
