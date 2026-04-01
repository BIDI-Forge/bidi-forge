import { getEnabled, setEnabled } from "./storage.js";

interface Message {
  type: "SET_ENABLED";
  enabled: boolean;
}

const checkbox = document.getElementById("enabled") as HTMLInputElement | null;
if (checkbox) {
  void getEnabled()
    .then((enabled) => {
      checkbox.checked = enabled;
    })
    .catch(() => {
      checkbox.checked = true;
    });

  checkbox.addEventListener("change", () => {
    void setEnabled(checkbox.checked).then(() => {
      void chrome.runtime.sendMessage({
        type: "SET_ENABLED",
        enabled: checkbox.checked,
      } satisfies Message);
    });
  });
}
