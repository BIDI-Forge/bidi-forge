## Summary

Users copy mixed RTL/LTR replies from web UIs (ChatGPT, Gemini, Grok, etc.) into editors or chats. The command `rtlFixer.fixClipboardText` runs `fixMixedText` on the clipboard (`packages/vscode-extension/src/extension.ts`).

## Goal

Improve robustness for **real-world paste samples** from major AI products: extra whitespace, markdown fragments, inline code, bullets, and link-heavy paragraphs.

## Scope

- Prefer extending `packages/core` (tokenizer / `fixMixedText`) with tests in `packages/core/src/__tests__/`.
- Add **golden fixtures**: short anonymized samples (no API keys) that fail today and pass after the fix.

## Acceptance criteria

- [ ] New unit tests with pasted-style samples.
- [ ] `pnpm test` and `pnpm lint` pass.
- [ ] Short note in PR on which patterns were fixed (e.g. punctuation boundaries, repeated LTR islands).

## Hints

- Core entry: `fixMixedText` from `@rtl-text-fixer/core`.
