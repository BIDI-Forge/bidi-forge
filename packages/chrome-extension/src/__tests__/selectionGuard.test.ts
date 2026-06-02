import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { isUserTextSelecting, shouldPauseComposerDomFix } from "../selectionGuard.js";

describe("selectionGuard", () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    host = document.createElement("div");
    host.setAttribute("contenteditable", "true");
    host.textContent = "hello world";
    document.body.append(host);
  });

  afterEach(() => {
    window.getSelection()?.removeAllRanges();
    host.remove();
  });

  it("returns false for collapsed caret", () => {
    const sel = window.getSelection()!;
    const range = document.createRange();
    range.setStart(host.firstChild!, 2);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    expect(isUserTextSelecting()).toBe(false);
    expect(shouldPauseComposerDomFix()).toBe(false);
  });

  it("returns true for non-collapsed selection in composer", () => {
    const sel = window.getSelection()!;
    const range = document.createRange();
    range.setStart(host.firstChild!, 0);
    range.setEnd(host.firstChild!, 5);
    sel.removeAllRanges();
    sel.addRange(range);
    expect(isUserTextSelecting()).toBe(true);
    expect(shouldPauseComposerDomFix()).toBe(true);
  });
});
