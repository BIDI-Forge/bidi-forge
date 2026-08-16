import { getSupportTier, resolveAdapter } from "./adapters/registry.js";
import type { SupportTier } from "./adapters/types.js";
import {
  computeEffectiveEnabled,
  isHostnameExcluded,
  type SiteScopeSettings,
} from "./siteScope.js";

export interface TabSiteStatus {
  hostname: string;
  adapterId: string | null;
  adapterLabel: string;
  supportTier: SupportTier;
  effectiveEnabled: boolean;
  excluded: boolean;
}

export function describeSupportTier(tier: SupportTier): string {
  switch (tier) {
    case "full":
      return "Full — composer markers + streaming replies";
    case "css-only":
      return "CSS-only composer — no marker spam while typing";
    case "generic":
      return "Generic DOM fix — preset host";
  }
}

export function buildTabSiteStatus(
  hostname: string,
  pathname: string,
  globallyEnabled: boolean,
  site: SiteScopeSettings,
  hostOverride?: boolean | null,
): TabSiteStatus {
  const adapter = resolveAdapter(hostname, pathname);
  const excluded = isHostnameExcluded(hostname, site.excludeHosts) || hostOverride === false;
  let effectiveEnabled = false;
  if (!globallyEnabled) {
    effectiveEnabled = false;
  } else if (hostOverride === false) {
    effectiveEnabled = false;
  } else if (hostOverride === true) {
    effectiveEnabled = true;
  } else {
    effectiveEnabled = computeEffectiveEnabled(true, hostname, site);
  }

  return {
    hostname,
    adapterId: adapter?.id ?? null,
    adapterLabel: adapter?.label ?? "Unknown site",
    supportTier: getSupportTier(hostname, pathname),
    effectiveEnabled,
    excluded,
  };
}
