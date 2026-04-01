import { getEnabled, setEnabled } from "./storage.js";

const checkbox = document.getElementById("enabled") as HTMLInputElement | null;
const statusEl = document.getElementById("status") as HTMLSpanElement | null;

function setStatus(text: string, tone: "ok" | "off" | "error" | "loading"): void {
  if (!statusEl) return;
  statusEl.textContent = text;
  if (tone === "loading") {
    statusEl.removeAttribute("data-tone");
    return;
  }
  statusEl.setAttribute("data-tone", tone);
}

if (checkbox) {
  checkbox.disabled = true;
  setStatus("Loading…", "loading");

  void getEnabled()
    .then((enabled) => {
      checkbox.checked = enabled;
      checkbox.disabled = false;
      setStatus(enabled ? "Enabled and running." : "Disabled.", enabled ? "ok" : "off");
    })
    .catch(() => {
      checkbox.checked = true;
      checkbox.disabled = false;
      setStatus("Couldn’t read settings. Using default (enabled).", "error");
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
}
