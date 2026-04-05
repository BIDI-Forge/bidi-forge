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
const scopeRadios = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="siteScope"]'));
const includeHostsEl = document.getElementById("includeHosts") as HTMLTextAreaElement | null;
const excludeHostsEl = document.getElementById("excludeHosts") as HTMLTextAreaElement | null;

function setStatus(text: string, tone: "ok" | "off" | "error" | "loading"): void {
  if (!statusEl) return;
  statusEl.textContent = text;
  if (tone === "loading") {
    statusEl.removeAttribute("data-tone");
    return;
  }
  statusEl.setAttribute("data-tone", tone);
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

function syncIncludeDisabled(): void {
  if (!includeHostsEl) return;
  includeHostsEl.disabled = selectedScopeMode() === "all";
}

if (checkbox && includeHostsEl && excludeHostsEl && scopeRadios.length >= 2) {
  checkbox.disabled = true;
  includeHostsEl.disabled = true;
  excludeHostsEl.disabled = true;
  for (const r of scopeRadios) r.disabled = true;
  setStatus("Loading…", "loading");

  void Promise.all([getEnabled(), getSiteScopeSettings(), getIncludeHostsText(), getExcludeHostsText()])
    .then(([enabled, site, includeText, excludeText]) => {
      checkbox.checked = enabled;
      checkbox.disabled = false;
      for (const r of scopeRadios) {
        r.disabled = false;
        r.checked = (r.value === "presets" && site.mode === "presets") || (r.value === "all" && site.mode === "all");
      }
      includeHostsEl.value = includeText;
      excludeHostsEl.value = excludeText;
      syncIncludeDisabled();
      excludeHostsEl.disabled = false;
      setStatus(enabled ? "Enabled and running." : "Disabled.", enabled ? "ok" : "off");
    })
    .catch(() => {
      checkbox.checked = true;
      checkbox.disabled = false;
      for (const r of scopeRadios) {
        r.disabled = false;
        if (r.value === "all") r.checked = true;
      }
      syncIncludeDisabled();
      excludeHostsEl.disabled = false;
      setStatus("Couldn’t read settings. Using defaults.", "error");
    });

  checkbox.addEventListener("change", () => {
    const next = checkbox.checked;
    checkbox.disabled = true;
    setStatus("Saving…", "loading");

    void setEnabled(next)
      .then(() => {
        setStatus(next ? "Enabled and running." : "Disabled.", next ? "ok" : "off");
      })
      .catch(() => {
        checkbox.checked = !next;
        setStatus("Couldn’t save setting. Try again.", "error");
      })
      .finally(() => {
        checkbox.disabled = false;
      });
  });

  for (const r of scopeRadios) {
    r.addEventListener("change", () => {
      syncIncludeDisabled();
      const mode = selectedScopeMode();
      setStatus("Saving…", "loading");
      void setSiteScopeMode(mode)
        .then(() => {
          setStatus(checkbox.checked ? "Enabled and running." : "Disabled.", checkbox.checked ? "ok" : "off");
        })
        .catch(() => {
          setStatus("Couldn’t save site scope.", "error");
        });
    });
  }

  const saveInclude = debounce((text: string) => {
    void setIncludeHostsText(text).catch(() => {
      setStatus("Couldn’t save extra hosts.", "error");
    });
  }, 450);

  const saveExclude = debounce((text: string) => {
    void setExcludeHostsText(text).catch(() => {
      setStatus("Couldn’t save exclusions.", "error");
    });
  }, 450);

  includeHostsEl.addEventListener("input", () => {
    saveInclude(includeHostsEl.value);
  });

  excludeHostsEl.addEventListener("input", () => {
    saveExclude(excludeHostsEl.value);
  });
}
