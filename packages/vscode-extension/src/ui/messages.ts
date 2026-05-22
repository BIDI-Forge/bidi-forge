import * as vscode from "vscode";
import { formatUiText } from "@rtl-text-fixer/core";
import type { UiTextDirection } from "@rtl-text-fixer/shared";

const CONFIG_SECTION = "rtlFixer";

function getUiMessageDirection(): UiTextDirection {
  const value = vscode.workspace.getConfiguration(CONFIG_SECTION).get<string>("uiMessageDirection");
  if (value === "ltr" || value === "auto") return value;
  return "rtl";
}

export function formatMessage(text: string): string {
  return formatUiText(text, { baseDirection: getUiMessageDirection() });
}

export function showBiDiInformationMessage(
  message: string,
  ...items: string[]
): ReturnType<typeof vscode.window.showInformationMessage> {
  return vscode.window.showInformationMessage(formatMessage(message), ...items);
}

export function showBiDiWarningMessage(
  message: string,
  ...items: string[]
): ReturnType<typeof vscode.window.showWarningMessage> {
  return vscode.window.showWarningMessage(formatMessage(message), ...items);
}
