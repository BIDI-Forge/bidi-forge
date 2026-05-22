import * as vscode from "vscode";

export const CUSTOM_CSS_EXTENSION_ID = "be5invis.vscode-custom-css";
export const CUSTOM_CSS_IMPORTS_KEY = "vscode_custom_css.imports";
export const RTL_UI_CSS_FILENAME = "rtl-ui.css";

export function toFileUrl(uri: vscode.Uri): string {
  return vscode.Uri.file(uri.fsPath).toString(true);
}

export function isSameLocalFileUrl(candidate: string, targetFsPath: string): boolean {
  try {
    const u = vscode.Uri.parse(candidate, true);
    if (u.scheme === "file") return u.fsPath === targetFsPath;
    return u.fsPath === targetFsPath;
  } catch {
    return false;
  }
}

export async function ensureRtlUiCssWritten(context: vscode.ExtensionContext): Promise<vscode.Uri> {
  const targetUri = vscode.Uri.joinPath(context.globalStorageUri, RTL_UI_CSS_FILENAME);
  await vscode.workspace.fs.createDirectory(context.globalStorageUri);
  const sourceUri = vscode.Uri.joinPath(context.extensionUri, "assets", RTL_UI_CSS_FILENAME);
  const bytes = await vscode.workspace.fs.readFile(sourceUri);
  await vscode.workspace.fs.writeFile(targetUri, bytes);
  return targetUri;
}

export async function updateCustomCssImports(
  addUri?: vscode.Uri,
  removeUri?: vscode.Uri,
): Promise<void> {
  const cfg = vscode.workspace.getConfiguration();
  const existing = (cfg.get<string[]>(CUSTOM_CSS_IMPORTS_KEY) ?? []).filter(Boolean);
  let next = existing.slice();

  if (addUri) {
    const url = toFileUrl(addUri);
    next = next.filter((x) => !isSameLocalFileUrl(x, addUri.fsPath));
    next.push(url);
  }

  if (removeUri) {
    next = next.filter((x) => !isSameLocalFileUrl(x, removeUri.fsPath));
  }

  await cfg.update(CUSTOM_CSS_IMPORTS_KEY, next, vscode.ConfigurationTarget.Global);
}

export function isRtlUiCssImported(cssFsPath: string): boolean {
  const cfg = vscode.workspace.getConfiguration();
  const imports = cfg.get<string[]>(CUSTOM_CSS_IMPORTS_KEY) ?? [];
  return imports.some((x) => isSameLocalFileUrl(x, cssFsPath));
}
