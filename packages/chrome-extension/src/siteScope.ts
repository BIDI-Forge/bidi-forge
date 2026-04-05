export type SiteScopeMode = "all" | "presets";

export interface SiteScopeSettings {
  mode: SiteScopeMode;
  includeHosts: string[];
  excludeHosts: string[];
}

/**
 * Built-in host patterns for major AI chat UIs. Matching is suffix-based
 * (e.g. openai.com matches chat.openai.com).
 */
export const BUILTIN_PRESET_HOSTS: readonly string[] = [
  "chatgpt.com",
  "openai.com",
  "gemini.google.com",
  "claude.ai",
  "anthropic.com",
  "copilot.microsoft.com",
  "perplexity.ai",
  "deepseek.com",
  "x.com",
  "twitter.com",
  "x.ai",
  "chat.qwen.ai",
  "qwenlm.ai",
  "meta.ai",
];

export function normalizeHostInput(line: string): string | null {
  const raw = line.trim();
  if (!raw) return null;

  try {
    if (raw.includes("://")) {
      const u = new URL(raw);
      return u.hostname.toLowerCase() || null;
    }
  } catch {
    // fall through: treat as plain host
  }

  const hostOnly = raw.split("/")[0]!.split(":")[0]!.trim().toLowerCase();
  return hostOnly || null;
}

export function parseHostList(text: string): string[] {
  const lines = text.split(/[\n,]+/);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const h = normalizeHostInput(line);
    if (!h || seen.has(h)) continue;
    seen.add(h);
    out.push(h);
  }
  return out;
}

export function hostMatchesPattern(hostname: string, pattern: string): boolean {
  const h = hostname.toLowerCase();
  const p = pattern.toLowerCase();
  if (!p) return false;
  if (h === p) return true;
  if (h.endsWith("." + p)) return true;
  return false;
}

function matchesAnyPattern(hostname: string, patterns: readonly string[]): boolean {
  return patterns.some((p) => hostMatchesPattern(hostname, p));
}

export function hostnameMatchesPresets(hostname: string, extraInclude: readonly string[]): boolean {
  if (matchesAnyPattern(hostname, BUILTIN_PRESET_HOSTS)) return true;
  if (extraInclude.length > 0 && matchesAnyPattern(hostname, extraInclude)) return true;
  return false;
}

export function isHostnameExcluded(hostname: string, excludeHosts: readonly string[]): boolean {
  return matchesAnyPattern(hostname, excludeHosts);
}

/**
 * Whether the content script should run fixes on this tab, given the global toggle and scope.
 */
export function computeEffectiveEnabled(
  globallyEnabled: boolean,
  hostname: string,
  settings: SiteScopeSettings,
): boolean {
  if (!globallyEnabled) return false;
  if (isHostnameExcluded(hostname, settings.excludeHosts)) return false;
  if (settings.mode === "all") return true;
  return hostnameMatchesPresets(hostname, settings.includeHosts);
}
