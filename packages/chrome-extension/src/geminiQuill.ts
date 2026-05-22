import { stripBidiMarkers } from "@rtl-text-fixer/core";

import { getCaretOffsetInBlock, setCaretOffsetInBlock } from "./blockFix.js";

const BIDI_MARKER_RE = /[\u200E\u200F\u2066-\u2069]/;

export function isGeminiHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "gemini.google.com" || h.endsWith(".gemini.google.com");
}

export function isGoogleAiHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    isGeminiHost(hostname) ||
    h.includes("bard.google") ||
    h === "ogs.google.com" ||
    h.endsWith(".ogs.google.com") ||
    h === "notebooklm.google.com" ||
    h === "aistudio.google.com" ||
    h === "labs.google.com"
  );
}

/** Live Quill composer only — not read-only `.ql-editor` in assistant bubbles. */
export function isGeminiQuillComposer(hostname: string, el: Element): boolean {
  if (!isGeminiHost(hostname)) return false;
  const editor = el.closest(".ql-editor");
  if (!(editor instanceof HTMLElement)) return false;
  return editor.isContentEditable;
}

export function isInsideGeminiComposer(el: Element, hostname: string): boolean {
  if (!isGeminiHost(hostname)) return false;
  const editor = el.closest(".ql-editor");
  return editor instanceof HTMLElement && editor.isContentEditable;
}

export function resolveGeminiQuillEditor(anchor: Element): HTMLElement | null {
  const ed = anchor.closest(".ql-editor");
  if (ed instanceof HTMLElement && ed.isContentEditable) return ed;
  if (
    anchor instanceof HTMLElement &&
    anchor.classList.contains("ql-editor") &&
    anchor.isContentEditable
  ) {
    return anchor;
  }
  return null;
}

function getCaretBlockInEditor(editor: HTMLElement): HTMLElement | null {
  const sel = editor.ownerDocument.getSelection?.();
  if (!sel || sel.rangeCount === 0) return null;
  const anchor = sel.anchorNode;
  if (!anchor || !editor.contains(anchor)) return null;
  const el =
    anchor.nodeType === Node.ELEMENT_NODE
      ? (anchor as Element)
      : (anchor.parentElement ?? null);
  if (!el) return null;
  const block = el.closest("p");
  if (block instanceof HTMLElement && editor.contains(block)) return block;
  return editor;
}

function prefixTextAtOffset(block: HTMLElement, offset: number): string {
  const walker = block.ownerDocument.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let remaining = Math.max(0, offset);
  let acc = "";
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const v = (n as Text).nodeValue ?? "";
    if (remaining <= v.length) {
      acc += v.slice(0, remaining);
      break;
    }
    acc += v;
    remaining -= v.length;
  }
  return acc;
}

const geminiDirObservers = new WeakMap<HTMLElement, MutationObserver>();

export function applyGeminiQuillBidiOverrides(anchor: HTMLElement): void {
  const targets = new Set<HTMLElement>();
  for (const sel of [".ql-editor", ".ql-container", "rich-textarea", ".text-input-field"]) {
    const found = anchor.closest(sel);
    if (found instanceof HTMLElement) targets.add(found);
  }

  for (const el of targets) {
    el.setAttribute("dir", "auto");
    el.style.setProperty("unicode-bidi", "plaintext", "important");
    el.style.setProperty("direction", "auto", "important");
    if (el.classList.contains("ql-editor")) {
      el.style.setProperty("text-align", "start", "important");
    }
    if (el.tagName.toLowerCase() === "rich-textarea") {
      watchGeminiRichTextareaDir(el);
    }
  }

  const editor = resolveGeminiQuillEditor(anchor);
  if (editor) applyGeminiParagraphStyles(editor);
}

function watchGeminiRichTextareaDir(rt: HTMLElement): void {
  if (geminiDirObservers.has(rt)) return;
  const obs = new MutationObserver(() => {
    if (rt.getAttribute("dir") === "rtl") {
      rt.setAttribute("dir", "auto");
      rt.style.setProperty("direction", "auto", "important");
      rt.style.setProperty("unicode-bidi", "plaintext", "important");
    }
  });
  obs.observe(rt, { attributes: true, attributeFilter: ["dir"] });
  geminiDirObservers.set(rt, obs);
}

export function applyGeminiParagraphStyles(editor: HTMLElement): void {
  for (const p of editor.querySelectorAll("p")) {
    if (!(p instanceof HTMLElement)) continue;
    p.setAttribute("dir", "auto");
    p.classList.remove("ql-direction-rtl");
    p.style.setProperty("unicode-bidi", "plaintext", "important");
    p.style.setProperty("direction", "auto", "important");
    for (const span of p.querySelectorAll("span.ql-direction-rtl, span.ql-direction-ltr")) {
      if (span instanceof HTMLElement) {
        span.classList.remove("ql-direction-rtl", "ql-direction-ltr");
      }
    }
  }
}

function editorHasBidiMarkers(editor: HTMLElement): boolean {
  const walker = editor.ownerDocument.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) {
    if (BIDI_MARKER_RE.test((n as Text).nodeValue ?? "")) return true;
  }
  return false;
}

export function stripMarkersInGeminiEditor(editor: HTMLElement): void {
  const walker = editor.ownerDocument.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const t = n as Text;
    const v = t.nodeValue ?? "";
    const stripped = stripBidiMarkers(v);
    if (stripped !== v) t.nodeValue = stripped;
  }
}

/**
 * Gemini composer: CSS bidi hints only — never insert LRM/RLM (Quill splits spans and order breaks).
 * Strip markers left from older builds or other code paths.
 */
export function maintainGeminiComposer(editor: HTMLElement): void {
  const block = getCaretBlockInEditor(editor) ?? editor;
  const caretDom = getCaretOffsetInBlock(block);
  const logicalCaret =
    caretDom !== null ? stripBidiMarkers(prefixTextAtOffset(block, caretDom)).length : null;

  applyGeminiParagraphStyles(editor);

  const focused =
    editor === editor.ownerDocument.activeElement ||
    editor.contains(editor.ownerDocument.activeElement);

  if (!editorHasBidiMarkers(editor)) return;

  stripMarkersInGeminiEditor(editor);

  if (focused && logicalCaret !== null) {
    setCaretOffsetInBlock(block, logicalCaret);
  }
}
