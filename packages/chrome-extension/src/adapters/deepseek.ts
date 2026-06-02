import { matchesAnyHost } from "./hostUtils.js";
import type { SiteAdapter } from "./types.js";

export function isDeepSeekHost(hostname: string): boolean {
  return matchesAnyHost(hostname, ["deepseek.com", "chat.deepseek.com"]);
}

export const deepseekAdapter: SiteAdapter = {
  id: "deepseek",
  label: "DeepSeek",
  hostPatterns: ["deepseek.com", "chat.deepseek.com"],
  supportTier: "css-only",
  messageRootSelectors: [
    '[class*="message"]',
    '[class*="markdown"]',
    ".ds-markdown",
    '[data-role="assistant"]',
    '[data-role="user"]',
  ],
  composerShellSelector:
    'textarea, [contenteditable="true"], form, footer, [class*="composer"], [class*="input"]',
  messageBubbleSelector: '[data-role="assistant"], [data-role="user"], [class*="message"]',
  matchesHost(hostname: string): boolean {
    return isDeepSeekHost(hostname);
  },
};
