import { matchesAnyHost } from "./hostUtils.js";
import type { SiteAdapter } from "./types.js";

export function isChatGptHost(hostname: string): boolean {
  return matchesAnyHost(hostname, ["chatgpt.com", "chat.openai.com", "openai.com"]);
}

export const chatgptAdapter: SiteAdapter = {
  id: "chatgpt",
  label: "ChatGPT",
  hostPatterns: ["chatgpt.com", "chat.openai.com", "openai.com"],
  supportTier: "css-only",
  messageRootSelectors: ["[data-message-author-role]"],
  composerShellSelector:
    '#prompt-textarea, form[data-type="unified-composer"], [data-testid="composer"], footer form, [class*="composer"]',
  messageBubbleSelector: "[data-message-author-role]",
  matchesHost(hostname: string): boolean {
    return isChatGptHost(hostname);
  },
};
