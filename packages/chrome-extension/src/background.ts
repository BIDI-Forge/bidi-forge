import { getEnabled, setEnabled } from "./storage.js";

type Message = { type: "GET_ENABLED" } | { type: "SET_ENABLED"; enabled: boolean };

chrome.runtime.onInstalled.addListener(() => {
  void new Promise<void>((resolve) => {
    chrome.storage.sync.get("rtlTextFixerEnabled", (result) => {
      if (typeof result.rtlTextFixerEnabled === "undefined") {
        chrome.storage.sync.set({ rtlTextFixerEnabled: true }, () => resolve());
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
