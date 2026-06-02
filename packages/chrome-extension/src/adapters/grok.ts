import { hostMatchesPattern, matchesAnyHost } from "./hostUtils.js";
import type { SiteAdapter } from "./types.js";

export function isGrokHost(hostname: string): boolean {
  return matchesAnyHost(hostname, ["grok.com", "grok.x.com", "x.ai"]);
}

function isXHost(hostname: string): boolean {
  return matchesAnyHost(hostname, ["x.com", "twitter.com"]);
}

export function isGrokSurface(hostname: string, pathname = ""): boolean {
  if (isGrokHost(hostname)) return true;
  if (!isXHost(hostname)) return false;
  return pathname.toLowerCase().includes("/grok");
}

export const grokAdapter: SiteAdapter = {
  id: "grok",
  label: "Grok",
  hostPatterns: ["grok.com", "grok.x.com", "x.ai", "x.com", "twitter.com"],
  supportTier: "css-only",
  messageRootSelectors: [
    '[data-testid*="message"]',
    '[class*="message-content"]',
    '[class*="response"]',
  ],
  composerShellSelector:
    '[class*="composer"], [class*="Composer"], [data-testid*="composer"], form, [role="textbox"][contenteditable]',
  messageBubbleSelector:
    '[data-testid*="message"], article[role="article"], [class*="message-bubble"]',
  matchesHost(hostname: string, pathname = ""): boolean {
    return isGrokSurface(hostname, pathname);
  },
};
