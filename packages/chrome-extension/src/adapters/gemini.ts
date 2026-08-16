import { hostMatchesPattern } from "./hostUtils.js";
import type { SiteAdapter } from "./types.js";

export function isGeminiHost(hostname: string): boolean {
  return hostMatchesPattern(hostname, "gemini.google.com");
}

export function isGoogleAiHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    isGeminiHost(hostname) ||
    h.includes("bard.google") ||
    h === "ogs.google.com" ||
    h.endsWith(".ogs.google.com") ||
    h === "notebooklm.google.com" ||
    h === "aistudio.google.com" ||
    h === "labs.google.com"
  );
}

export const geminiAdapter: SiteAdapter = {
  id: "gemini",
  label: "Gemini",
  hostPatterns: ["gemini.google.com"],
  supportTier: "css-only",
  messageRootSelectors: [
    ".markdown",
    ".message-content",
    '[class*="model-response"]',
    '[class*="response-container"]',
    "message-content",
  ],
  composerShellSelector: ".ql-container, rich-textarea, .text-input-field",
  messageBubbleSelector: ".message-content, .markdown",
  matchesHost(hostname: string): boolean {
    return isGeminiHost(hostname);
  },
};
