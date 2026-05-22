import * as vscode from "vscode";
import { formatUiText } from "@rtl-text-fixer/core";
import { onRtlUiStateChange, readRtlUiEnabled } from "../commands/rtlUi.js";

let statusBarItem: vscode.StatusBarItem | undefined;

function formatStatusText(rtlUiEnabled: boolean): string {
  const label = rtlUiEnabled ? "RTL UI: فعال" : "RTL UI: غیرفعال";
  return formatUiText(label, { baseDirection: "rtl" });
}

export function createStatusBar(context: vscode.ExtensionContext): void {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = "rtlFixer.openSettings";
  statusBarItem.tooltip = formatUiText("RTL Text Fixer — کلیک برای تنظیمات", {
    baseDirection: "rtl",
  });

  const update = (enabled?: boolean): void => {
    if (!statusBarItem) return;
    const rtlOn = enabled ?? readRtlUiEnabled(context);
    statusBarItem.text = `$(globe) ${formatStatusText(rtlOn)}`;
    statusBarItem.show();
  };

  update(readRtlUiEnabled(context));
  onRtlUiStateChange(update);
  context.subscriptions.push(statusBarItem);
}

export function disposeStatusBar(): void {
  statusBarItem?.dispose();
  statusBarItem = undefined;
}
