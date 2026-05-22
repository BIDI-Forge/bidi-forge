import * as vscode from "vscode";
import { buildSettingsWebviewHtml } from "./webviewHtml.js";

let panel: vscode.WebviewPanel | undefined;

export function registerSettingsWebview(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("rtlFixer.openSettings", () => {
      if (panel) {
        panel.reveal(vscode.ViewColumn.One);
        return;
      }

      panel = vscode.window.createWebviewPanel(
        "rtlFixer.settings",
        "RTL Text Fixer",
        vscode.ViewColumn.One,
        {
          enableScripts: false,
          retainContextWhenHidden: true,
          localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "assets")],
        },
      );

      const nonce = getNonce();
      const cssUri = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, "assets", "settings-webview.css"),
      );

      panel.webview.html = buildSettingsWebviewHtml({
        cssUri: cssUri.toString(),
        nonce,
        cspSource: panel.webview.cspSource,
      });

      panel.onDidDispose(() => {
        panel = undefined;
      });
    }),
  );
}

function getNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let text = "";
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}
