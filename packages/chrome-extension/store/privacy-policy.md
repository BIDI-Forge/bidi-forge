# Privacy Policy — BIDI - Forge (Chrome Extension)

**Last updated:** May 2026  
**Extension:** BIDI - Forge  
**Publisher:** amirmkazemi

## Summary

BIDI - Forge runs entirely in your browser. It does **not** collect, sell, or transmit your personal data to our servers. We do not operate a backend service for this extension.

## What the extension does

When enabled, the extension may:

- Read and update text in web pages you visit (to insert Unicode bidirectional formatting characters).
- Read and update text in editable fields (textareas, contenteditable regions) while you type.
- Store your preferences in **Chrome sync storage** (`chrome.storage.sync`), including:
  - Whether the extension is enabled
  - Site scope mode (all websites vs AI chat presets only)
  - Optional include/exclude host lists you enter

These settings sync only through Google’s Chrome sync infrastructure, subject to [Google’s privacy policy](https://policies.google.com/privacy).

## What we do not do

- No analytics or tracking SDKs
- No remote servers receiving page content
- No sale of user data
- No access to passwords, payment data, or browsing history databases

## Permissions

| Permission | Why |
|------------|-----|
| `storage` | Save enable/disable and site scope settings in your profile |
| Content on matched pages | Apply BiDi fixes only when enabled and allowed by your scope settings |

The extension is injected on broad URL patterns so it can run on AI chat sites you choose. You can limit scope to **AI chat sites only** or exclude hosts in the popup.

## Third-party sites

Fixing runs on pages you open (e.g. ChatGPT, Claude, Gemini). Those sites have their own privacy policies. This extension does not change what data those sites collect.

## Children

The extension is not directed at children under 13.

## Changes

We may update this policy when the extension changes. The latest version is in the project repository.

## Contact

Open an issue on the project repository:  
https://github.com/BIDI-Forge/bidi-forge/issues
