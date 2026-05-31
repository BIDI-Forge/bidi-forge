# RTL Text Fixer (Chrome extension)

Manifest V3 extension that improves mixed Persian/Arabic + English readability by inserting Unicode bidi marks (LRM/RLM) into DOM text and editable fields.

**Current version:** `0.3.5` (see `src/manifest.json`).

## Install

**Chrome Web Store:** [BIDI - Forge](https://chromewebstore.google.com/detail/ffngaifiipbklkbobombbgaeokinepdc)

## Build (local / developers)

From the repo root:

```bash
pnpm install
pnpm -C packages/chrome-extension build
```

The extension bundle resolves `@rtl-text-fixer/core` from `packages/core/src` (esbuild `alias`), so you do **not** need to run `pnpm -C packages/core build` first for the Chrome `dist` output.

Load unpacked from `packages/chrome-extension/dist` in `chrome://extensions` (Developer mode). After each rebuild, open `chrome://extensions` and click **Reload** on this extension.

## Chrome Web Store upload

Prepare the signed upload ZIP and listing assets:

```bash
pnpm -C packages/chrome-extension pack:store
```

| Output | Path |
|--------|------|
| Upload ZIP | `store/release/rtl-text-fixer-chrome-0.3.5.zip` |
| Store icon 128×128 | `store/promo/icon-128.png` |
| Screenshot 1280×800 | `store/screenshots/screenshot-1280x800.png` |
| Listing copy (EN) | `store/LISTING.md` |
| Privacy policy | `store/privacy-policy.md` |
| Upload steps (FA) | `store/UPLOAD_GUIDE.md` |

Dashboard: [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole)

## How to test (e.g. Claude, ChatGPT)

1. Build, reload the extension, open the popup, set **Where it runs** to **All websites** (narrows down whether scope is the problem).
2. Ensure **Enable** is on.
3. Open `https://claude.ai` (or another chat), click in the **message composer**, and type a line that mixes Persian and Latin in one line, e.g. `سلام hello دنیا`.
4. Pause briefly after typing; the script runs on `input` with a short delay. In DevTools → Elements, text nodes may contain invisible LRM/RLM (U+200E/U+200F). If you **copy** text elsewhere, some apps show them as narrow gaps or `‎` — that usually means the extension **did** insert markers.

5. **If order still looks wrong inside the box** even though markers exist: the site may force LTR on the editor. This build sets `dir="auto"` and `unicode-bidi: plaintext` on wired textareas/contenteditables so the browser can use mixed direction with those markers.

### Claude: composer vs assistant reply

- **Composer (input)** — wired as a contenteditable; fixes run on `input` with block-level + per-node passes.
- **Assistant reply (main thread)** — handled by `messageSurfaces.ts`: targets `[data-testid="assistant-message"]`, `.standard-markdown`, and read-only `.ProseMirror`. Applies `unicode-bidi: plaintext` on paragraphs and coalesced marker fixes so paths like `/(marketing)/about` and mixed Persian/English lists render correctly. Fixes run after streaming finishes (`data-is-streaming` not true).

6. If nothing happens, open DevTools → **Console** on that tab and check for errors; confirm the site hostname matches your scope (for **AI chat sites only**, `claude.ai` is included in presets).

**Note:** Lines such as `[DatadogRUM]` or `[COMPLETION]` in the console come from the **website** (e.g. Claude), not from this extension. The content script does not log there by default.

**Google Gemini / Bard:** Red or yellow console lines about **Content Security Policy** and `googletagmanager.com` / `gtm.js` / `googleadservices.com` come from **Google’s own** scripts and tracking on that page. This extension does not load those URLs; you can ignore those messages for RTL troubleshooting. A string like `%E2%80%8E` in analytics query params is Unicode LRM sometimes picked up from the page title or UI — RTL Text Fixer does not modify `<title>` or the document head.

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
- **ProseMirror-style editors** (Claude, ChatGPT, …): while typing, only the **caret paragraph** is fixed (coalesced text-node update, no `execCommand` / `normalize()`). **Shift+Enter** gets a grace period so new lines are not fighting the fixer. On **blur**, all paragraphs are fixed. Bidi CSS hints apply **once** per composer (reduces Gemini layout jumping). Wired editors get `dir="auto"` and `unicode-bidi: plaintext`.
- **Gemini + Grok + ChatGPT composers** (`cssOnlyComposer.ts`): **CSS only** (`dir=auto`, `unicode-bidi: plaintext`) — **no LRM/RLM while typing** (Quill/ProseMirror spans break). Debounced strip of stray markers. Sites: `gemini.google.com`, `grok.com`, `x.ai`, X/Twitter `/grok`, `chatgpt.com`, `openai.com`.
- **Open shadow roots**: composer UI may live under shadow DOM; `src/domDeep.ts` + extra `MutationObserver`s on `ShadowRoot` cover those trees.
- Scope logic: `src/siteScope.ts`, storage keys in `src/storage.ts`.
- Built-in preset list lives in `BUILTIN_PRESET_HOSTS` in `siteScope.ts` (includes Google-related hosts used by Gemini embeds, e.g. `ogs.google.com`); update when major AI UIs change domains.
