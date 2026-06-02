import * as vscode from "vscode";
import { fixMixedText } from "@bidi-forge/core";

function shouldSkipDocument(doc: vscode.TextDocument): boolean {
  return doc.uri.scheme !== "file" && doc.uri.scheme !== "untitled";
}

function isInsideCodeBlock(doc: vscode.TextDocument, range: vscode.Range): boolean {
  const line = doc.lineAt(range.start.line).text;
  const trimmed = line.trimStart();
  return trimmed.startsWith("```") || trimmed.startsWith("    ");
}

export function registerFixOnPaste(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.isClosed) return;
      if (event.reason !== vscode.TextDocumentChangeReason.Paste) return;

      const config = vscode.workspace.getConfiguration("rtlFixer");
      if (!config.get<boolean>("fixOnPaste", false)) return;
      if (shouldSkipDocument(event.document)) return;

      const edits: vscode.TextEdit[] = [];

      for (const change of event.contentChanges) {
        if (!change.text || change.rangeLength > 0) continue;
        if (isInsideCodeBlock(event.document, change.range)) continue;

        const fixed = fixMixedText(change.text);
        if (fixed === change.text) continue;

        edits.push(new vscode.TextEdit(change.range, fixed));
      }

      if (edits.length === 0) return;

      const editor = vscode.window.visibleTextEditors.find(
        (e) => e.document === event.document,
      );
      if (!editor) return;

      void editor.edit(
        (builder) => {
          for (const edit of edits) {
            builder.replace(edit.range, edit.newText);
          }
        },
        { undoStopBefore: false, undoStopAfter: true },
      );
    }),
  );
}
