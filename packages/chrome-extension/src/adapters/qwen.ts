import { matchesAnyHost } from "./hostUtils.js";
import type { SiteAdapter } from "./types.js";

export const qwenAdapter: SiteAdapter = {
  id: "qwen",
  label: "Qwen",
  hostPatterns: ["chat.qwen.ai", "qwenlm.ai"],
  supportTier: "generic",
  messageRootSelectors: [
    '[class*="message"]',
    ".markdown",
    '.ProseMirror:not([contenteditable="true"])',
  ],
  composerShellSelector: "form, [class*='composer'], textarea",
  messageBubbleSelector: '[class*="message"]',
  matchesHost(hostname: string): boolean {
    return matchesAnyHost(hostname, this.hostPatterns);
  },
};
