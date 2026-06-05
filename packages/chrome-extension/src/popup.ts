import { getEnabled, setEnabled, setSiteScopeMode } from "./storage.js";

const checkbox = document.getElementById("enabled") as HTMLInputElement | null;
const statusEl = document.getElementById("status") as HTMLSpanElement | null;
const statusDetailEl = document.getElementById("statusDetail") as HTMLSpanElement | null;
const statusBar = document.getElementById("statusBar");
const versionEl = document.getElementById("version");

function setVersionLabel(): void {
  if (!versionEl) return;
  try {
    versionEl.textContent = `v${chrome.runtime.getManifest().version}`;
  } catch {
    versionEl.textContent = "v0.3.6";
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

function statusForState(enabled: boolean): { primary: string; secondary: string } {
  if (!enabled) {
    return { primary: "Paused", secondary: "Turn on to fix mixed RTL/LTR text" };
  }
  return {
    primary: "Active on all sites",
    secondary: "Mixed Persian, Arabic & English — every tab you visit",
  };
}

setVersionLabel();

if (checkbox) {
  checkbox.disabled = true;
  setStatus("Loading settings…", "loading");

  void Promise.all([getEnabled(), setSiteScopeMode("all")])
    .then(([enabled]) => {
      checkbox.checked = enabled;
      checkbox.disabled = false;
      setPowered(enabled);
      const { primary, secondary } = statusForState(enabled);
      setStatus(primary, enabled ? "ok" : "off", secondary);
    })
    .catch(() => {
      checkbox.checked = true;
      checkbox.disabled = false;
      setPowered(true);
      setStatus("Using safe defaults", "error", "All websites · extension enabled");
    });

  checkbox.addEventListener("change", () => {
    const next = checkbox.checked;
    checkbox.disabled = true;
    setPowered(next);
    setStatus("Saving…", "loading");

    void setEnabled(next)
      .then(() => {
        const { primary, secondary } = statusForState(next);
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
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  if (changes.rtlTextFixerEnabled) {
    const next = changes.rtlTextFixerEnabled.newValue !== false;
    if (checkbox) checkbox.checked = next;
    setPowered(next);
    const { primary, secondary } = statusForState(next);
    setStatus(primary, next ? "ok" : "off", secondary);
  }
});
