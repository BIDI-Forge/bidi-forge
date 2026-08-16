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

The extension bundle resolves `@bidi-forge/core` from `packages/core/src` (esbuild `alias`), so you do **not** need to run `pnpm -C packages/core build` first for the Chrome `dist` output.

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
4. Pause briefly after typing. On chat composers the fix is CSS-only, so nothing is written into the text: in DevTools → Elements the editor root should carry `class="bf-composer"`, and each line should align to its own language.

5. **If order still looks wrong inside the box**: the site may force LTR on the editor. This build sets `dir="auto"` and `unicode-bidi: plaintext` on wired textareas/contenteditables, and `content.css` re-applies `unicode-bidi: plaintext` to every block inside a `.bf-composer`.

6. On an assistant reply, check that blocks carry `data-bf-dir="rtl"` / `"ltr"` (added by `readerBidi.ts`). Message text is never modified, so copying a reply gives exactly what the model produced — no invisible LRM/RLM.

### Claude: composer vs assistant reply

Neither surface has its text rewritten — direction is decided per block and applied through
`src/content.css`, which the manifest injects (so a strict site CSP cannot block it).

- **Composer (input)** — `cssOnlyComposer.ts` adds the `bf-composer` class to the editor root, the
  one node whose attribute changes ProseMirror ignores. The stylesheet then gives every block
  `unicode-bidi: plaintext` (each line picks its own direction as you type) and moves list markers
  `inside`, so a bullet or number sits on the right for a Persian item and on the left for an
  English one — without writing into the DOM ProseMirror owns.
- **Assistant reply (main thread)** — `readerBidi.ts` resolves a direction per block and writes
  `data-bf-dir`. Inline `<code>`, code blocks, URLs, digits, bullets, and emoji are ignored when
  choosing that direction, so a Persian line opening with `` `useState` `` or `1.` stays RTL
  instead of anchoring on the first strong character the way `dir="auto"` does. A block keeps its
  surroundings' direction unless its own letters are clearly the other language, which is what
  keeps every item in one list on the same side. Hints are attributes only, are re-applied while
  the reply streams, and are removed when the extension is switched off.

7. If nothing happens, open DevTools → **Console** on that tab and check for errors; confirm the site hostname matches your scope (for **AI chat sites only**, `claude.ai` is included in presets).

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
