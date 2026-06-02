import type { SiteAdapter } from "./types.js";

const GENERIC_READONLY_PROSE = '.ProseMirror:not([contenteditable="true"])';

export const genericAdapter: SiteAdapter = {
  id: "generic",
  label: "Generic",
  hostPatterns: [],
  supportTier: "generic",
  messageRootSelectors: [GENERIC_READONLY_PROSE],
  composerShellSelector: "form, footer, [class*='composer']",
  messageBubbleSelector: '[data-testid*="message"], article',
  matchesHost: () => false,
};

export { GENERIC_READONLY_PROSE };
