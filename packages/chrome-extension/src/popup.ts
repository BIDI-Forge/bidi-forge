import { getEnabled, setEnabled } from "./storage.js";

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
    void setEnabled(checkbox.checked);
  });
}
