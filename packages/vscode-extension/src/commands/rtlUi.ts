import * as vscode from "vscode";
import {
  CUSTOM_CSS_EXTENSION_ID,
  ensureRtlUiCssWritten,
  isRtlUiCssImported,
  RTL_UI_CSS_FILENAME,
  updateCustomCssImports,
} from "../rtl/customCss.js";
import { showBiDiInformationMessage, showBiDiWarningMessage } from "../ui/messages.js";

export type RtlUiStateListener = (enabled: boolean) => void;

const rtlUiListeners: RtlUiStateListener[] = [];

export function onRtlUiStateChange(listener: RtlUiStateListener): void {
  rtlUiListeners.push(listener);
}

function notifyRtlUiState(enabled: boolean): void {
  for (const listener of rtlUiListeners) {
    listener(enabled);
  }
}

export function readRtlUiEnabled(context: vscode.ExtensionContext): boolean {
  const cssUri = vscode.Uri.joinPath(context.globalStorageUri, RTL_UI_CSS_FILENAME);
  return isRtlUiCssImported(cssUri.fsPath);
}

export function registerRtlUiCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("rtlFixer.enableRtlUi", async () => {
      const customCssExt = vscode.extensions.getExtension(CUSTOM_CSS_EXTENSION_ID);
      if (!customCssExt) {
        const action = await showBiDiWarningMessage(
          `برای RTL کردن UI باید افزونه Custom CSS نصب شود: ${CUSTOM_CSS_EXTENSION_ID}`,
          "کپی شناسه افزونه",
        );
        if (action === "کپی شناسه افزونه") {
          await vscode.env.clipboard.writeText(CUSTOM_CSS_EXTENSION_ID);
        }
        return;
      }

      try {
        await customCssExt.activate();
      } catch {
        // Best-effort activation.
      }

      const cssUri = await ensureRtlUiCssWritten(context);
      await updateCustomCssImports(cssUri, undefined);
      notifyRtlUiState(true);

      void showBiDiInformationMessage(
        "RTL Fixer: تنظیمات Custom CSS اعمال شد. حالا از Command Palette دستور Enable/Reload Custom CSS and JS را اجرا کنید و سپس Window را Reload کنید.",
      );
    }),

    vscode.commands.registerCommand("rtlFixer.disableRtlUi", async () => {
      const cssUri = vscode.Uri.joinPath(context.globalStorageUri, RTL_UI_CSS_FILENAME);
      await updateCustomCssImports(undefined, cssUri);
      notifyRtlUiState(false);

      void showBiDiInformationMessage(
        "RTL Fixer: RTL UI غیرفعال شد. حالا از Command Palette دستور Disable/Reload Custom CSS and JS را اجرا کنید و سپس Window را Reload کنید.",
      );
    }),
  );

  notifyRtlUiState(readRtlUiEnabled(context));
}
