# راهنمای انتشار Chrome Web Store — BIDI · Forge v0.3.4

Dashboard: [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole)

---

## پیش‌نیاز (یک‌بار)

1. **حساب توسعه‌دهنده گوگل** — ثبت‌نام در [Developer Dashboard](https://chrome.google.com/webstore/devconsole) و پرداخت **۵ دلار** (یک‌بار، مادام‌العمر).
2. **ریپوی عمومی** — `privacy-policy.md` باید روی GitHub public باشد:
   `https://github.com/BIDI-Forge/bidi-forge/blob/main/packages/chrome-extension/store/privacy-policy.md`
3. **Publisher ID** — در داشبورد باید **amirmkazemi** (یا اکانت سازمانی) تنظیم شده باشد.

---

## مرحله ۱ — تست محلی (قبل از آپلود)

```bash
cd /path/to/rtl-text-fixer
pnpm install
pnpm -C packages/chrome-extension build
```

1. Chrome → `chrome://extensions` → Developer mode → **Load unpacked** → پوشه `packages/chrome-extension/dist`
2. Popup را باز کن → **Enable** روشن
3. تست سریع:
   - `claude.ai` — composer + پاسخ assistant
   - `chatgpt.com` — composer (CSS-only، بدون hang)
   - `gemini.google.com` — composer
4. چک‌لیست کامل: [`README.md`](../README.md) بخش *Manual test checklist*

---

## مرحله ۲ — ساخت ZIP آپلود

```bash
pnpm -C packages/chrome-extension pack:store
```

| خروجی | مسیر |
|--------|------|
| **ZIP آپلود** | `packages/chrome-extension/store/release/rtl-text-fixer-chrome-0.3.4.zip` (~50 KB) |
| آیکن 128×128 | `store/promo/icon-128.png` |
| اسکرین‌شات | `store/screenshots/screenshot-1280x800.png` |

> ZIP فقط فایل‌های `dist/` را می‌گیرد (بدون `.map`). نسخه از `src/manifest.json` خوانده می‌شود.

---

## مرحله ۳ — اسکرین‌شات واقعی (توصیه قوی)

اسکرین‌شات فعلی placeholder است. برای تأیید سریع‌تر گوگل:

1. Popup را باز کن (طراحی جدید v0.3.4)
2. یک تب Claude یا ChatGPT با متن mixed فارسی+انگلیسی
3. ابزار: Win+Shift+S / Flameshot / DevTools → **1280×800** PNG
4. جایگزین: `store/screenshots/screenshot-1280x800.png`

---

## مرحله ۴ — Push به GitHub (قبل از Submit)

Privacy policy URL باید زنده باشد:

```bash
git add packages/chrome-extension/
git commit -m "release: chrome extension v0.3.4 for Web Store"
git push origin main
```

---

## مرحله ۵ — داشبورد: آیتم جدید یا به‌روزرسانی

### اولین بار (New item)

1. [Developer Console](https://chrome.google.com/webstore/devconsole) → **New item**
2. **Upload** → انتخاب `rtl-text-fixer-chrome-0.3.4.zip`
3. منتظر parsing بمان (خطا = manifest یا فایل گم‌شده)

### به‌روزرسانی نسخه قبلی

1. آیتم **BIDI - Forge** را باز کن
2. تب **Package** → **Upload new package**
3. همان ZIP v0.3.4

---

## مرحله ۶ — Store listing

متن انگلیسی آماده: [`LISTING.md`](LISTING.md)

| فیلد | مقدار |
|------|--------|
| **Name** | `BIDI - Forge` |
| **Short description** | از LISTING.md (حداکثر ~132 کاراکتر) |
| **Detailed description** | کپی از LISTING.md |
| **Category** | `Productivity` یا `Accessibility` |
| **Language** | English (primary) |
| **Icon** | `store/promo/icon-128.png` |
| **Screenshot** | `store/screenshots/screenshot-1280x800.png` (حداقل ۱ عدد) |
| **Homepage** | `https://github.com/BIDI-Forge/bidi-forge` |
| **Support** | `https://github.com/BIDI-Forge/bidi-forge/issues` |

---

## مرحله ۷ — Privacy

| فیلد | مقدار |
|------|--------|
| **Single purpose** | از LISTING.md — بهبود ترتیب خواندن متن mixed RTL/LTR |
| **Privacy policy URL** | `https://github.com/BIDI-Forge/bidi-forge/blob/main/packages/chrome-extension/store/privacy-policy.md` |
| **Uses remote code?** | **No** |
| **Collects user data?** | **No** (فقط `chrome.storage.sync` برای تنظیمات) |

---

## مرحله ۸ — Distribution & permissions

1. **Visibility:** Public (یا Unlisted برای تست اول)
2. **Regions:** All regions (یا Iran + فارسی‌زبان‌ها)
3. **Host permission justification** (اگر پرسید):
   > The extension reads page DOM to fix mixed-script text. Users can limit to AI chat presets or exclude hosts. No data leaves the browser.

---

## مرحله ۹ — Submit for review

1. همه تب‌ها سبز / بدون خطا
2. **Submit for review**
3. زمان بررسی معمولاً **۱–۳ روز کاری** (گاهی تا ۱ هفته)
4. ایمیل تأیید یا رد — اگر رد شد، دلیل را در داشبورد بخوان و اصلاح کن

---

## نکات رایج رد شدن

| مشکل | راه‌حل |
|------|--------|
| Privacy policy 404 | Push به GitHub + URL درست |
| `<all_urls>` بدون توضیح | Single purpose + permission justification از LISTING |
| اسکرین‌شات بی‌ربط | اسکرین‌شات واقعی popup + AI chat |
| نسخه manifest ≠ ZIP | `pack:store` دوباره بعد از bump version |

---

## به‌روزرسانی بعدی (v0.3.5+)

1. `version` در `src/manifest.json` (+ `package.json`, popup)
2. `pnpm -C packages/chrome-extension pack:store`
3. داشبورد → Package → Upload new package
4. Store listing را در صورت feature جدید به‌روز کن
5. Submit for review

---

## فایل‌های این پوشه

| فایل | نقش |
|------|------|
| `LISTING.md` | متن انگلیسی Store listing |
| `privacy-policy.md` | سیاست حریم خصوصی |
| `promo/icon-128.png` | آیکن فروشگاه |
| `screenshots/` | اسکرین‌شات‌ها |
| `release/*.zip` | بسته آپلود (gitignore — محلی ساخته می‌شود) |
