import { ALL_URLS_MATCH, presetHostMatchPatterns } from "./manifestMatches.js";
import type { SiteScopeMode } from "./siteScope.js";

export const DYNAMIC_ALL_SITES_SCRIPT_ID = "bidi-forge-all-urls";

export async function syncAllSitesContentScript(mode: SiteScopeMode): Promise<void> {
  if (!chrome.scripting?.registerContentScripts) return;

  const existing = await chrome.scripting.getRegisteredContentScripts();
  const hasDynamic = existing.some((s) => s.id === DYNAMIC_ALL_SITES_SCRIPT_ID);

  if (mode === "all" && !hasDynamic) {
    await chrome.scripting.registerContentScripts([
      {
        id: DYNAMIC_ALL_SITES_SCRIPT_ID,
        js: ["content.js"],
        matches: [ALL_URLS_MATCH],
        runAt: "document_idle",
        persistAcrossSessions: true,
      },
    ]);
    return;
  }

  if (mode === "presets" && hasDynamic) {
    await chrome.scripting.unregisterContentScripts({
      ids: [DYNAMIC_ALL_SITES_SCRIPT_ID],
    });
  }
}

export function staticManifestContentScriptMatches(): string[] {
  return presetHostMatchPatterns();
}
