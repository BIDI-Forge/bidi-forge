import { describe, expect, it } from "vitest";

import { isClaudeLikeHost } from "../claude.js";
import {
  isCssOnlyComposer,
  isCssOnlySurface,
  isInsideCssOnlyComposer,
} from "../../cssOnlyComposer.js";

describe("Claude composer strategy", () => {
  it("uses full marker fix path, not CSS-only surface", () => {
    expect(isClaudeLikeHost("claude.ai")).toBe(true);
    expect(isCssOnlySurface("claude.ai")).toBe(false);
    expect(isCssOnlyComposer("claude.ai", document.createElement("div"))).toBe(false);
    expect(isInsideCssOnlyComposer(document.createElement("p"), "claude.ai")).toBe(false);
  });
});
