import { matchesAnyHost } from "./hostUtils.js";
import type { SiteAdapter } from "./types.js";

export function isClaudeLikeHost(hostname: string): boolean {
  return matchesAnyHost(hostname, ["claude.ai", "anthropic.com"]);
}

export const claudeAdapter: SiteAdapter = {
  id: "claude",
  label: "Claude",
  hostPatterns: ["claude.ai", "anthropic.com"],
  supportTier: "full",
  messageRootSelectors: [
    '[data-testid="assistant-message"]',
    '[data-testid="user-message"]',
    ".standard-markdown",
    ".font-claude-message",
  ],
  composerShellSelector:
    'form, footer, [class*="composer"], [class*="Composer"], [data-testid*="composer"]',
  messageBubbleSelector: '[data-testid="assistant-message"], [data-testid="user-message"]',
  matchesHost(hostname: string): boolean {
    return isClaudeLikeHost(hostname);
  },
};
