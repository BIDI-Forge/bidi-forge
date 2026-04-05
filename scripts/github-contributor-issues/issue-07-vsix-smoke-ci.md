## Summary

Publishing uses `vsce package` (`packages/vscode-extension`). There is no automated check that the packaged artifact activates and registers commands.

## Goal

Add a minimal **smoke** step (script or CI job) that builds the VSIX and sanity-checks manifest / contributed commands.

## Scope

- GitHub Actions workflow under `.github/workflows/` and/or a `pnpm` script.
- Document how to run locally.

## Acceptance criteria

- [ ] CI or script verifies VSIX build and basic manifest expectations (e.g. required commands present).
- [ ] PR describes how maintainers should interpret failures.

## Hints

- A `.vsix` is a zip; unpacking and reading `extension/package.json` may be enough for a first version.
