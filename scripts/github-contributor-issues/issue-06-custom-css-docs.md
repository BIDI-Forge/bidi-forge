## Summary

The root README describes `be5invis.vscode-custom-css` and reload steps. The path from “install extension” to “RTL chat works” is easy to get wrong.

## Goal

Add a **troubleshooting** section: wrong file path, CSP, Cursor vs VS Code differences, “Reload Custom CSS”, etc.

## Scope

- `CONTRIBUTING.md` and/or `packages/vscode-extension/README.md` (keep duplication minimal; cross-link).

## Acceptance criteria

- [ ] Checklist from install → verified RTL in chat (or documented limitations).
- [ ] Common failure modes and fixes listed.

## Hints

- Custom CSS asset: `packages/vscode-extension/assets/cursor-agent-rtl.css`.
