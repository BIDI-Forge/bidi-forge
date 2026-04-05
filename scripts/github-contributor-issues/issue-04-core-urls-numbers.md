## Summary

Mixed-script text often includes **URLs**, **emails**, **digits**, and **emoji**. The engine should not corrupt these while fixing paragraph-level order.

## Goal

Define expected behavior with tests; adjust `packages/core` only where tests prove a bug.

## Scope

- `packages/core` (`tokenizer`, `bidiFixer`, `languageDetector` as needed).
- New / extended cases in `packages/core/src/__tests__/fixMixedText.test.ts` (or focused test files).

## Acceptance criteria

- [ ] New tests covering agreed examples (URLs, emails, numbers, emoji combinations with Persian/Arabic).
- [ ] No regressions in existing `fixMixedText` tests.

## Hints

- Good first issue if you start from failing examples and minimal code changes.
