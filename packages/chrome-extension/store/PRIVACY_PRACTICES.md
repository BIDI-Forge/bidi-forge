# Privacy practices — copy/paste for Chrome Web Store

تب **Privacy practices** در داشبورد. بعد از پر کردن → **Save draft**.

---

## ۱. Single purpose description

```
This extension has one purpose: improve the visual reading order of mixed right-to-left and left-to-right text on web pages by inserting Unicode bidirectional formatting characters (LRM, RLM, isolates) and applying limited CSS direction hints (dir=auto, unicode-bidi: plaintext) where needed.
```

---

## ۲. Host permission justification (`<all_urls>` / site access)

```
The extension must access the DOM of pages the user opens so it can read and update visible text and editable fields (textareas, contenteditable composers) to fix mixed RTL/LTR rendering. This is the core function of the product.

Users control where it runs: they can enable “AI chat sites only” (built-in presets) or exclude specific hostnames in the popup. When disabled, the extension does no work.

No page content, chat messages, or browsing data are transmitted to the developer. All processing happens locally in the user’s browser.
```

---

## ۳. Storage permission justification

```
The storage permission is used only to save the user’s extension preferences in chrome.storage.sync: whether the extension is enabled, site scope mode (all websites vs AI chat presets), and optional include/exclude hostname lists entered by the user.

These settings sync through Google Chrome’s sync service so preferences can follow the user’s profile. The developer does not receive this data.
```

---

## ۴. Remote code justification

**در سوال «Do you use remote code?» حتماً بزن: No**

سپس در فیلد justification (اگر خواست):

```
This extension does not use remote code. All JavaScript (content script, service worker, popup) is bundled and shipped inside the uploaded package. No scripts, WASM, or eval’d code are loaded or executed from external servers at runtime.
```

---

## ۵. Data usage — certification

در همان تب:

| سوال | جواب |
|------|------|
| Does your extension collect user data? | **No** |
| Remote code | **No** |
| Privacy policy URL | `https://github.com/BIDI-Forge/bidi-forge/blob/main/packages/chrome-extension/store/privacy-policy.md` |

تیک **certify** را بزن که usage با [Developer Programme Policies](https://developer.chrome.com/docs/webstore/program-policies/) مطابقت دارد.

---

## ۶. Support link (Store listing tab — نه Privacy)

اگر «Support link is not valid» می‌گیری:

**اول این را امتحان کن (Store listing → Support):**
```
https://github.com/BIDI-Forge/bidi-forge/issues
```

**اگر باز invalid بود، این:**
```
https://github.com/BIDI-Forge/bidi-forge
```

نکته‌ها:
- حتماً `https://` باشد (نه `http://`)
- بدون فاصله یا `/` اضافه در آخر
- ریپو باید **public** باشد
- بعد از تغییر → **Save draft** در Store listing

---

## ترتیب پر کردن

1. **Privacy practices** — Single purpose + سه justification + No remote code + No data collection + Privacy policy URL + Certify
2. **Store listing** — Support URL را درست کن → Save draft
3. بالای صفحه چک کن خطاهای قرمز رفته باشند
4. **Submit for review**
