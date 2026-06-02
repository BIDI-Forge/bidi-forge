import { matchesAnyHost } from "./hostUtils.js";
import type { SiteAdapter } from "./types.js";

export function isPerplexityHost(hostname: string): boolean {
  return matchesAnyHost(hostname, ["perplexity.ai"]);
}

export const perplexityAdapter: SiteAdapter = {
  id: "perplexity",
  label: "Perplexity",
  hostPatterns: ["perplexity.ai"],
  supportTier: "css-only",
  messageRootSelectors: [
    '[class*="prose"]',
    '[class*="answer"]',
    '[data-testid*="answer"]',
    '[class*="markdown"]',
    "main article",
  ],
  composerShellSelector:
    'textarea, [contenteditable="true"], form, [class*="composer"], [class*="input"]',
  messageBubbleSelector: '[class*="answer"], main article, [data-testid*="answer"]',
  matchesHost(hostname: string): boolean {
    return isPerplexityHost(hostname);
  },
};
