const STORAGE_KEY = "rtlTextFixerEnabled";

export function storageKey(): string {
  return STORAGE_KEY;
}

export async function getEnabled(): Promise<boolean> {
  return await new Promise<boolean>((resolve) => {
    chrome.storage.sync.get(STORAGE_KEY, (result) => {
      resolve(Boolean(result[STORAGE_KEY] ?? true));
    });
  });
}

export async function setEnabled(enabled: boolean): Promise<void> {
  await new Promise<void>((resolve) => {
    chrome.storage.sync.set({ [STORAGE_KEY]: enabled }, () => resolve());
  });
}
