import { describe, expect, it } from "vitest";

import {
  getMessageRootSelectors,
  getSupportTier,
  resolveAdapter,
} from "../registry.js";

describe("adapter registry", () => {
  it("resolves Claude", () => {
    expect(resolveAdapter("claude.ai")?.id).toBe("claude");
    expect(getSupportTier("claude.ai")).toBe("full");
  });

  it("resolves Copilot", () => {
    expect(resolveAdapter("copilot.microsoft.com")?.id).toBe("copilot");
    expect(getSupportTier("copilot.microsoft.com")).toBe("css-only");
  });

  it("resolves Perplexity", () => {
    expect(resolveAdapter("www.perplexity.ai")?.id).toBe("perplexity");
  });

  it("resolves DeepSeek chat host", () => {
    expect(resolveAdapter("chat.deepseek.com")?.id).toBe("deepseek");
  });

  it("resolves Grok on X /grok path only", () => {
    expect(resolveAdapter("x.com", "/home")).toBeNull();
    expect(resolveAdapter("x.com", "/i/grok")?.id).toBe("grok");
  });

  it("returns message roots for Copilot", () => {
    const roots = getMessageRootSelectors("copilot.microsoft.com");
    expect(roots.some((s) => s.includes("ai-message") || s.includes("chat-message"))).toBe(
      true,
    );
  });
});
