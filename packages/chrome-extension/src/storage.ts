import type { SiteScopeMode, SiteScopeSettings } from "./siteScope.js";
import { parseHostList } from "./siteScope.js";

const STORAGE_KEY_ENABLED = "rtlTextFixerEnabled";
const STORAGE_KEY_SITE_SCOPE = "rtlTextFixerSiteScope";
const STORAGE_KEY_INCLUDE_HOSTS = "rtlTextFixerIncludeHosts";
const STORAGE_KEY_EXCLUDE_HOSTS = "rtlTextFixerExcludeHosts";

export function storageKey(): string {
  return STORAGE_KEY_ENABLED;
}

/** Keys that affect whether the content script runs on the current page. */
export const SYNC_SETTING_KEYS = [
  STORAGE_KEY_ENABLED,
  STORAGE_KEY_SITE_SCOPE,
  STORAGE_KEY_INCLUDE_HOSTS,
  STORAGE_KEY_EXCLUDE_HOSTS,
] as const;

export interface ExtensionRuntimeState {
  enabled: boolean;
  site: SiteScopeSettings;
}

function parseScopeMode(raw: unknown): SiteScopeMode {
  if (raw === "presets") return "presets";
  return "all";
}

function asHostListText(raw: unknown): string {
  return typeof raw === "string" ? raw : "";
}

function parseSiteScopeSettings(result: Record<string, unknown>): SiteScopeSettings {
  return {
    mode: parseScopeMode(result[STORAGE_KEY_SITE_SCOPE]),
    includeHosts: parseHostList(asHostListText(result[STORAGE_KEY_INCLUDE_HOSTS])),
    excludeHosts: parseHostList(asHostListText(result[STORAGE_KEY_EXCLUDE_HOSTS])),
  };
}

export async function getEnabled(): Promise<boolean> {
  return await new Promise<boolean>((resolve) => {
    chrome.storage.sync.get(STORAGE_KEY_ENABLED, (result) => {
      resolve(Boolean(result[STORAGE_KEY_ENABLED] ?? true));
    });
  });
}

export async function setEnabled(enabled: boolean): Promise<void> {
  await new Promise<void>((resolve) => {
    chrome.storage.sync.set({ [STORAGE_KEY_ENABLED]: enabled }, () => resolve());
  });
}

export async function getSiteScopeSettings(): Promise<SiteScopeSettings> {
  return await new Promise<SiteScopeSettings>((resolve) => {
    chrome.storage.sync.get(
      [STORAGE_KEY_SITE_SCOPE, STORAGE_KEY_INCLUDE_HOSTS, STORAGE_KEY_EXCLUDE_HOSTS],
      (result) => {
        resolve(parseSiteScopeSettings(result as Record<string, unknown>));
      },
    );
  });
}

export async function getExtensionRuntimeState(): Promise<ExtensionRuntimeState> {
  return await new Promise<ExtensionRuntimeState>((resolve) => {
    chrome.storage.sync.get([...SYNC_SETTING_KEYS], (result) => {
      const r = result as Record<string, unknown>;
      resolve({
        enabled: Boolean(r[STORAGE_KEY_ENABLED] ?? true),
        site: parseSiteScopeSettings(r),
      });
    });
  });
}

export async function setSiteScopeMode(mode: SiteScopeMode): Promise<void> {
  await new Promise<void>((resolve) => {
    chrome.storage.sync.set({ [STORAGE_KEY_SITE_SCOPE]: mode }, () => resolve());
  });
}

export async function setIncludeHostsText(text: string): Promise<void> {
  await new Promise<void>((resolve) => {
    chrome.storage.sync.set({ [STORAGE_KEY_INCLUDE_HOSTS]: text }, () => resolve());
  });
}

export async function setExcludeHostsText(text: string): Promise<void> {
  await new Promise<void>((resolve) => {
    chrome.storage.sync.set({ [STORAGE_KEY_EXCLUDE_HOSTS]: text }, () => resolve());
  });
}

export async function getIncludeHostsText(): Promise<string> {
  return await new Promise<string>((resolve) => {
    chrome.storage.sync.get(STORAGE_KEY_INCLUDE_HOSTS, (result) => {
      resolve(asHostListText((result as Record<string, unknown>)[STORAGE_KEY_INCLUDE_HOSTS]));
    });
  });
}

export async function getExcludeHostsText(): Promise<string> {
  return await new Promise<string>((resolve) => {
    chrome.storage.sync.get(STORAGE_KEY_EXCLUDE_HOSTS, (result) => {
      resolve(asHostListText((result as Record<string, unknown>)[STORAGE_KEY_EXCLUDE_HOSTS]));
    });
  });
}
