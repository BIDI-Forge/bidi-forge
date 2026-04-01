# RTL Text Fixer (VS Code / Cursor)

Fix mixed Persian (RTL) and English (LTR) text readability by inserting Unicode bidirectional markers (LRM/RLM).

## Commands

- **RTL Fixer: اصلاح متن انتخاب‌شده** (`rtlFixer.fixSelectedText`)
  - Fixes the currently selected text in the active editor.
- **RTL Fixer: اصلاح متن کلیپ‌بورد** (`rtlFixer.fixClipboardText`)
  - Reads text from clipboard, fixes it, writes it back to clipboard.
  - Useful for Cursor Chat/Agent input: run the command, then paste into chat.
- **RTL Fixer: فعال‌سازی RTL برای UI (با Custom CSS)** (`rtlFixer.enableRtlUi`)
  - Enables an *opt-in* RTL workbench UI using the third-party **Custom CSS and JS Loader** extension.
- **RTL Fixer: غیرفعال‌سازی RTL برای UI (با Custom CSS)** (`rtlFixer.disableRtlUi`)
  - Disables the opt-in RTL workbench UI (requires reload).

## Keybindings (default)

- **Fix selected text**: `Ctrl+Alt+R` (macOS: `Cmd+Alt+R`)
- **Fix clipboard**: `Ctrl+Alt+Shift+R` (macOS: `Cmd+Alt+Shift+R`)

## Development

From the repo root:

```bash
pnpm dev
```

Then press `F5` using the repo `.vscode/launch.json`.

## RTL UI (Workbench) setup (Cursor / VS Code)

VS Code / Cursor extensions **cannot** officially flip the whole workbench UI to RTL. The practical approach is injecting CSS via the third-party extension:

- `be5invis.vscode-custom-css` (Custom CSS and JS Loader)

### Steps

1. Install this extension (`rtl-text-fixer-*.vsix`).
2. Install `be5invis.vscode-custom-css` (dependency).
3. Run: `RTL Fixer: فعال‌سازی RTL برای UI (با Custom CSS)`.
4. Run: `Enable Custom CSS and JS` (or `Reload Custom CSS and JS`).
5. Reload window: `Developer: Reload Window`.

### Notes

- **Windows**: you may need to run Cursor/VS Code as **Administrator** when enabling/disabling Custom CSS.
- This is **opt-in** and may break after Cursor/VS Code updates (DOM/CSS selectors can change).

### Recovery / reset

1. Run: `RTL Fixer: غیرفعال‌سازی RTL برای UI (با Custom CSS)`.
2. Run: `Disable Custom CSS and JS`.
3. Reload window.

