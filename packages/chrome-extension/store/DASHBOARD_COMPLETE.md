# تکمیل حرفه‌ای لیستینگ موجود — Chrome Web Store

آیتم شما:  
https://chrome.google.com/webstore/devconsole/23f05dd1-6711-483f-982f-86caf4058ec8

ZIP آپلود: `store/release/rtl-text-fixer-chrome-0.3.5.zip`  
(`pnpm -C packages/chrome-extension pack:store`)

---

## ترتیب کار در داشبورد

| # | تب | کار |
|---|-----|-----|
| 1 | **Build** / Package | آپلود ZIP v0.3.5 |
| 2 | **Store listing** | متن + گرافیک (پایین) |
| 3 | **Privacy** | Single purpose + policy URL |
| 4 | **Distribution** | Public + مناطق |
| 5 | **Submit for review** | وقتی همه سبز شد |

---

## ۱ — Build (Package)

1. تب **Package** → **Upload new package**
2. فایل: `packages/chrome-extension/store/release/rtl-text-fixer-chrome-0.3.5.zip`
3. تا وضعیت **Ready** / بدون خطا بمان
4. نسخه باید **0.3.5** باشد (با manifest یکی)

---

## ۲ — Store listing

### Product details

| فیلد | مقدار (کپی کن) |
|------|----------------|
| **Extension name** | `BIDI - Forge` |
| **Summary** (short) | `Fix mixed Persian, Arabic & English in AI chats (Claude, ChatGPT, Gemini, Grok). Unicode BiDi — 100% local, no tracking.` |
| **Description** | بلوک «Detailed description» پایین همین فایل |
| **Category** | `Productivity` ← همین را بزن |
| **Language** | `English` (یا `English (United States)`) — لیستینگ Store انگلیسی است |

### Detailed description (کپی کامل)

```
BIDI · Forge fixes broken reading order when Persian, Arabic, or other right-to-left text is mixed with English, numbers, URLs, and code on the web — especially inside AI chat tools.

THE PROBLEM
AI assistants and modern web apps often scramble mixed sentences, mirror parentheses, or flip paths like /(marketing)/about when you write Persian + English in one line.

THE SOLUTION
BIDI · Forge applies standard Unicode bidirectional formatting (LRM, RLM, isolates) and safe CSS direction hints (dir=auto, unicode-bidi: plaintext) so mixed text reads naturally — while you type and in assistant replies.

✦ OPTIMIZED FOR AI CHATS
• Claude — composer + streaming assistant messages
• ChatGPT, Gemini, Grok — smart composer handling (CSS-only where needed)
• Presets for Qwen, Copilot, Perplexity, DeepSeek, Meta AI, and more

✦ YOU STAY IN CONTROL
• Enable / disable per Chrome profile
• All websites OR AI chat sites only
• Block specific hostnames you never want touched
• Skips pre/code blocks to protect snippets

✦ PRIVACY FIRST
• Runs entirely in your browser
• No analytics, no remote servers, no sale of data
• Settings stored locally via chrome.storage.sync (Chrome sync)

HOW TO USE
1. Click the extension icon → turn Power ON
2. Choose coverage: All websites or AI chat sites only
3. Type or read mixed RTL + LTR text — fixes apply automatically

Open source (MIT): https://github.com/BIDI-Forge/bidi-forge
Support: https://github.com/BIDI-Forge/bidi-forge/issues
```

### Global Assets — چه فایلی بزنی

| فیلد داشبورد | فایل در مخزن | اندازه |
|--------------|---------------|--------|
| **Store icon** | `store/promo/icon-128.png` | 128×128 |
| **Screenshot 1** (حداقل ۱ الزامی) | `store/screenshots/screenshot-1280x800.png` | 1280×800 |
| **Small promo tile** | `store/promo/small-tile-440x280.png` | 440×280 |
| **Marquee promo tile** | `store/promo/marquee-1400x560.png` | 1400×560 |

بعد از `pnpm icons` یا `pnpm pack:store` این promoها ساخته می‌شوند.

### Screenshots — ترتیب پیشنهادی

| # | محتوا | فایل |
|---|--------|------|
| 1 | Popup v0.3.4 (الزامی — اسکرین واقعی بهتر از placeholder) | `screenshot-1280x800.png` یا اسکرین خودت |
| 2 | Claude/ChatGPT با `سلام hello دنیا` | اسکرین جدا آپلود کن |
| 3 | Gemini یا لیست AI tiles در popup | اختیاری |

**Small promo / Marquee:** می‌توانی همان فایل‌های auto-generated را بزنی؛ برای Featured بهتر است بعداً با اسکرین واقعی عوض کنی.

### URLs

| فیلد | URL |
|------|-----|
| **Official URL** / Homepage | `https://github.com/BIDI-Forge/bidi-forge` |
| **Support** | `https://github.com/BIDI-Forge/bidi-forge/issues` |
| **Mature content** | No |

---

## ۳ — Privacy practices

متن کامل copy/paste: [`PRIVACY_PRACTICES.md`](PRIVACY_PRACTICES.md)

| سوال / فیلد | جواب |
|-------------|------|
| **Single purpose** | از PRIVACY_PRACTICES.md بخش ۱ |
| **Host permission** | از PRIVACY_PRACTICES.md بخش ۲ |
| **storage permission** | از PRIVACY_PRACTICES.md بخش ۳ |
| **Remote code** | **No** + justification بخش ۴ |
| **Collects personal data** | **No** + تیک certify |
| **Privacy policy URL** | `https://github.com/BIDI-Forge/bidi-forge/blob/main/packages/chrome-extension/store/privacy-policy.md` |

> بعد از هر تب: **Save draft**

---

## ۴ — Distribution

| فیلد | پیشنهاد |
|------|---------|
| **Visibility** | Public |
| **Regions** | All countries (یا Worldwide) |
| **Pricing** | Free |

---

## ۵ — Submit

- هر تب بدون هشدار قرمز
- **Submit for review**
- ۱–۳ روز کاری معمولاً

---

## چک‌لیست حرفه‌ای قبل Submit

- [ ] ZIP 0.3.5 آپلود شده
- [ ] Summary زیر ۱۳۲ کاراکتر
- [ ] حداقل ۱ اسکرین‌شات **واقعی** (نه فقط placeholder)
- [ ] Privacy policy روی GitHub live است
- [ ] نام Store با manifest یکی: `BIDI - Forge`
- [ ] تست محلی: Claude + ChatGPT + Gemini

---

## بعد از تأیید

1. لینک عمومی Store را در README و org profile بگذار
2. نسخه بعدی: bump manifest → `pack:store` → Upload new package
