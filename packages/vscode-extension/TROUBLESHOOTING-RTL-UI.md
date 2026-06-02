# RTL UI troubleshooting (Custom CSS)

Use this checklist when **RTL Fixer: Enable RTL UI** does not change the workbench, or chat/notifications still look wrong.

## Prerequisites

1. Install [Custom CSS and JS Loader](https://marketplace.visualstudio.com/items?itemName=be5invis.vscode-custom-css) (`be5invis.vscode-custom-css`).
2. Run **RTL Fixer: Enable RTL UI (Custom CSS)** — this copies `assets/rtl-ui.css` into extension global storage and adds a `file://` import to `vscode_custom_css.imports`.
3. Run the loader’s **Enable Custom CSS and JS** command (exact label may vary by version).
4. **Developer: Reload Window** (required after every CSS change).

## Verify the import path

1. Open **Preferences: Open User Settings (JSON)**.
2. Find `vscode_custom_css.imports` — it should contain one `file://` URL ending in `rtl-ui.css` under your user profile (global storage for this extension).
3. If the path is missing or points to an old file, run **Disable RTL UI**, then **Enable RTL UI** again and reload.

## Platform notes

| Platform | Note |
|----------|------|
| **Windows** | Custom CSS often needs the editor started **as Administrator** once after enabling imports. |
| **Linux** | Ensure the `file://` path is readable; avoid symlinks that break after updates. |
| **macOS** | Gatekeeper rarely blocks `file://` CSS; if imports fail, re-run Enable and reload. |

## Symptom → action

| Symptom | What to try |
|---------|-------------|
| Nothing changes after enable | Custom CSS loader not enabled, or window not reloaded |
| Sidebar RTL but editor flipped | Report a bug — v2 CSS keeps `.monaco-editor` LTR; you may have another CSS import |
| Notifications still LTR/mirrored | Expected partial fix: notifications use `plaintext` in `rtl-ui.css`; also set `rtlFixer.uiMessageDirection` to `rtl` |
| AI chat / Composer input wrong order | Reload after update; host DOM changes between releases — see [rtl-ui.css](assets/rtl-ui.css) Cursor/VS Code chat section |
| Quick Open paths reversed | Reload; v2 sets `direction: auto` on quick input fields |

## Recovery (disable everything)

1. **RTL Fixer: Disable RTL UI (Custom CSS)**
2. Loader: **Disable Custom CSS and JS**
3. **Developer: Reload Window**

## Tested editor builds (best-effort)

CSS selectors are maintained against recent **VS Code 1.90+** and **Cursor** chat/composer DOM. After a major host upgrade, chat rules may need a small selector patch even when the rest of the workbench still works.

## Related

- [README.md](README.md) — setup steps
- [CONTRIBUTING.md](../../CONTRIBUTING.md) — reporting selector breakage with host version
