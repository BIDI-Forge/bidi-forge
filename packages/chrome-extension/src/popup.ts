import type { SiteScopeMode } from "./siteScope.js";
import { buildTabSiteStatus, describeSupportTier } from "./siteSupport.js";
import {
  getEnabled,
  getExtensionRuntimeState,
  getSiteScopeSettings,
  setEnabled,
  setHostOverride,
  setSiteScopeMode,
} from "./storage.js";

const checkbox = document.getElementById("enabled") as HTMLInputElement | null;
const statusEl = document.getElementById("status") as HTMLSpanElement | null;
const statusDetailEl = document.getElementById("statusDetail") as HTMLSpanElement | null;
const statusBar = document.getElementById("statusBar");
const versionEl = document.getElementById("version");
const siteHostEl = document.getElementById("siteHost");
const siteTierEl = document.getElementById("siteTier");
const siteEnabledEl = document.getElementById("siteEnabled") as HTMLInputElement | null;
const scopeRadios = document.querySelectorAll<HTMLInputElement>('input[name="scope"]');

function setVersionLabel(): void {
  if (!versionEl) return;
  try {
    versionEl.textContent = `v${chrome.runtime.getManifest().version}`;
  } catch {
    versionEl.textContent = "v0.3.5";
  }
}

function setPowered(on: boolean): void {
  document.body.dataset.powered = on ? "on" : "off";
}

function setStatus(
  primary: string,
  tone: "ok" | "off" | "error" | "loading",
  secondary = "",
): void {
  if (statusEl) statusEl.textContent = primary;
  if (statusDetailEl) statusDetailEl.textContent = secondary;
  if (!statusBar) return;
  if (tone === "loading") {
    statusBar.removeAttribute("data-tone");
    return;
  }
  statusBar.setAttribute("data-tone", tone);
}

function statusForGlobal(enabled: boolean, mode: SiteScopeMode): { primary: string; secondary: string } {
  if (!enabled) {
    return { primary: "Paused", secondary: "Turn on to fix mixed RTL/LTR text" };
  }
  if (mode === "presets") {
    return {
      primary: "Active on AI presets",
      secondary: "Claude, ChatGPT, Copilot, Perplexity, DeepSeek, and more",
    };
  }
  return {
    primary: "Active on all sites",
    secondary: "Mixed Persian, Arabic & English — every tab you visit",
  };
}

async function getActiveTabUrl(): Promise<{ hostname: string; pathname: string } | null> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.url) return null;
  try {
    const u = new URL(tab.url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return { hostname: u.hostname.toLowerCase(), pathname: u.pathname };
  } catch {
    return null;
  }
}

async function refreshSitePanel(
  globallyEnabled: boolean,
  mode: SiteScopeMode,
): Promise<void> {
  const tab = await getActiveTabUrl();
  if (!tab) {
    if (siteHostEl) siteHostEl.textContent = "No web page in this tab";
    if (siteTierEl) siteTierEl.textContent = "";
    if (siteEnabledEl) siteEnabledEl.disabled = true;
    return;
  }

  const state = await getExtensionRuntimeState();
  const override = state.hostOverrides[tab.hostname] ?? null;
  const siteStatus = buildTabSiteStatus(
    tab.hostname,
    tab.pathname,
    globallyEnabled,
    state.site,
    override,
  );

  if (siteHostEl) {
    siteHostEl.textContent = siteStatus.adapterId
      ? `${siteStatus.hostname} · ${siteStatus.adapterLabel}`
      : siteStatus.hostname;
  }
  if (siteTierEl) {
    const tier = describeSupportTier(siteStatus.supportTier);
    siteTierEl.textContent = siteStatus.effectiveEnabled
      ? tier
      : `${tier} · fixes paused on this tab`;
  }

  if (siteEnabledEl) {
    siteEnabledEl.disabled = !globallyEnabled;
    siteEnabledEl.checked = siteStatus.effectiveEnabled;
  }
}

function setScopeRadios(mode: SiteScopeMode): void {
  for (const radio of scopeRadios) {
    radio.checked = radio.value === mode;
  }
}

async function reloadUi(): Promise<void> {
  const [enabled, site] = await Promise.all([getEnabled(), getSiteScopeSettings()]);
  if (checkbox) checkbox.checked = enabled;
  setPowered(enabled);
  setScopeRadios(site.mode);
  const { primary, secondary } = statusForGlobal(enabled, site.mode);
  setStatus(primary, enabled ? "ok" : "off", secondary);
  await refreshSitePanel(enabled, site.mode);
}

setVersionLabel();

if (checkbox) {
  checkbox.disabled = true;
  setStatus("Loading settings…", "loading");

  void reloadUi()
    .catch(() => {
      if (checkbox) checkbox.checked = true;
      setPowered(true);
      setStatus("Using safe defaults", "error", "AI presets · extension enabled");
    })
    .finally(() => {
      if (checkbox) checkbox.disabled = false;
    });

  checkbox.addEventListener("change", () => {
    const next = checkbox.checked;
    checkbox.disabled = true;
    setPowered(next);
    setStatus("Saving…", "loading");

    void setEnabled(next)
      .then(() => reloadUi())
      .catch(() => {
        checkbox.checked = !next;
        setPowered(!next);
        setStatus("Couldn’t save", "error", "Try toggling again");
      })
      .finally(() => {
        checkbox.disabled = false;
      });
  });
}

for (const radio of scopeRadios) {
  radio.addEventListener("change", () => {
    if (!radio.checked) return;
    const mode = radio.value as SiteScopeMode;
    void setSiteScopeMode(mode)
      .then(() => reloadUi())
      .catch(() => {
        void reloadUi();
      });
  });
}

if (siteEnabledEl) {
  siteEnabledEl.addEventListener("change", () => {
    void (async () => {
      const tab = await getActiveTabUrl();
      if (!tab) return;
      const wantOn = siteEnabledEl.checked;
      const state = await getExtensionRuntimeState();
      const defaultOn = buildTabSiteStatus(
        tab.hostname,
        tab.pathname,
        state.enabled,
        state.site,
        null,
      ).effectiveEnabled;

      if (wantOn === defaultOn) {
        await setHostOverride(tab.hostname, null);
      } else {
        await setHostOverride(tab.hostname, wantOn);
      }

      const [enabled, site] = await Promise.all([getEnabled(), getSiteScopeSettings()]);
      await refreshSitePanel(enabled, site.mode);

      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const id = tabs[0]?.id;
        if (id !== undefined) {
          await chrome.tabs.sendMessage(id, { type: "ENABLED_CHANGED" });
        }
      } catch {
        /* content script may not be injected on chrome:// pages */
      }
    })();
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  if (changes.rtlTextFixerEnabled || changes.rtlTextFixerSiteScope) {
    void reloadUi();
  }
});
