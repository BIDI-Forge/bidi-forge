import { matchesAnyHost } from "./hostUtils.js";
import type { SiteAdapter } from "./types.js";

export function isCopilotHost(hostname: string, pathname = ""): boolean {
  const h = hostname.toLowerCase();
  if (matchesAnyHost(hostname, ["copilot.microsoft.com", "copilot.cloud.microsoft", "m365.cloud.microsoft", "bing.com"])) {
    return true;
  }
  return h.includes("copilot") && (h.endsWith(".microsoft.com") || h.endsWith(".microsoftonline.com"));
}

export const copilotAdapter: SiteAdapter = {
  id: "copilot",
  label: "Copilot",
  hostPatterns: [
    "copilot.microsoft.com",
    "copilot.cloud.microsoft",
    "m365.cloud.microsoft",
    "bing.com",
  ],
  supportTier: "css-only",
  messageRootSelectors: [
    '[data-content="ai-message"]',
    '[data-testid="chat-message"]',
    ".ac-textBlock",
    '[class*="message-item"]',
    '[class*="response-message"]',
    '[role="article"]',
  ],
  composerShellSelector:
    '#userInput, [data-testid="composer"], form, footer, [class*="composer"], [class*="input-area"]',
  messageBubbleSelector:
    '[data-content="ai-message"], [data-testid="chat-message"], [role="article"]',
  matchesHost(hostname: string, pathname = ""): boolean {
    return isCopilotHost(hostname, pathname);
  },
};
