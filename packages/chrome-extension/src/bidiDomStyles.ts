/** Shared BiDi CSS hints for blocks, lists, and chat surfaces. */

export const BIDI_BLOCK_SELECTOR =
  "p, li, blockquote, h1, h2, h3, h4, h5, h6, div[role='paragraph']";

export const BIDI_LIST_SELECTOR = "ol, ul";

export const BIDI_COMPOSER_BLOCK_SELECTOR = "p, li:not(:has(p))";

/** Marks a live composer so `content.css` can style its blocks without touching the DOM inside. */
export const BIDI_COMPOSER_CLASS = "bf-composer";

export function markComposerRoot(el: HTMLElement): void {
  if (!el.classList.contains(BIDI_COMPOSER_CLASS)) el.classList.add(BIDI_COMPOSER_CLASS);
}

export function unmarkComposerRoots(scope: ParentNode): void {
  for (const el of Array.from(scope.querySelectorAll<HTMLElement>(`.${BIDI_COMPOSER_CLASS}`))) {
    el.classList.remove(BIDI_COMPOSER_CLASS);
  }
}

export function applyBlockBidiStyles(el: HTMLElement): void {
  el.setAttribute("dir", "auto");
  // `direction` has no `auto` value — the `dir` attribute above is what resolves it.
  el.style.setProperty("unicode-bidi", "plaintext", "important");
  el.style.setProperty("text-align", "start", "important");
}

export function applyListContainerBidiStyles(el: HTMLElement): void {
  applyBlockBidiStyles(el);
  el.style.setProperty("list-style-position", "outside", "important");
  el.style.setProperty("padding-inline-start", "1.5em", "important");
  el.style.setProperty("margin-inline-start", "0", "important");
  el.style.setProperty("margin-inline-end", "0", "important");
}

export function applyListItemBidiStyles(el: HTMLElement): void {
  applyBlockBidiStyles(el);
  el.style.setProperty("display", "list-item", "important");
}

export function applyBidiStylesToSubtree(root: HTMLElement, includeLists = true): void {
  applyBlockBidiStyles(root);

  for (const block of root.querySelectorAll(BIDI_BLOCK_SELECTOR)) {
    if (block instanceof HTMLElement) {
      if (block.tagName === "LI") applyListItemBidiStyles(block);
      else applyBlockBidiStyles(block);
    }
  }

  if (!includeLists) return;

  for (const list of root.querySelectorAll(BIDI_LIST_SELECTOR)) {
    if (list instanceof HTMLElement) applyListContainerBidiStyles(list);
  }
}

export function listComposerBlocks(root: HTMLElement): HTMLElement[] {
  const blocks: HTMLElement[] = [];
  for (const p of root.querySelectorAll("p")) {
    if (p instanceof HTMLElement) blocks.push(p);
  }
  for (const li of root.querySelectorAll("li:not(:has(p))")) {
    if (li instanceof HTMLElement) blocks.push(li);
  }
  if (blocks.length > 0) return blocks;
  for (const child of root.children) {
    if (child instanceof HTMLElement && (child.tagName === "DIV" || child.tagName === "LI")) {
      blocks.push(child);
    }
  }
  if (blocks.length === 0) blocks.push(root);
  return blocks;
}
