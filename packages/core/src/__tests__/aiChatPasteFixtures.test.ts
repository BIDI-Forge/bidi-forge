import { describe, expect, it } from "vitest";
import { fixMixedText, stripBidiMarkers } from "../index.js";
import { AI_CHAT_PASTE_SAMPLES } from "../fixtures/aiChatPasteSamples.js";

describe("AI chat paste fixtures", () => {
  for (const { name, text } of AI_CHAT_PASTE_SAMPLES) {
    it(`is idempotent and preserves visible text: ${name}`, () => {
      const once = fixMixedText(text);
      const twice = fixMixedText(once);
      expect(twice).toBe(once);
      expect(stripBidiMarkers(once)).toBe(text);
    });
  }
});
