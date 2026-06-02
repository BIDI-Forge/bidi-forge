import * as vscode from "vscode";
import { registerFixOnPaste } from "./commands/fixOnPaste.js";
import { registerFixTextCommands } from "./commands/fixText.js";
import { registerRtlUiCommands } from "./commands/rtlUi.js";
import { createStatusBar, disposeStatusBar } from "./ui/statusBar.js";
import { registerSettingsWebview } from "./ui/settingsWebview.js";

export function activate(context: vscode.ExtensionContext): void {
  registerFixTextCommands(context);
  registerFixOnPaste(context);
  registerRtlUiCommands(context);
  registerSettingsWebview(context);
  createStatusBar(context);
}

export function deactivate(): void {
  disposeStatusBar();
}
