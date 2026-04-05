## Summary

Command titles are currently Persian-focused in `packages/vscode-extension/package.json` (`contributes.commands`). Some contributors and users prefer **English** UI strings.

## Goal

Provide English titles (or VS Code `title` with `%key%` plus `package.nls.json`) without removing Persian support if the project wants both.

## Scope

- Extension manifest and any related docs.
- Optional: a setting to choose display language for command titles if feasible.

## Acceptance criteria

- [ ] Document how English vs Persian titles work (README or extension README).
- [ ] `pnpm -C packages/vscode-extension lint` passes.

## Hints

- See [VS Code extension localization](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#localization).
