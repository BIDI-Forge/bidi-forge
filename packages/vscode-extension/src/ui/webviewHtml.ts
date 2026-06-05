import { fixMixedText, formatUiText } from "@bidi-forge/core";

export interface SettingsWebviewOptions {
  cssUri: string;
  nonce: string;
  cspSource: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const EXAMPLE_INPUT = "سلام hello دنیا";
const EXAMPLE_URL = "لینک: https://example.com/path است";

export function buildSettingsWebviewHtml(options: SettingsWebviewOptions): string {
  const exampleOutput = escapeHtml(fixMixedText(EXAMPLE_INPUT));
  const exampleInput = escapeHtml(EXAMPLE_INPUT);
  const urlExample = escapeHtml(fixMixedText(EXAMPLE_URL));
  const urlInput = escapeHtml(EXAMPLE_URL);
  const intro = escapeHtml(
    formatUiText(
      "RTL Text Fixer — اصلاح ترتیب نمایش متن ترکیبی فارسی/عربی و انگلیسی.",
      { baseDirection: "rtl" },
    ),
  );

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${options.cspSource} 'nonce-${options.nonce}'; script-src 'nonce-${options.nonce}';" />
  <link rel="stylesheet" href="${options.cssUri}" />
  <title>RTL Text Fixer</title>
</head>
<body>
  <header class="header">
    <h1>RTL Text Fixer</h1>
    <p class="bidi-isolate" dir="auto">${intro}</p>
  </header>

  <section class="section">
    <h2>دستورات</h2>
    <ul class="bidi-isolate" dir="auto">
      <li>اصلاح متن انتخاب‌شده — <span class="ltr-block">Ctrl+Alt+R</span> (Mac: <span class="ltr-block">Cmd+Alt+R</span>)</li>
      <li>اصلاح کلیپ‌بورد — <span class="ltr-block">Ctrl+Alt+Shift+R</span></li>
      <li>فعال‌سازی RTL UI — نیاز به <span class="ltr-block">be5invis.vscode-custom-css</span></li>
    </ul>
  </section>

  <section class="section">
    <h2>نمونه اصلاح متن</h2>
    <p class="label">ورودی:</p>
    <pre class="sample bidi-isolate" dir="auto">${exampleInput}</pre>
    <p class="label">خروجی:</p>
    <pre class="sample ltr-block" dir="ltr">${exampleOutput}</pre>
  </section>

  <section class="section">
    <h2>URL در متن فارسی</h2>
    <p class="label">ورودی:</p>
    <pre class="sample bidi-isolate" dir="auto">${urlInput}</pre>
    <p class="label">خروجی:</p>
    <pre class="sample ltr-block" dir="ltr">${urlExample}</pre>
  </section>

  <section class="section">
    <h2>محدودیت‌های VS Code</h2>
    <p class="bidi-isolate" dir="auto">
      افزونه نمی‌تواند کل Workbench را به‌صورت رسمی RTL کند. RTL UI از طریق Custom CSS و فایل
      <span class="ltr-block">rtl-ui.css</span> اعمال می‌شود. ویرایشگر و ترمینال عمداً LTR می‌مانند.
    </p>
  </section>

  <footer class="footer ltr-block" dir="ltr">
    <a href="https://github.com/BIDI-Forge/bidi-forge">github.com/BIDI-Forge/bidi-forge</a>
  </footer>
</body>
</html>`;
}
