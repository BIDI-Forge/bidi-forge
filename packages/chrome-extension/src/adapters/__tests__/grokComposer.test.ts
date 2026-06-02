import { describe, expect, it } from "vitest";

import { isGrokLiveComposer } from "../../cssOnlyComposer.js";

describe("Grok composer (cssOnlyComposer)", () => {
  it("does not throw when checking composer on a non-Grok host", () => {
    const el = document.createElement("div");
    expect(() => isGrokLiveComposer("github.com", el)).not.toThrow();
    expect(isGrokLiveComposer("github.com", el)).toBe(false);
  });

  it("recognizes grok.com as a Grok surface", () => {
    const el = document.createElement("div");
    expect(isGrokLiveComposer("grok.com", el)).toBe(false);
  });
});
