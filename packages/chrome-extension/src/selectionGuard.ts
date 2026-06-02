const EDITABLE_SELECTOR =
  '[contenteditable="true"],textarea,[role="textbox"][contenteditable="true"]';

function selectionInEditable(doc: Document): boolean {
  const sel = doc.getSelection?.();
  if (!sel || sel.rangeCount === 0) return false;

  const node = sel.anchorNode;
  if (!node) return false;

  const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  return Boolean(el?.closest(EDITABLE_SELECTOR));
}

/** True while the user is drag-selecting text in a composer (non-collapsed range). */
export function isUserTextSelecting(doc: Document = document): boolean {
  const sel = doc.getSelection?.();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
  return selectionInEditable(doc);
}

export function shouldPauseComposerDomFix(doc: Document = document): boolean {
  return isUserTextSelecting(doc);
}
