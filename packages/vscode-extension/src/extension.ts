import * as vscode from "vscode";
import { fixMixedText } from "@rtl-text-fixer/core";

export function activate(context: vscode.ExtensionContext): void {
  const fixSelectedDisposable = vscode.commands.registerCommand("rtlFixer.fixSelectedText", async () => {
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

  context.subscriptions.push(fixSelectedDisposable, fixClipboardDisposable);
}

export function deactivate(): void {
  return;
}
