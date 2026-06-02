# [Bug] Text selection in composer is jumpy / interferes with invisible BiDi markers

## Summary

When selecting mixed Persian + English text in AI chat composers (especially **Claude.ai**), the selection highlight does not behave like native browser selection. Boundaries jump, ranges feel “broken”, or the DOM is rewritten while the user is drag-selecting.

## Steps to reproduce

1. Install BIDI - Forge and open **claude.ai**
2. Type mixed text, e.g. `Hello سلام` or `1. Hello سلام`
3. Click and drag to select part of the text

## Expected

- Selection behaves like a normal `contenteditable` field (continuous highlight, predictable start/end)

## Actual

- Selection feels wrong or resets while selecting
- Invisible Unicode BiDi markers (LRM/RLM) in the live DOM confuse selection boundaries

## Root cause (technical)

- Inserting LRM/RLM into the live ProseMirror composer while typing
- DOM rewrite during `selectionchange` / debounced input fixes
- Caret restoration logic that only handled collapsed carets, not ranges

## Proposed fix

- **Claude**: CSS-only BiDi while focused; apply markers on **blur** only
- Pause composer DOM fixes while the user has a non-collapsed selection
- Restore full selection `Range` after block-level marker fixes when needed

## Labels

`bug`, `chrome-extension`, `claude`
