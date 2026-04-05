/**
 * Traverse DOM including open shadow roots (same-document only).
 * Many chat UIs mount the composer inside shadow DOM; MutationObserver on document.body misses those mutations.
 */

export function walkSubtreeElements(root: Element, visit: (el: Element) => void): void {
  visit(root);
  const sr = root.shadowRoot;
  if (sr) {
    for (const c of Array.from(sr.children)) {
      if (c instanceof Element) walkSubtreeElements(c, visit);
    }
  }
  for (const c of Array.from(root.children)) {
    if (c instanceof Element) walkSubtreeElements(c, visit);
  }
}

export function querySelectorAllDeepFrom(root: Document | Element, selector: string): Element[] {
  const out: Element[] = [];
  const visit = (el: Element) => {
    try {
      if (el.matches(selector)) out.push(el);
    } catch {
      /* invalid selector */
    }
  };
  if (root instanceof Document) {
    if (root.body) walkSubtreeElements(root.body, visit);
  } else {
    walkSubtreeElements(root, visit);
  }
  return out;
}

export function hookShadowRootsInTree(node: Node, onShadowRoot: (sr: ShadowRoot) => void): void {
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as Element;
  if (el.shadowRoot) onShadowRoot(el.shadowRoot);
  for (const c of Array.from(el.children)) hookShadowRootsInTree(c, onShadowRoot);
  if (el.shadowRoot) {
    for (const c of Array.from(el.shadowRoot.children)) hookShadowRootsInTree(c, onShadowRoot);
  }
}
