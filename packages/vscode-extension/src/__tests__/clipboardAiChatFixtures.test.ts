import { describe, expect, it } from "vitest";
import { fixMixedText, stripBidiMarkers } from "@bidi-forge/core";
import { AI_CHAT_PASTE_SAMPLES } from "../../../core/src/fixtures/aiChatPasteSamples.js";

/** Mirrors rtlFixer.fixClipboardText: fix only when output differs. */
function fixClipboardLike(text: string): string | null {
  const fixed = fixMixedText(text);
  return fixed === text ? null : fixed;
}

describe("clipboard workflow (AI chat paste fixtures)", () => {
  for (const { name, text } of AI_CHAT_PASTE_SAMPLES) {
    it(`preserves visible text when clipboard fix applies: ${name}`, () => {
      const fixed = fixClipboardLike(text);
      if (fixed === null) return;
      expect(stripBidiMarkers(fixed)).toBe(text);
      expect(fixMixedText(fixed)).toBe(fixed);
    });
  }
});
