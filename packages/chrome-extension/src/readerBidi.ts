/**
 * Direction for rendered (read-only) chat messages.
 *
 * `dir="auto"` and `unicode-bidi: plaintext` both anchor on the *first strong character*, so a
 * Persian bullet that opens with `useState`, an English term, or a number renders LTR: the bullet
 * jumps to the left, punctuation lands on the wrong end, and neighbouring items disagree.
 *
 * This module resolves the direction from the whole block instead, ignoring runs that are
 * technical rather than linguistic (inline code, code blocks, icons), and writes it as
 * `data-bf-dir` — attributes only, never text. Nothing here rewrites message content, so
 * copying an answer yields exactly what Claude produced and streaming updates stay safe.
 */

import { detectParagraphDirection, getCharClass } from "@bidi-forge/core";

export type BlockDirection = "rtl" | "ltr";

export const BF_DIR_ATTR = "data-bf-dir";
export const BF_ROLE_ATTR = "data-bf";

/** Elements whose text is technical, not linguistic: they must not decide a direction. */
const NEUTRAL_TEXT_SELECTOR =
  'pre, code, kbd, samp, var, tt, math, svg, img, canvas, button, [aria-hidden="true"]';

const BLOCK_SELECTOR =
  "p, h1, h2, h3, h4, h5, h6, blockquote, dt, dd, figcaption, summary, div[role='paragraph']";

const LIST_SELECTOR = "ol, ul";
const ITEM_SELECTOR = "li";
const TABLE_SELECTOR = "table";
const CELL_SELECTOR = "td, th, caption";

/** Long messages only need a prefix to classify; keeps streaming rescans cheap. */
const DIRECTION_SAMPLE_LIMIT = 4000;

/**
 * Text of `el` with technical runs blanked out, e.g. `<li><code>useState</code> را ...</li>`
 * contributes only ` را ...` and stays RTL.
 */
