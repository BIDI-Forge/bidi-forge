import { chatgptAdapter } from "./chatgpt.js";
import { claudeAdapter } from "./claude.js";
import { copilotAdapter } from "./copilot.js";
import { deepseekAdapter } from "./deepseek.js";
import { geminiAdapter } from "./gemini.js";
import { genericAdapter, GENERIC_READONLY_PROSE } from "./generic.js";
import { grokAdapter } from "./grok.js";
import { perplexityAdapter } from "./perplexity.js";
import { qwenAdapter } from "./qwen.js";
import type { SiteAdapter, SupportTier } from "./types.js";

/** Order matters: more specific adapters before generic fallbacks. */
export const SITE_ADAPTERS: readonly SiteAdapter[] = [
  claudeAdapter,
  chatgptAdapter,
  geminiAdapter,
  grokAdapter,
  copilotAdapter,
  perplexityAdapter,
  deepseekAdapter,
  qwenAdapter,
];

export function resolveAdapter(hostname: string, pathname = ""): SiteAdapter | null {
  for (const adapter of SITE_ADAPTERS) {
    if (adapter.matchesHost(hostname, pathname)) return adapter;
  }
  return null;
}

export function getSupportTier(hostname: string, pathname = ""): SupportTier {
  const adapter = resolveAdapter(hostname, pathname);
  return adapter?.supportTier ?? "generic";
}

export function getMessageRootSelectors(hostname: string, pathname = ""): string[] {
  const adapter = resolveAdapter(hostname, pathname);
  const roots = adapter?.messageRootSelectors ?? [];
  if (adapter && adapter.supportTier !== "generic") {
    return [...roots, GENERIC_READONLY_PROSE];
  }
  if (roots.length > 0) return [...roots];
  return [GENERIC_READONLY_PROSE];
}

export function getAdapterForHost(hostname: string, pathname = ""): SiteAdapter {
  return resolveAdapter(hostname, pathname) ?? genericAdapter;
}

export function isCssOnlyAdapter(adapter: SiteAdapter | null): boolean {
  return adapter?.supportTier === "css-only";
}

export {
  chatgptAdapter,
  claudeAdapter,
  copilotAdapter,
  deepseekAdapter,
  geminiAdapter,
  grokAdapter,
  perplexityAdapter,
  qwenAdapter,
};
export type { SiteAdapter, SupportTier };
