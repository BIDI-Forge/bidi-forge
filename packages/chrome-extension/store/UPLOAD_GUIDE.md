# راهنمای آپلود Chrome Web Store

Dashboard: [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole)

## ۱. ساخت بسته آپلود

از ریشه مخزن:

```bash
pnpm install
pnpm -C packages/chrome-extension pack:store
```

خروجی ZIP:

`packages/chrome-extension/store/release/rtl-text-fixer-chrome-0.3.0.zip`

## ۲. فایل‌های گرافیکی

| مورد | مسیر |
|------|------|
| آیکن ۱۲۸ | `store/promo/icon-128.png` |
| اسکرین‌شات | `store/screenshots/screenshot-1280x800.png` |

پیش از انتشار نهایی، ترجیحاً اسکرین‌شات واقعی از Claude/ChatGPT بگیر و جایگزین کن.

## ۳. متن لیستینگ

متن انگلیسی آماده در [`LISTING.md`](LISTING.md) است (نام، توضیح کوتاه/بلند، single purpose، توجیه دسترسی).

## ۴. Privacy Policy

فایل [`privacy-policy.md`](privacy-policy.md) را در GitHub public کن و URL همان را در داشبورد وارد کن.

## ۵. مراحل داشبورد

1. **New item** → Upload ZIP
2. **Store listing** — copy from `LISTING.md`
3. **Privacy** — privacy policy URL
4. **Distribution** — visibility (Public / Unlisted)
5. **Submit for review**

## ۶. نکات بررسی گوگل

- دسترسی `<all_urls>`: در توضیحات بنویس کاربر می‌تواند فقط AI chat sites را انتخاب کند.
- فقط `storage` — داده به سرور توسعه‌دهنده ارسال نمی‌شود.
- نسخه `manifest.json` باید با ZIP یکی باشد (`0.3.0`).

## ۷. به‌روزرسانی بعدی

1. `version` را در `src/manifest.json` بالا ببر
2. `pnpm -C packages/chrome-extension pack:store`
3. در داشبورد **Package** → Upload new version
