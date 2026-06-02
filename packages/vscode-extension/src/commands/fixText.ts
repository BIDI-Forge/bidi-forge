import * as vscode from "vscode";
import { fixMixedText } from "@bidi-forge/core";
import { showBiDiInformationMessage } from "../ui/messages.js";

export function registerFixTextCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("rtlFixer.fixSelectedText", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      let changed = 0;
      await editor.edit((editBuilder) => {
        for (const selection of editor.selections) {
          const selectedText = editor.document.getText(selection);
          if (!selectedText) continue;
          const fixed = fixMixedText(selectedText);
          if (fixed !== selectedText) {
            editBuilder.replace(selection, fixed);
            changed++;
          }
        }
      });

      if (changed > 0) {
        void showBiDiInformationMessage(`RTL Fixer: ${changed} بخش اصلاح شد.`);
      }
    }),

    vscode.commands.registerCommand("rtlFixer.fixClipboardText", async () => {
      const clipboardText = await vscode.env.clipboard.readText();
      if (!clipboardText) return;

      const fixed = fixMixedText(clipboardText);
      if (fixed === clipboardText) return;

      await vscode.env.clipboard.writeText(fixed);
      void showBiDiInformationMessage("RTL Fixer: متن کلیپ‌بورد اصلاح شد.");
    }),
  );
}
