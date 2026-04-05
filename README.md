# RTL Text Fixer

<p align="center">
  <img src="assets/logo.png" alt="RTL Text Fixer logo" width="160" />
</p>

Fix mixed Persian (RTL) and English (LTR) text readability issues by automatically inserting Unicode bidirectional markers (LRM/RLM).

## Badges

- **License**: MIT
- **Version (VS Code extension)**: 0.1.0
- **Stack**: TypeScript + pnpm (workspace) + Node.js 18+

## Features

- **Fix mixed RTL/LTR**: inserts invisible bidi markers so text renders in the intended order.
- **VS Code / Cursor**: fix selected text or clipboard via commands/keybindings.
- **Chrome (MV3)**: fixes DOM text nodes with an enable/disable toggle (sync storage).
- **Core engine**: reusable TypeScript function you can import in other apps.

## What it does

When Persian and English are mixed, some renderers show confusing ordering. This project improves readability by inserting invisible Unicode markers:

- **LRM**: `\u200E` (Left-to-Right Mark)
- **RLM**: `\u200F` (Right-to-Left Mark)

Example:

- **Input**: `سلام hello دنیا`
- **Output**: `سلام \u200Ehello\u200E دنیا`

## Quick Start / Installation

Requirements:

- Node.js 18+
- pnpm 9+

Install deps:

```bash
pnpm install
```

Build everything once:

```bash
pnpm build
```

Watch mode (build on change):

```bash
pnpm dev
```

Run tests (core only currently has tests):

```bash
pnpm test
```

Format and lint:

```bash
pnpm format
pnpm lint
```

## Usage

### Using the core engine

The core package exports:

- `fixMixedText(text: string): string`
- `detectLanguage(segment)`
- `tokenizeText(text)`
- `applyBidiMarkers(tokens)`

### VS Code & Cursor

- **Command**: `RTL Fixer: اصلاح متن انتخاب‌شده`
- **Command (Clipboard)**: `RTL Fixer: اصلاح متن کلیپ‌بورد`
- **Activation**: `onCommand:rtlFixer.fixSelectedText`
- **Example keybinding**: `Ctrl+Alt+R` (macOS: `Cmd+Alt+R`)
- **Example keybinding (Clipboard)**: `Ctrl+Alt+Shift+R` (macOS: `Cmd+Alt+Shift+R`)

More details: `packages/vscode-extension/README.md`

#### RTL UI (Workbench) for Cursor / VS Code (opt-in)

VS Code / Cursor extensions **cannot** officially flip the whole workbench UI to RTL. This repo provides an *opt-in* workflow using the third-party extension `be5invis.vscode-custom-css` (Custom CSS and JS Loader) to inject an RTL stylesheet while keeping the code editor and terminal LTR.

High-level steps:

- Install `packages/vscode-extension/rtl-text-fixer-*.vsix`
- Install `be5invis.vscode-custom-css`
- Run: `RTL Fixer: فعال‌سازی RTL برای UI (با Custom CSS)`
- Run: `Enable Custom CSS and JS` (or `Reload Custom CSS and JS`)
- Reload window (`Developer: Reload Window`)

To run/debug locally:

- Open `packages/vscode-extension` in VS Code
- Run `pnpm build` at the repo root (or `pnpm -C packages/vscode-extension dev`)
- Press `F5` to start an Extension Development Host

### Chrome extension (Manifest V3)

Build output is a loadable folder:

- `packages/chrome-extension/dist`

To load unpacked:

- Chrome → `chrome://extensions`
- Enable **Developer mode**
- **Load unpacked** → select `packages/chrome-extension/dist`

The popup provides an enable/disable toggle using `chrome.storage.sync`.

## Examples

- **Mixed text**: `سلام hello دنیا` → `سلام \u200Ehello\u200E دنیا`
- **Clipboard workflow (Cursor Chat)**: run `RTL Fixer: اصلاح متن کلیپ‌بورد` → paste into chat.

## Supported languages

- **فارسی** (Persian / Farsi)
- **عربی** (Arabic)
- **English** (and other LTR scripts)

> نکته: این ابزار روی «ترکیب RTL/LTR» تمرکز دارد و برای هر متنی که ترکیب اسکریپت‌ها باعث بهم‌ریختگی ترتیب می‌شود مفید است.

## Downloads

- **VS Code / Cursor**: build a `.vsix` from `packages/vscode-extension`:

```bash
pnpm -C packages/vscode-extension package
```

- **Chrome**: build and load unpacked from `packages/chrome-extension/dist`:

```bash
pnpm -C packages/chrome-extension build
```

## Architecture

Monorepo (pnpm workspace):

- `packages/shared`: shared TypeScript types
- `packages/core`: reusable text engine (`fixMixedText(text)`)
- `packages/vscode-extension`: VS Code extension that fixes selected text
- `packages/chrome-extension`: Chrome MV3 extension that fixes DOM text nodes

## Contributing

- See `CONTRIBUTING.md`.
- Please follow `CODE_OF_CONDUCT.md`.

## Security

If you discover a security issue, please follow `SECURITY.md` for responsible disclosure.

## License

MIT — see `LICENSE`.

For open-source projects, the MIT License is a popular choice because it is simple and permissive.

## Acknowledgments

- Unicode bidirectional marks: LRM/RLM
- Opt-in workbench RTL approach powered by `be5invis.vscode-custom-css`

## Publishing

- **VS Code / Cursor**: from `packages/vscode-extension` run `pnpm package` to build a `.vsix`.
- **Chrome**: zip `packages/chrome-extension/dist` and upload to Chrome Web Store.

### CI/CD (GitHub Actions) for VS Code Marketplace

This repo publishes the VS Code extension when you push a version tag that matches the extension version.

- **Required secret**: add a GitHub Actions repository secret named `VSCE_PAT` containing a VS Code Marketplace Personal Access Token with publish rights for publisher `amirmkazemi`.
- **Release flow**:
  - Bump `packages/vscode-extension/package.json` version (e.g. to `0.1.1`)
  - Commit and push
  - Create and push tag `v0.1.1`
  - GitHub Actions will package a `.vsix` and publish it to the Marketplace
