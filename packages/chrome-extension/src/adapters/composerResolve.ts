import { resolveAdapter } from "./registry.js";
import type { SiteAdapter } from "./types.js";

const PROSE_EDITABLE_SELECTORS = [
  '.ProseMirror[contenteditable="true"]',
  '.ProseMirror[contenteditable=""]',
  '[contenteditable="true"][role="textbox"]',
  "#prompt-textarea",
  "textarea:not([disabled])",
];

function isInsideMessageBubble(el: Element, adapter: SiteAdapter): boolean {
  const bubble = el.closest(adapter.messageBubbleSelector);
  if (!bubble) return false;
  return !el.closest(adapter.composerShellSelector);
}

/** Resolve live composer for ProseMirror / textarea adapters (Copilot, Perplexity, DeepSeek, etc.). */
export function resolveAdapterComposerEditor(
  hostname: string,
  anchor: Element,
  pathname = "",
): HTMLElement | null {
  const adapter = resolveAdapter(hostname, pathname);
  if (adapter?.supportTier !== "css-only") return null;
  if (adapter.id === "gemini") return null;

  for (const sel of PROSE_EDITABLE_SELECTORS) {
    const found = anchor.closest(sel);
    if (
      found instanceof HTMLElement &&
      (found.isContentEditable || found instanceof HTMLTextAreaElement) &&
      !isInsideMessageBubble(found, adapter)
    ) {
      return found;
    }
  }

  const shell = anchor.closest(adapter.composerShellSelector);
  if (shell) {
    for (const sel of PROSE_EDITABLE_SELECTORS) {
      const ce = shell.querySelector(sel);
      if (
        ce instanceof HTMLElement &&
        (ce.isContentEditable || ce instanceof HTMLTextAreaElement) &&
        !isInsideMessageBubble(ce, adapter)
      ) {
        return ce;
      }
    }
  }

  if (
    anchor instanceof HTMLTextAreaElement &&
    !isInsideMessageBubble(anchor, adapter)
  ) {
    return anchor;
  }

  return null;
}

export function isAdapterLiveComposer(
  hostname: string,
  el: Element,
  pathname = "",
): boolean {
  const editor = resolveAdapterComposerEditor(hostname, el, pathname);
  if (!editor) return false;
  return editor === el || editor.contains(el);
}
