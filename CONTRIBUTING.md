# Contributing

Thanks for taking the time to contribute to **RTL Text Fixer**.

This repo is a TypeScript monorepo (pnpm workspace). Contributions are welcome in:

- **Core engine** (`packages/core`)
- **VS Code / Cursor extension** (`packages/vscode-extension`)
- **Chrome extension** (`packages/chrome-extension`)
- **Docs** and examples

## Quick start (dev)

Requirements:

- Node.js 18+
- pnpm 9+

Install and build:

```bash
pnpm install
pnpm build
```

Useful commands:

```bash
pnpm dev
pnpm test
pnpm lint
pnpm format
```

## Reporting bugs

Before opening a new issue:

- Make sure you are on the latest `main`.
- Search existing issues for duplicates.

When opening an issue, include:

- What you expected vs what happened
- Minimal reproducible text sample (copy/paste)
- Where you saw the problem (VS Code/Cursor, Chrome, website/app, OS)
- Screenshots (optional) showing the rendering problem

## Proposing changes

For non-trivial changes (new behavior, new options, algorithm changes):

- Open an issue first describing the goal and a few examples.
- Discuss edge-cases: punctuation, numbers, URLs, code blocks, emojis.

## Pull requests

### What to include

- A clear description of the change and the “why”
- Test cases (unit tests for `packages/core` if applicable)
- Before/after examples (especially for bidi rendering changes)

### Style and quality

- Keep changes small and focused
- Run `pnpm lint` and `pnpm test` before opening the PR
- Keep formatting consistent (`pnpm format`)

### Monorepo notes

- Prefer updating the **core** behavior first, then consuming it in extensions.
- If you change the algorithm, update any docs/examples that show output.

## Change review process

This is the default review flow:

1. **Open a PR** against `main` with a clear summary and examples.
2. **Automated checks** should pass (lint/test/build when applicable).
3. **Review**: maintainers may request changes for edge-cases or style.
4. **Approval**: once approved, a maintainer merges the PR.

Notes:

- For user-facing changes, include a short note in the PR describing impact on Persian/Arabic mixed text.
- For changes affecting VS Code/Cursor UI injection, mention the tested version(s) of VS Code/Cursor.

## Code of Conduct

By participating, you agree to follow `CODE_OF_CONDUCT.md`.

## License

By contributing, you agree that your contributions will be licensed under the MIT License (see `LICENSE`).

