import { fixMixedText } from "@rtl-text-fixer/core";

import { getEnabled } from "./storage.js";

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "CODE", "PRE", "NOSCRIPT"]);

function shouldSkipNode(node: Node): boolean {
  const parent = node.parentElement;
  if (!parent) return false;
  if (SKIP_TAGS.has(parent.tagName)) return true;
  if (parent.isContentEditable) return true;
  return false;
}

function walkAndFix(root: Node): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current: Node | null;
  while ((current = walker.nextNode())) {
    if (shouldSkipNode(current)) continue;
    const textNode = current as Text;
    const original = textNode.nodeValue ?? "";
    if (!original.trim()) continue;

    const fixed = fixMixedText(original);
    if (fixed !== original) textNode.nodeValue = fixed;
  }
}

async function run(): Promise<void> {
  if (!(await getEnabled())) return;

  walkAndFix(document.body);

  // Fix dynamically added content.
  const observer = new MutationObserver((mutations: MutationRecord[]) => {
    for (const m of mutations) {
      if (m.type === "characterData" && m.target.nodeType === Node.TEXT_NODE) {
        const n = m.target as Text;
        if (shouldSkipNode(n)) continue;
        const original = n.nodeValue ?? "";
        const fixed = fixMixedText(original);
        if (fixed !== original) n.nodeValue = fixed;
      } else if (m.type === "childList") {
        for (const added of Array.from(m.addedNodes)) {
          const addedNode = added;
          if (addedNode.nodeType === Node.TEXT_NODE) {
            const n = addedNode as Text;
            if (shouldSkipNode(n)) continue;
            const original = n.nodeValue ?? "";
            const fixed = fixMixedText(original);
            if (fixed !== original) n.nodeValue = fixed;
          } else if (addedNode.nodeType === Node.ELEMENT_NODE) {
            walkAndFix(addedNode);
          }
        }
      }
    }
  });

  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
  });
}

void run();
