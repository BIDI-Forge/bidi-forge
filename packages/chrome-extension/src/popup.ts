import type { SiteScopeMode } from "./siteScope.js";
import {
  getEnabled,
  getExcludeHostsText,
  getIncludeHostsText,
  setEnabled,
  setExcludeHostsText,
  setIncludeHostsText,
  setSiteScopeMode,
  getSiteScopeSettings,
} from "./storage.js";

const checkbox = document.getElementById("enabled") as HTMLInputElement | null;
const statusEl = document.getElementById("status") as HTMLSpanElement | null;
const statusDetailEl = document.getElementById("statusDetail") as HTMLSpanElement | null;
const statusBar = document.getElementById("statusBar");
const scopeHintEl = document.getElementById("scopeHint");
const hostBlock = document.getElementById("hostBlock");
const versionEl = document.getElementById("version");
const scopeRadios = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="siteScope"]'));
const includeHostsEl = document.getElementById("includeHosts") as HTMLTextAreaElement | null;
const excludeHostsEl = document.getElementById("excludeHosts") as HTMLTextAreaElement | null;

function setVersionLabel(): void {
  if (!versionEl) return;
  try {
    versionEl.textContent = `v${chrome.runtime.getManifest().version}`;
  } catch {
    versionEl.textContent = "v0.3.4";
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

function statusForState(enabled: boolean, mode: SiteScopeMode): { primary: string; secondary: string } {
  if (!enabled) {
    return { primary: "Paused", secondary: "Turn on to fix mixed RTL/LTR text" };
  }
  if (mode === "presets") {
    return {
      primary: "Ready on Claude.ai",
      secondary: "Claude.ai + ChatGPT, Gemini, Grok, Qwen · Copilot/Perplexity/DeepSeek soon",
    };
  }
  return {
    primary: "Active on all sites",
    secondary: "Heavier mode — prefer AI chats if tabs feel slow",
  };
}

function debounce<T extends unknown[]>(fn: (...args: T) => void, ms: number): (...args: T) => void {
  let timer: number | undefined;
  return (...args: T) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), ms);
  };
}

function selectedScopeMode(): SiteScopeMode {
  const checked = scopeRadios.find((r) => r.checked);
  return checked?.value === "presets" ? "presets" : "all";
}

function syncScopeUi(): void {
  const mode = selectedScopeMode();
  const allSites = mode === "all";

  if (includeHostsEl) includeHostsEl.disabled = allSites;
  hostBlock?.setAttribute("data-dimmed", allSites ? "true" : "false");

  if (scopeHintEl) {
    scopeHintEl.textContent = allSites
      ? "Every tab when enabled — higher CPU use"
      : "Claude.ai first · ChatGPT, Gemini, Grok, Qwen (default)";
  }

  if (checkbox?.checked) {
    const { primary, secondary } = statusForState(true, mode);
    setStatus(primary, "ok", secondary);
  }
}

setVersionLabel();

if (checkbox && includeHostsEl && excludeHostsEl && scopeRadios.length >= 2) {
  checkbox.disabled = true;
  includeHostsEl.disabled = true;
  excludeHostsEl.disabled = true;
  for (const r of scopeRadios) r.disabled = true;
  setStatus("Loading settings…", "loading");

  void Promise.all([getEnabled(), getSiteScopeSettings(), getIncludeHostsText(), getExcludeHostsText()])
    .then(([enabled, site, includeText, excludeText]) => {
      checkbox.checked = enabled;
      checkbox.disabled = false;
      setPowered(enabled);

      for (const r of scopeRadios) {
        r.disabled = false;
        r.checked =
          (r.value === "presets" && site.mode === "presets") ||
          (r.value === "all" && site.mode === "all");
      }

      includeHostsEl.value = includeText;
      excludeHostsEl.value = excludeText;
      excludeHostsEl.disabled = false;
      syncScopeUi();

      const { primary, secondary } = statusForState(enabled, site.mode);
      setStatus(primary, enabled ? "ok" : "off", secondary);
    })
    .catch(() => {
      checkbox.checked = true;
      checkbox.disabled = false;
      setPowered(true);

      for (const r of scopeRadios) {
        r.disabled = false;
        if (r.value === "presets") r.checked = true;
      }

      syncScopeUi();
      excludeHostsEl.disabled = false;
      setStatus("Using safe defaults", "error", "Claude.ai presets · extension enabled");
    });

  checkbox.addEventListener("change", () => {
    const next = checkbox.checked;
    checkbox.disabled = true;
    setPowered(next);
    setStatus("Saving…", "loading");

    void setEnabled(next)
      .then(() => {
        const { primary, secondary } = statusForState(next, selectedScopeMode());
        setStatus(primary, next ? "ok" : "off", secondary);
      })
      .catch(() => {
        checkbox.checked = !next;
        setPowered(!next);
        setStatus("Couldn’t save", "error", "Try toggling again");
      })
      .finally(() => {
        checkbox.disabled = false;
      });
  });

  for (const r of scopeRadios) {
    r.addEventListener("change", () => {
      syncScopeUi();
      setStatus("Saving scope…", "loading");
      void setSiteScopeMode(selectedScopeMode())
        .then(() => syncScopeUi())
        .catch(() => {
          setStatus("Couldn’t save scope", "error", "Check sync storage in Chrome");
        });
    });
  }

  const saveInclude = debounce((text: string) => {
    void setIncludeHostsText(text).catch(() => {
      setStatus("Extra hosts not saved", "error");
    });
  }, 450);

  const saveExclude = debounce((text: string) => {
    void setExcludeHostsText(text).catch(() => {
      setStatus("Blocklist not saved", "error");
    });
  }, 450);

  includeHostsEl.addEventListener("input", () => {
    saveInclude(includeHostsEl.value);
  });

  excludeHostsEl.addEventListener("input", () => {
    saveExclude(excludeHostsEl.value);
  });
}
