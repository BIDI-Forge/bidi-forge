import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearReaderBidi, scanMessageRoot } from "../messageSurfaces.js";
import { applyReaderBidi, resolveElementDirection } from "../readerBidi.js";

function assistantMessage(html: string): HTMLElement {
  const root = document.createElement("div");
  root.setAttribute("data-testid", "assistant-message");
  root.innerHTML = html;
  document.body.append(root);
  return root;
}

function dirOf(el: Element | null): string | null {
  return el?.getAttribute("data-bf-dir") ?? null;
}

describe("Claude message surfaces", () => {
  beforeEach(() => {
    vi.stubGlobal("location", { hostname: "claude.ai", pathname: "/chat/1" });
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
  });

  it("keeps a Persian line RTL when it starts with inline code", () => {
    const root = assistantMessage(
      "<p><code>useState</code> را در React استفاده کنید تا مقدار ذخیره شود.</p>",
    );
    scanMessageRoot(root, "claude.ai");

    expect(dirOf(root.querySelector("p"))).toBe("rtl");
    expect(root.querySelector("code")?.getAttribute("data-bf")).toBe("code");
    expect(root.querySelector("code")?.getAttribute("dir")).toBe("ltr");
  });

  it("never rewrites message text, so inline code and links stay intact", () => {
    const html =
      '<p>برای نصب <code>npm install</code> را اجرا کنید و <a href="https://x.com">لینک</a> را ببین.</p>';
    const root = assistantMessage(html);
    const before = root.textContent;

    scanMessageRoot(root, "claude.ai");

    expect(root.textContent).toBe(before);
    expect(root.textContent).not.toMatch(/[‎‏⁦-⁩]/);
    expect(root.querySelector("a")?.textContent).toBe("لینک");
    expect(root.querySelectorAll("code")).toHaveLength(1);
  });

  it("gives ordered and unordered lists one direction for marker and indentation", () => {
    const root = assistantMessage(`
      <ul>
        <li><code>useState</code> را صدا بزن</li>
        <li>مورد دوم فارسی است</li>
        <li>1. آیتم شماره‌دار</li>
      </ul>
      <ol>
        <li><strong>Bold</strong> و بقیه متن فارسی است</li>
        <li>مرحله بعدی را اجرا کن</li>
      </ol>
    `);
    scanMessageRoot(root, "claude.ai");

    expect(dirOf(root.querySelector("ul"))).toBe("rtl");
    expect(dirOf(root.querySelector("ol"))).toBe("rtl");
    for (const li of Array.from(root.querySelectorAll("li"))) {
      expect(dirOf(li), li.textContent ?? "").toBe("rtl");
      expect(li.getAttribute("data-bf")).toBe("item");
    }
    expect(root.querySelector("ul")?.getAttribute("data-bf")).toBe("list");
  });

  it("keeps a fully English block LTR inside a Persian message", () => {
    const root = assistantMessage(`
      <p>این توضیح فارسی است و ادامه دارد تا متن کافی باشد.</p>
      <p>This paragraph is entirely written in English prose.</p>
    `);
    scanMessageRoot(root, "claude.ai");

    const [fa, en] = Array.from(root.querySelectorAll("p"));
    expect(dirOf(fa!)).toBe("rtl");
    expect(dirOf(en!)).toBe("ltr");
  });

  it("marks code blocks LTR and leaves their content alone", () => {
    const root = assistantMessage(
      "<p>این کد را ببین:</p><pre><code>const x = 1; // مقدار</code></pre>",
    );
    scanMessageRoot(root, "claude.ai");

    const pre = root.querySelector("pre")!;
    expect(pre.getAttribute("data-bf")).toBe("pre");
    expect(pre.getAttribute("dir")).toBe("ltr");
    expect(pre.textContent).toBe("const x = 1; // مقدار");
    expect(pre.querySelector("code")?.getAttribute("data-bf")).toBeNull();
  });

  it("lets a bullet that holds only code inherit its list direction", () => {
    const root = assistantMessage(`
      <ul>
        <li>این دستور را اجرا کن تا نصب شود</li>
        <li><code>npm run build</code></li>
      </ul>
    `);
    scanMessageRoot(root, "claude.ai");

    const items = Array.from(root.querySelectorAll("li"));
    expect(dirOf(items[1]!)).toBe("rtl");
  });

  it("resolves headings, quotes, and table cells", () => {
    const root = assistantMessage(`
      <h2>عنوان بخش اول</h2>
      <blockquote>نقل قول فارسی برای تست</blockquote>
      <table><tbody><tr><td>سلول فارسی</td><td>Cell</td></tr></tbody></table>
    `);
    scanMessageRoot(root, "claude.ai");

    expect(dirOf(root.querySelector("h2"))).toBe("rtl");
    expect(dirOf(root.querySelector("blockquote"))).toBe("rtl");
    expect(dirOf(root.querySelector("table"))).toBe("rtl");
    expect(root.querySelector("td")?.getAttribute("data-bf")).toBe("cell");
  });

  it("re-resolves direction while a message streams in", () => {
    const root = assistantMessage("<p>Loading</p>");
    scanMessageRoot(root, "claude.ai");
    expect(dirOf(root.querySelector("p"))).toBe("ltr");

    root.querySelector("p")!.textContent = "Loading سپس ادامه متن فارسی طولانی";
    root.insertAdjacentHTML("beforeend", "<p>پاراگراف دوم که بعدا اضافه شد</p>");
    scanMessageRoot(root, "claude.ai");

    const paragraphs = Array.from(root.querySelectorAll("p"));
    expect(dirOf(paragraphs[0]!)).toBe("rtl");
    expect(dirOf(paragraphs[1]!)).toBe("rtl");
  });

  it("skips composers and editable surfaces", () => {
    const editor = document.createElement("div");
    editor.setAttribute("data-testid", "chat-input");
    editor.setAttribute("contenteditable", "true");
    editor.innerHTML = "<p>متن در حال تایپ hello</p>";
    document.body.append(editor);

    scanMessageRoot(editor, "claude.ai");

    expect(editor.querySelector("p")?.getAttribute("data-bf-dir")).toBeNull();
  });

  it("restores the DOM when hints are cleared", () => {
    const root = assistantMessage("<ul><li>یک مورد فارسی</li></ul>");
    applyReaderBidi(root);
    expect(root.querySelector("li")?.getAttribute("dir")).toBe("rtl");

    clearReaderBidi(root);

    expect(root.querySelector("li")?.getAttribute("dir")).toBeNull();
    expect(root.querySelector("li")?.getAttribute("data-bf")).toBeNull();
    expect(root.querySelector("[data-bf-dir]")).toBeNull();
  });
});

describe("resolveElementDirection", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("ignores code, emoji, and list numbers when choosing a direction", () => {
    const el = document.createElement("p");
    el.innerHTML = "😀 1. <code>npm install</code> را اجرا کن";
    document.body.append(el);

    expect(resolveElementDirection(el, null)).toBe("rtl");
  });

  it("returns null when there is nothing to go on", () => {
    const el = document.createElement("p");
    el.innerHTML = "<code>const x = 1;</code>";
    document.body.append(el);

    expect(resolveElementDirection(el, null)).toBe("ltr");
    expect(resolveElementDirection(el, "rtl")).toBe("rtl");
  });
});
