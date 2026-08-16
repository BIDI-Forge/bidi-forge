import { afterEach, describe, expect, it, vi } from "vitest";

import { tryFixMixedBlockCoalesced } from "../../blockFix.js";
import { isClaudeLikeHost } from "../claude.js";
import {
  applyComposerMarkersOnBlur,
  hintClaudeComposerOnce,
  isCssOnlyComposer,
  isCssOnlySurface,
  isInClaudeLiveComposer,
  isInsideCssOnlyComposer,
  maintainClaudeComposerEditor,
} from "../../cssOnlyComposer.js";

describe("Claude composer strategy", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses CSS-only while typing and guards composer from marker spam", () => {
    vi.stubGlobal("location", { hostname: "claude.ai", pathname: "/" });
    const prose = document.createElement("div");
    prose.className = "tiptap ProseMirror";
    prose.setAttribute("contenteditable", "true");
    prose.setAttribute("role", "textbox");
    prose.setAttribute("data-testid", "chat-input");
    document.body.append(prose);

    expect(isClaudeLikeHost("claude.ai")).toBe(true);
    expect(isCssOnlySurface("claude.ai")).toBe(false);
    expect(isCssOnlyComposer("claude.ai", prose)).toBe(true);
    expect(isInsideCssOnlyComposer(prose, "claude.ai")).toBe(true);
    expect(isInClaudeLiveComposer(prose, "claude.ai")).toBe(true);
    expect(applyComposerMarkersOnBlur("claude.ai")).toBe(false);

    const para = document.createElement("p");
    para.textContent = "اساساتست hshs";
    prose.append(para);
    const sel = document.getSelection()!;
    const range = document.createRange();
    range.setStart(para.firstChild!, para.firstChild!.nodeValue!.length);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

    hintClaudeComposerOnce(prose);
    expect(prose.getAttribute("dir")).toBe("auto");
    expect(prose.style.getPropertyValue("unicode-bidi")).toBe("plaintext");
    expect(prose.style.getPropertyPriority("unicode-bidi")).not.toBe("important");

    // Paragraphs are styled by content.css through this class; writing attributes on inner
    // ProseMirror nodes makes it redraw them and drop the hint.
    expect(prose.classList.contains("bf-composer")).toBe(true);
    expect(para.getAttribute("dir")).toBeNull();
    expect(para.getAttribute("style")).toBeNull();

    expect(para.closest('[data-testid="chat-input"]')).toBe(prose);
    expect(isInClaudeLiveComposer(para, "claude.ai")).toBe(true);
    expect(tryFixMixedBlockCoalesced(para)).toBe(false);
    expect(para.textContent).toBe("اساساتست hshs");
    expect(para.textContent).not.toMatch(/[\u200E\u200F]/);

    maintainClaudeComposerEditor(prose);
    expect(para.textContent).toBe("اساساتست hshs");

    prose.remove();
  });
});
