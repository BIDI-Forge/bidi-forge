#!/usr/bin/env node
/**
 * Build the VS Code extension VSIX and smoke-check its manifest + bundled assets.
 * Used in CI (issue #7).
 */
import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const extDir = new URL("../packages/vscode-extension/", import.meta.url).pathname;

execSync("pnpm package", { cwd: extDir, stdio: "inherit" });

const vsixFiles = readdirSync(extDir)
  .filter((f) => f.endsWith(".vsix"))
  .sort()
  .reverse();
if (vsixFiles.length === 0) {
  console.error("smoke-vsix: no .vsix produced");
  process.exit(1);
}

const vsixPath = join(extDir, vsixFiles[0]);
const extractDir = mkdtempSync(join(tmpdir(), "rtl-fixer-vsix-"));

try {
  execSync(`unzip -q -o "${vsixPath}" -d "${extractDir}"`, { stdio: "inherit" });

  const pkgPath = join(extractDir, "extension", "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));

  const commands = pkg.contributes?.commands ?? [];
  const required = [
    "rtlFixer.fixSelectedText",
    "rtlFixer.fixClipboardText",
    "rtlFixer.enableRtlUi",
    "rtlFixer.disableRtlUi",
    "rtlFixer.openSettings",
  ];
  for (const id of required) {
    if (!commands.some((c) => c.command === id)) {
      console.error(`smoke-vsix: missing command ${id}`);
      process.exit(1);
    }
  }

  const cssPath = join(extractDir, "extension", "assets", "rtl-ui.css");
  const css = readFileSync(cssPath, "utf8");
  if (!css.includes("RTL Workbench UI stylesheet v2")) {
    console.error("smoke-vsix: rtl-ui.css missing or wrong version marker");
    process.exit(1);
  }

  if (!pkg.main?.endsWith("extension.cjs")) {
    console.error(`smoke-vsix: unexpected main: ${pkg.main}`);
    process.exit(1);
  }

  console.log(`smoke-vsix: OK (${vsixFiles[0]}, ${commands.length} commands)`);
} finally {
  rmSync(extractDir, { recursive: true, force: true });
}
