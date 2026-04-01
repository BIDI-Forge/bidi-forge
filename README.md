## RTL Text Fixer

Production-ready TypeScript monorepo for fixing mixed Persian (RTL) and English (LTR) text readability issues by automatically inserting Unicode bidirectional markers.

### What it does

When Persian and English are mixed, some renderers show confusing ordering. This project improves readability by inserting invisible Unicode markers:

- **LRM**: `\u200E` (Left-to-Right Mark)
- **RLM**: `\u200F` (Right-to-Left Mark)

Example:

- **Input**: `سلام hello دنیا`
- **Output**: `سلام \u200Ehello\u200E دنیا`

### Architecture

Monorepo (pnpm workspace):

- `packages/shared`: shared TypeScript types
- `packages/core`: reusable text engine (`fixMixedText(text)`)
- `packages/vscode-extension`: VS Code extension that fixes selected text
- `packages/chrome-extension`: Chrome MV3 extension that fixes DOM text nodes

### Installation

Requirements:

- Node.js 18+
- pnpm 9+

Install deps:

```bash
pnpm install
```

### Development

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

### Using the core engine

The core package exports:

- `fixMixedText(text: string): string`
- `detectLanguage(segment)`
- `tokenizeText(text)`
- `applyBidiMarkers(tokens)`

### VS Code extension

- **Command**: `RTL Fixer: اصلاح متن انتخاب‌شده`
- **Command (Clipboard)**: `RTL Fixer: اصلاح متن کلیپ‌بورد`
- **Activation**: `onCommand:rtlFixer.fixSelectedText`
- **Example keybinding**: `Ctrl+Alt+R` (macOS: `Cmd+Alt+R`)
- **Example keybinding (Clipboard)**: `Ctrl+Alt+Shift+R` (macOS: `Cmd+Alt+Shift+R`)

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

### Publishing

- **VS Code / Cursor**: from `packages/vscode-extension` run `pnpm package` to build a `.vsix`.
- **Chrome**: zip `packages/chrome-extension/dist` and upload to Chrome Web Store.
