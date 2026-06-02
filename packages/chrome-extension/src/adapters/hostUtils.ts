export function hostMatchesPattern(hostname: string, pattern: string): boolean {
  const h = hostname.toLowerCase();
  const p = pattern.toLowerCase();
  if (!p) return false;
  if (h === p) return true;
  if (h.endsWith("." + p)) return true;
  return false;
}

export function matchesAnyHost(hostname: string, patterns: readonly string[]): boolean {
  return patterns.some((p) => hostMatchesPattern(hostname, p));
}
