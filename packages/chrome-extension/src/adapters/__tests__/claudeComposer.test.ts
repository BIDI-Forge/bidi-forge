import { describe, expect, it } from "vitest";

import { isClaudeLikeHost } from "../claude.js";
import {
  isCssOnlyComposer,
  isCssOnlySurface,
  isInsideCssOnlyComposer,
} from "../../cssOnlyComposer.js";

describe("Claude composer strategy", () => {
  it("uses CSS-only while typing and guards composer from marker spam", () => {
    const prose = document.createElement("div");
    prose.className = "ProseMirror";
    prose.setAttribute("contenteditable", "true");
    document.body.append(prose);

    expect(isClaudeLikeHost("claude.ai")).toBe(true);
    expect(isCssOnlySurface("claude.ai")).toBe(false);
    expect(isCssOnlyComposer("claude.ai", prose)).toBe(true);
    expect(isInsideCssOnlyComposer(prose, "claude.ai")).toBe(true);

    prose.remove();
  });
});
