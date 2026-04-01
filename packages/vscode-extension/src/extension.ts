import * as vscode from "vscode";
import { fixMixedText } from "@rtl-text-fixer/core";

const CUSTOM_CSS_EXTENSION_ID = "be5invis.vscode-custom-css";
const CUSTOM_CSS_IMPORTS_KEY = "vscode_custom_css.imports";
const RTL_UI_CSS_FILENAME = "rtl-ui.css";

function toFileUrl(uri: vscode.Uri): string {
  // vscode-custom-css expects **file:///** URLs in settings.
  // `context.globalStorageUri` uses an internal scheme (e.g. vscode-userdata:),
  // so we must convert via the real filesystem path.
  return vscode.Uri.file(uri.fsPath).toString(true);
}

async function ensureRtlUiCssWritten(context: vscode.ExtensionContext): Promise<vscode.Uri> {
  const targetUri = vscode.Uri.joinPath(context.globalStorageUri, RTL_UI_CSS_FILENAME);

  await vscode.workspace.fs.createDirectory(context.globalStorageUri);

  const sourceUri = vscode.Uri.joinPath(context.extensionUri, "assets", "rtl-ui.css");
  const bytes = await vscode.workspace.fs.readFile(sourceUri);
  await vscode.workspace.fs.writeFile(targetUri, bytes);

  return targetUri;
}

function isSameLocalFileUrl(candidate: string, targetFsPath: string): boolean {
  try {
    const u = vscode.Uri.parse(candidate, true);
    if (u.scheme === "file") return u.fsPath === targetFsPath;
    // Accept old incorrect entries like vscode-userdata:/... by comparing fsPath.
    return u.fsPath === targetFsPath;
  } catch {
    return false;
  }
}

async function updateCustomCssImports(addUri?: vscode.Uri, removeUri?: vscode.Uri): Promise<void> {
  const cfg = vscode.workspace.getConfiguration();
  const existing = (cfg.get<string[]>(CUSTOM_CSS_IMPORTS_KEY) ?? []).filter(Boolean);

  let next = existing.slice();

  if (addUri) {
    const url = toFileUrl(addUri);
    // Remove legacy/duplicate entries pointing to same file.
    next = next.filter((x) => !isSameLocalFileUrl(x, addUri.fsPath));
    next.push(url);
  }

  if (removeUri) {
    next = next.filter((x) => !isSameLocalFileUrl(x, removeUri.fsPath));
  }

  await cfg.update(CUSTOM_CSS_IMPORTS_KEY, next, vscode.ConfigurationTarget.Global);
}

export function activate(context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand("rtlFixer.fixSelectedText", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    await editor.edit((editBuilder) => {
      for (const selection of editor.selections) {
        const selectedText = editor.document.getText(selection);
        if (!selectedText) continue;
        const fixed = fixMixedText(selectedText);
        if (fixed !== selectedText) editBuilder.replace(selection, fixed);
      }
    });
  });

  const fixClipboardDisposable = vscode.commands.registerCommand("rtlFixer.fixClipboardText", async () => {
    const clipboardText = await vscode.env.clipboard.readText();
    if (!clipboardText) return;

    const fixed = fixMixedText(clipboardText);
    if (fixed === clipboardText) return;

    await vscode.env.clipboard.writeText(fixed);
    void vscode.window.showInformationMessage("RTL Fixer: متن کلیپ‌بورد اصلاح شد.");
  });

  const enableRtlUiDisposable = vscode.commands.registerCommand("rtlFixer.enableRtlUi", async () => {
    const customCssExt = vscode.extensions.getExtension(CUSTOM_CSS_EXTENSION_ID);
    if (!customCssExt) {
      const action = await vscode.window.showWarningMessage(
        `برای RTL کردن UI باید افزونه Custom CSS نصب شود: ${CUSTOM_CSS_EXTENSION_ID}`,
        "کپی شناسه افزونه"
      );
      if (action === "کپی شناسه افزونه") {
        await vscode.env.clipboard.writeText(CUSTOM_CSS_EXTENSION_ID);
      }
      return;
    }

    // Ensure the loader is activated so its commands/settings exist.
    try {
      await customCssExt.activate();
    } catch {
      // Best-effort: even if activation fails, we can still set settings.
    }

    const cssUri = await ensureRtlUiCssWritten(context);
    await updateCustomCssImports(cssUri, undefined);

    void vscode.window.showInformationMessage(
      "RTL Fixer: تنظیمات Custom CSS اعمال شد. حالا از Command Palette دستور “Enable/Reload Custom CSS and JS” را اجرا کنید و سپس Window را Reload کنید. (در Windows ممکن است نیاز باشد Cursor/VS Code را با Run as Administrator اجرا کنید.)"
    );
  });

  const disableRtlUiDisposable = vscode.commands.registerCommand("rtlFixer.disableRtlUi", async () => {
    const cssUri = vscode.Uri.joinPath(context.globalStorageUri, RTL_UI_CSS_FILENAME);
    await updateCustomCssImports(undefined, cssUri);

    void vscode.window.showInformationMessage(
      "RTL Fixer: RTL UI غیرفعال شد. حالا از Command Palette دستور “Disable/Reload Custom CSS and JS” را اجرا کنید و سپس Window را Reload کنید."
    );
  });

  context.subscriptions.push(disposable, fixClipboardDisposable, enableRtlUiDisposable, disableRtlUiDisposable);
}

export function deactivate(): void {
  return;
}
