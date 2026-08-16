# راهنمای آپلود دستی VSIX روی Open VSX

## ۱. ساخت فایل VSIX (اگر هنوز نساخته‌اید)

```bash
cd /home/tocka/Project/bidi-forge
pnpm install
pnpm smoke:vsix
```

**فایل آماده آپلود:**

```
packages/vscode-extension/BIDI-Forge-0.3.2.vsix
```

(نسخه را با `version` در `package.json` هماهنگ کنید.)

---

## ۲. حساب

- https://open-vsx.org — ورود با GitHub
- Publisher: **`amirmkazemi`**
- Extension name: **`bidi-forge`**
- شناسه کامل: **`amirmkazemi.bidi-forge`**

---

## ۳. آپلود دستی

1. https://open-vsx.org/user-settings/extensions
2. **Publish** / **Upload**
3. انتخاب فایل: **`BIDI-Forge-0.3.2.vsix`** (نه `rtl-text-fixer-…`)

### خط فرمان (اختیاری)

```bash
export OPEN_VSX_TOKEN="..."
cd packages/vscode-extension
pnpm dlx ovsx publish BIDI-Forge-0.3.2.vsix -p "$OPEN_VSX_TOKEN"
```

---

## ۴. فیلدهای Resources

| فیلد | مقدار |
|------|--------|
| Homepage | `https://github.com/BIDI-Forge/bidi-forge` |
| Repository | `https://github.com/BIDI-Forge/bidi-forge` |
| Bugs | `https://github.com/BIDI-Forge/bidi-forge/issues` |

جزئیات: `store/OPEN_VSX_LISTING.md`

---

## ۵. بعد از انتشار

https://open-vsx.org/extension/amirmkazemi/bidi-forge

نصب: `amirmkazemi.bidi-forge`

---

## ۶. نسخه بعدی

1. bump `version` در `package.json`
2. `pnpm smoke:vsix` → فایل `BIDI-Forge-<version>.vsix`
3. آپلود مجدد
