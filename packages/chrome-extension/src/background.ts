import { getEnabled, setEnabled } from "./storage.js";

type Message = { type: "GET_ENABLED" } | { type: "SET_ENABLED"; enabled: boolean };
const STORAGE_KEY_ENABLED = "rtlTextFixerEnabled";
const STORAGE_KEY_SITE_SCOPE = "rtlTextFixerSiteScope";

chrome.runtime.onInstalled.addListener(() => {
  void new Promise<void>((resolve) => {
    chrome.storage.sync.get([STORAGE_KEY_ENABLED, STORAGE_KEY_SITE_SCOPE], (result) => {
      const next: Record<string, unknown> = {};
      if (typeof result[STORAGE_KEY_ENABLED] === "undefined") next[STORAGE_KEY_ENABLED] = true;
      // Safe default for first install and old profiles without scope.
      if (typeof result[STORAGE_KEY_SITE_SCOPE] === "undefined") next[STORAGE_KEY_SITE_SCOPE] = "presets";
      if (Object.keys(next).length > 0) {
        chrome.storage.sync.set(next, () => resolve());
        return;
      }
      resolve();
    });
  });
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  void (async () => {
    const message = msg as Message | undefined;
    if (message?.type === "GET_ENABLED") {
      sendResponse({ enabled: await getEnabled() });
      return;
    }
    if (message?.type === "SET_ENABLED") {
      await setEnabled(Boolean(message.enabled));
      sendResponse({ ok: true });
      return;
    }
    sendResponse({ ok: false });
  })();

  return true;
});
