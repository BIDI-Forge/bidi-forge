# RTL Text Fixer (Chrome extension)

Manifest V3 extension that improves mixed Persian/Arabic + English readability by inserting Unicode bidi marks (LRM/RLM) into DOM text and editable fields.

## Build

From the repo root:

```bash
pnpm install
pnpm -C packages/chrome-extension build
```

The extension bundle resolves `@rtl-text-fixer/core` from `packages/core/src` (esbuild `alias`), so you do **not** need to run `pnpm -C packages/core build` first for the Chrome `dist` output.

Load unpacked from `packages/chrome-extension/dist` in `chrome://extensions` (Developer mode).

## Settings

### Enable

Synced per Chrome profile (`chrome.storage.sync`). When off, the content script stays injected but does no work.

### Where it runs

- **All websites** — Same behavior as early releases: when enabled, fixes run on every matching page.
- **AI chat sites only** — Runs only on built-in host presets (ChatGPT/OpenAI, Gemini, Claude/Anthropic, Copilot, Perplexity, DeepSeek, X/Twitter, Qwen, Meta AI, etc.) plus any **Extra hosts** you list. Hostnames are matched by suffix (e.g. `openai.com` matches `chat.openai.com`).
- **Never run on these hosts** — One hostname per line (or comma-separated). Applies in **both** scope modes; useful if a preset site breaks on a specific subdomain.

You can paste full URLs in host lists; hostnames are extracted automatically.

## Manual test checklist (PR / release)

1. `pnpm -C packages/chrome-extension build` completes without errors.
2. Load unpacked `dist`, turn **Enable** on.
3. **All websites**: open any mixed RTL/LTR page and confirm non-destructive fixing (code in `pre`/`code` should stay skipped by the content script).
4. **AI chat sites only**: on a known chat host (e.g. ChatGPT), confirm fixing still runs; on an unrelated site (e.g. a news site), confirm no visible changes from this extension.
5. Add a host to **Never run** and reload that site; confirm fixing stops.
6. Toggle **Enable** off and on; confirm observers stop/start as expected.

## Implementation notes

- Content script entry: `src/content.ts`.
- Scope logic: `src/siteScope.ts`, storage keys in `src/storage.ts`.
- Built-in preset list lives in `BUILTIN_PRESET_HOSTS` in `siteScope.ts`; update when major AI UIs change domains.
