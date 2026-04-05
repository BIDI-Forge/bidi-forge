## Summary

The repo ships an opt-in RTL stylesheet for the interactive session (Agent / Chat panel): `packages/vscode-extension/assets/cursor-agent-rtl.css`. Cursor and VS Code DOM/class names change between versions, so selectors often drift.

## Goal

Keep chat **messages** and the **chat input** readable in RTL for Persian/Arabic users while preserving **code blocks** LTR.

## Scope

- Audit current Cursor and VS Code stable builds; update selectors for Agent / Chat / Composer panels where applicable.
- Document in `packages/vscode-extension/README.md` which UI areas are covered and any known gaps.

## Acceptance criteria

- [ ] Updated CSS works on at least one documented VS Code version and one documented Cursor version (state versions in the PR).
- [ ] `pre` / `code` regions remain LTR.
- [ ] No change to default extension behavior for users who do not enable Custom CSS.

## Hints

- README: workbench RTL workflow with `be5invis.vscode-custom-css`.
- When opening a PR, link this issue (e.g. `Fixes #…`).
