import { describe, expect, it } from "vitest";
import { buildSettingsWebviewHtml } from "../ui/webviewHtml.js";

describe("buildSettingsWebviewHtml", () => {
  it("uses RTL document shell and BiDi CSS classes", () => {
    const html = buildSettingsWebviewHtml({
      cssUri: "https://file+.vscode-resource.vscode-cdn.net/style.css",
      nonce: "test-nonce",
      cspSource: "https://*.vscode-cdn.net",
    });

    expect(html).toContain('<html lang="fa" dir="rtl">');
    expect(html).toContain("bidi-isolate");
    expect(html).toContain('class="ltr-block"');
    expect(html).toContain('dir="auto"');
    expect(html).toContain("سلام hello دنیا");
  });

  it("escapes HTML in examples", () => {
    const html = buildSettingsWebviewHtml({
      cssUri: "https://example.com/style.css",
      nonce: "n",
      cspSource: "https://example.com",
    });
    expect(html).not.toContain("<script>");
  });
});
