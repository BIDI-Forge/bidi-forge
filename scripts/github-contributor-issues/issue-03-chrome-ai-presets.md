## Summary

The MV3 extension fixes DOM text nodes globally when enabled (`packages/chrome-extension`). Some sites—including AI chat UIs—may need different treatment or exclusions.

## Goal

Let users get sensible behavior on **chat.openai.com**, **gemini.google.com**, **x.com** (Grok), etc., without breaking the whole page.

## Scope

- Design minimal UX (e.g. presets, optional URL patterns, or documented safe defaults—pick the smallest viable change).
- Respect existing `chrome.storage.sync` toggle behavior.

## Acceptance criteria

- [ ] Behavior documented in `packages/chrome-extension` README.
- [ ] Build still produces a loadable `dist` folder; manual test steps in PR.

## Hints

- Start from `packages/chrome-extension/src/content.ts` and popup UI.
