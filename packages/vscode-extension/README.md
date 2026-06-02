# RTL Text Fixer (VS Code)

Fix mixed Persian (RTL) and English (LTR) text readability using Unicode bidirectional markers and BiDi-safe UI helpers.

## Commands

| Command | ID | Description |
|---------|-----|-------------|
| اصلاح متن انتخاب‌شده | `rtlFixer.fixSelectedText` | Fix selected editor text |
| اصلاح متن کلیپ‌بورد | `rtlFixer.fixClipboardText` | Fix clipboard (paste into chat) |
| تنظیمات و راهنما | `rtlFixer.openSettings` | BiDi-safe settings/help webview |
| فعال‌سازی RTL UI | `rtlFixer.enableRtlUi` | Inject scoped `rtl-ui.css` via Custom CSS |
| غیرفعال‌سازی RTL UI | `rtlFixer.disableRtlUi` | Remove CSS import |

## Keybindings (default)

- **Fix selected text**: `Ctrl+Alt+R` (macOS: `Cmd+Alt+R`)
- **Fix clipboard**: `Ctrl+Alt+Shift+R` (macOS: `Cmd+Alt+Shift+R`)

## Status bar

A status bar item shows **RTL UI: فعال/غیرفعال** and opens the settings webview on click.

## Settings

- `rtlFixer.uiMessageDirection` — `rtl` (default), `ltr`, or `auto` for notification BiDi formatting
- `rtlFixer.fixOnPaste` — automatically fix mixed text when you paste (default: off)

## RTL UI (Workbench) setup

VS Code **cannot** officially RTL the whole workbench. This extension ships **scoped** [`assets/rtl-ui.css`](assets/rtl-ui.css) (v2) injected through:

- [`be5invis.vscode-custom-css`](https://marketplace.visualstudio.com/items?itemName=be5invis.vscode-custom-css) (install separately; not a hard dependency)

### Steps

1. Install this extension.
2. Install **Custom CSS and JS Loader**.
3. Run: **RTL Fixer: فعال‌سازی RTL برای UI (با Custom CSS)**.
4. Run: **Enable Custom CSS and JS** (or Reload).
5. **Developer: Reload Window**.

### What v2 CSS does

- RTL on layout chrome (sidebar, panel, status bar) — not global `body` flip
- `unicode-bidi: plaintext` + `direction: auto` on notifications, settings, quick input
- Editor, terminal, hovers stay **LTR**
- Best-effort AI chat/composer selectors where the host supports Custom CSS

### Platform limits

- Notification DOM cannot be patched via extension API (CSS only).
- Chat UI selectors may break between editor releases.
- **Windows**: Custom CSS may require running the editor as Administrator.

### Recovery

1. **RTL Fixer: غیرفعال‌سازی RTL برای UI**
2. **Disable Custom CSS and JS**
3. Reload window

## Development

```bash
pnpm dev          # from repo root
pnpm -C packages/vscode-extension test
```

Press `F5` with the repo launch config.

## Troubleshooting

| Issue | Action |
|-------|--------|
| Notifications still wrong | Enable Custom CSS + reload; set `rtlFixer.uiMessageDirection` to `rtl` |
| Chat input order wrong | Enable RTL UI v2 CSS; editor updates may require selector tweaks in `rtl-ui.css` |
| Paths inverted in Quick Open | v2 uses `direction: auto` on quick input — reload after CSS update |

## Related

- **Chrome extension:** [BIDI - Forge on Chrome Web Store](https://chromewebstore.google.com/detail/ffngaifiipbklkbobombbgaeokinepdc)
- **Monorepo:** [github.com/BIDI-Forge/bidi-forge](https://github.com/BIDI-Forge/bidi-forge)
