import { BUILTIN_PRESET_HOSTS } from "./siteScope.js";

/** Chrome extension match patterns for preset AI chat hosts. */
export function presetHostMatchPatterns(): string[] {
  const patterns = new Set<string>();
  for (const host of BUILTIN_PRESET_HOSTS) {
    patterns.add(`*://${host}/*`);
    patterns.add(`*://*.${host}/*`);
  }
  return [...patterns];
}

export const ALL_URLS_MATCH = "<all_urls>";