export function directionalTextOf(el: Element, limit = DIRECTION_SAMPLE_LIMIT): string {
  const doc = el.ownerDocument;
  if (!doc) return "";

  const walker = doc.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(node: Node): number {
      if (node.nodeType === Node.ELEMENT_NODE) {
        return (node as Element).matches(NEUTRAL_TEXT_SELECTOR)
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_SKIP;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let text = "";
  let node: Node | null;
  while ((node = walker.nextNode()) !== null && text.length < limit) {
    text += (node as Text).nodeValue ?? "";
  }
  return text;
}

const NESTED_BLOCK_SELECTOR = [
  BLOCK_SELECTOR,
  LIST_SELECTOR,
  ITEM_SELECTOR,
  TABLE_SELECTOR,
  CELL_SELECTOR,
].join(", ");

/** A message root, a list, or any block that wraps other blocks rather than a single sentence. */
function isBlockContainer(el: Element): boolean {
  return el.querySelector(NESTED_BLOCK_SELECTOR) !== null;
}

/** Strict majority of strong characters, ignoring first-strong ordering. */
function majorityDirection(text: string): BlockDirection | null {
  let rtl = 0;
  let ltr = 0;
  for (const ch of text) {
    const cc = getCharClass(ch);
    if (cc === "RTL") rtl++;
    else if (cc === "LTR") ltr++;
  }
  if (rtl > ltr) return "rtl";
  if (ltr > rtl) return "ltr";
  return null;
}

/**
 * Resolve the base direction of one block.
 *
 * A block keeps the direction of its surroundings unless its own text is clearly the other
 * language: that is what stops one bullet opening with an English word — or a code span, a
 * number, a bold term — from flipping while the bullets around it stay put. Blocks with no
 * language of their own (only code, digits, or an emoji) simply inherit.
 */
export function resolveElementDirection(
  el: Element,
  inherited: BlockDirection | null,
): BlockDirection | null {
  const prose = directionalTextOf(el);

  // A container spans many sentences, so the dominant script decides. First-strong rules must
  // not apply here: an answer opening with "Certainly!" or a list whose first item starts with
  // a bold English term would otherwise turn the whole message LTR.
  if (isBlockContainer(el)) {
    return majorityDirection(prose) ?? inherited ?? fallbackDirection(el);
  }

  const detected = detectParagraphDirection(prose);
  if (detected === "neutral") return inherited ?? fallbackDirection(el);
  if (!inherited || detected === inherited) return detected;

  // Disagrees with the context: only a clear majority of its own letters may break ranks.
  return majorityDirection(prose) ?? inherited;
}

/** Last resort for blocks whose only text is technical (a lone code span, digits, an emoji). */
function fallbackDirection(el: Element): BlockDirection | null {
  const full = detectParagraphDirection((el.textContent ?? "").slice(0, DIRECTION_SAMPLE_LIMIT));
  return full === "neutral" ? null : full;
}

function markElement(el: HTMLElement, dir: BlockDirection | null, role: string): void {
  if (dir) {
    if (el.getAttribute(BF_DIR_ATTR) !== dir) {
      el.setAttribute(BF_DIR_ATTR, dir);
      el.setAttribute("dir", dir);
    }
  } else if (el.hasAttribute(BF_DIR_ATTR)) {
    el.removeAttribute(BF_DIR_ATTR);
    el.removeAttribute("dir");
  }
  if (el.getAttribute(BF_ROLE_ATTR) !== role) el.setAttribute(BF_ROLE_ATTR, role);
}

function markCodeElements(root: HTMLElement): void {
  for (const pre of root.querySelectorAll("pre")) {
    if (!(pre instanceof HTMLElement)) continue;
    pre.setAttribute(BF_ROLE_ATTR, "pre");
    pre.setAttribute("dir", "ltr");
  }

  for (const code of root.querySelectorAll("code, kbd, samp, var")) {
    if (!(code instanceof HTMLElement)) continue;
    if (code.closest("pre")) continue;
    code.setAttribute(BF_ROLE_ATTR, "code");
    code.setAttribute("dir", "ltr");
  }
}

function roleFor(el: Element): string | null {
  if (el.matches(LIST_SELECTOR)) return "list";
  if (el.matches(ITEM_SELECTOR)) return "item";
  if (el.matches(TABLE_SELECTOR)) return "table";
  if (el.matches(CELL_SELECTOR)) return "cell";
  if (el.matches(BLOCK_SELECTOR)) return "block";
  return null;
}

/**
 * Walk the subtree, giving every block its own direction and passing that direction down as the
 * fallback for children (so a code-only bullet keeps the direction of its list).
 */
function walkBlocks(parent: Element, inherited: BlockDirection | null): void {
  for (const child of parent.children) {
    if (!(child instanceof HTMLElement)) continue;
    if (child.matches("pre, code, kbd, samp, var, svg")) continue;
    if (child.isContentEditable) continue;

    const role = roleFor(child);
    if (!role) {
      walkBlocks(child, inherited);
      continue;
    }

    const dir = resolveElementDirection(child, inherited) ?? inherited;
    markElement(child, dir, role);
    walkBlocks(child, dir);
  }
}

/** Apply direction hints to a rendered message container. Idempotent and attribute-only. */
export function applyReaderBidi(root: HTMLElement): void {
  markCodeElements(root);
  const rootDir = resolveElementDirection(root, null);
  walkBlocks(root, rootDir);
}

/** Remove every hint this module added (used when the extension is switched off). */
export function clearReaderBidi(scope: ParentNode): void {
  for (const el of scope.querySelectorAll(`[${BF_DIR_ATTR}], [${BF_ROLE_ATTR}]`)) {
    if (!(el instanceof HTMLElement)) continue;
    if (el.hasAttribute(BF_DIR_ATTR)) {
      el.removeAttribute(BF_DIR_ATTR);
      el.removeAttribute("dir");
    }
    el.removeAttribute(BF_ROLE_ATTR);
  }
}
