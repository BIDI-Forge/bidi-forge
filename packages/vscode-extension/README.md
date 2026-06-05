# BIDI · Forge (VS Code)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/BIDI-Forge/bidi-forge/blob/main/LICENSE)
[![Open VSX](https://img.shields.io/badge/Open%20VSX-amirmkazemi.bidi--forge-blue)](https://open-vsx.org/extension/amirmkazemi/bidi-forge)
[![GitHub](https://img.shields.io/badge/GitHub-BIDI--Forge%2Fbidi--forge-181717)](https://github.com/BIDI-Forge/bidi-forge)

Fix mixed **Persian, Arabic (RTL)** and **English (LTR)** text in VS Code and VSCodium using standard Unicode bidirectional markers (LRM, RLM, isolates).

## Overview

When RTL and LTR scripts appear in the same line, editors and chat panels often show **scrambled word order**, mirrored punctuation, or broken URLs. **BIDI · Forge** inserts invisible Unicode marks so the visual order matches what you typed—without changing the visible characters.

**Typical uses**

- Fix a selected paragraph in source files or Markdown
- Fix the clipboard before pasting into an AI chat web app (use with the browser extension for in-page fixes)
- Optional **RTL UI** hints for the workbench via scoped CSS (requires [Custom CSS and JS Loader](https://marketplace.visualstudio.com/items?itemName=be5invis.vscode-custom-css))

**Example**

| Before (logical) | After (invisible markers added) |
|------------------|----------------------------------|
| `سلام hello دنیا` | `سلام ‎hello‎ دنیا` |

Supports **Persian (Farsi)**, **Arabic**, and **English** mixed with numbers, URLs, emails, and inline `` `code` ``.

## Features

- **Fix selected text** — command + `Ctrl+Alt+R` (`Cmd+Alt+R` on macOS)
- **Fix clipboard** — command + `Ctrl+Alt+Shift+R` for paste workflows
- **Fix on paste** — optional setting `rtlFixer.fixOnPaste`
- **BiDi-safe notifications** — setting `rtlFixer.uiMessageDirection` (`rtl` / `ltr` / `auto`)
- **Settings webview** — built-in guide and examples
- **Status bar** — RTL UI on/off indicator
- **Localized command titles** — English (`package.nls.json`) and Persian (`package.nls.fa.json`)
- **Opt-in RTL workbench CSS** — `assets/rtl-ui.css` v2 via Custom CSS loader (sidebar, notifications, quick input, chat inputs)

## Requirements

- **VS Code** `^1.90.0` (or compatible editor using Open VSX, e.g. VSCodium)
- **Custom CSS loader** — only if you enable RTL UI (`be5invis.vscode-custom-css`)

## Commands

| English title | Command ID |
|---------------|------------|
| Fix selected text | `rtlFixer.fixSelectedText` |
| Fix clipboard text | `rtlFixer.fixClipboardText` |
| Settings and guide | `rtlFixer.openSettings` |
| Enable RTL UI (Custom CSS) | `rtlFixer.enableRtlUi` |
| Disable RTL UI (Custom CSS) | `rtlFixer.disableRtlUi` |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `rtlFixer.uiMessageDirection` | `rtl` | Base direction for extension messages |
| `rtlFixer.fixOnPaste` | `false` | Auto-fix mixed text when pasting in the editor |

## RTL UI (optional)

VS Code cannot officially RTL the entire workbench. This extension ships scoped [`assets/rtl-ui.css`](assets/rtl-ui.css) injected through **Custom CSS and JS Loader**:

1. Install this extension and the Custom CSS loader.
2. Run **RTL Fixer: Enable RTL UI (Custom CSS)**.
3. Run the loader’s **Enable Custom CSS and JS**, then **Developer: Reload Window**.

See **[TROUBLESHOOTING-RTL-UI.md](TROUBLESHOOTING-RTL-UI.md)** for import paths, Windows notes, and recovery steps.

## Troubleshooting

| Issue | Action |
|-------|--------|
| Notifications still wrong | Enable Custom CSS + reload; set `rtlFixer.uiMessageDirection` to `rtl` |
| Chat input order wrong | Enable RTL UI v2 CSS; editor updates may need selector tweaks in `rtl-ui.css` |
| Paths inverted in Quick Open | v2 uses `direction: auto` on quick input — reload after CSS update |

## Development

From the monorepo root:

```bash
pnpm install
pnpm -C packages/vscode-extension test
pnpm -C packages/vscode-extension build
```

Press `F5` with the workspace launch configuration.

## Resources

| Resource | Link |
|----------|------|
| **Homepage** | https://github.com/BIDI-Forge/bidi-forge |
| **Repository** | https://github.com/BIDI-Forge/bidi-forge |
| **Bug reports** | https://github.com/BIDI-Forge/bidi-forge/issues |
| **VS Code extension source** | https://github.com/BIDI-Forge/bidi-forge/tree/main/packages/vscode-extension |
| **Chrome extension (BIDI · Forge)** | https://chromewebstore.google.com/detail/ffngaifiipbklkbobombbgaeokinepdc |
| **Extension ID** | `amirmkazemi.bidi-forge` |
| **Publisher** | `amirmkazemi` |
| **VSIX filename** | `BIDI-Forge-0.3.2.vsix` (version may vary) |
| **License** | [MIT](https://github.com/BIDI-Forge/bidi-forge/blob/main/LICENSE) |

## Related packages

Same BiDi engine powers the open-source monorepo [`BIDI-Forge/bidi-forge`](https://github.com/BIDI-Forge/bidi-forge): `@bidi-forge/core`, Chrome MV3 extension, and CLI.
