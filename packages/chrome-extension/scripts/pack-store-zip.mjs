import { readFile, mkdir, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "dist");
const manifest = JSON.parse(await readFile(join(distDir, "manifest.json"), "utf8"));
const version = manifest.version ?? "0.0.0";
const outDir = join(root, "store", "release");
await mkdir(outDir, { recursive: true });
const zipPath = join(outDir, `rtl-text-fixer-chrome-${version}.zip`);

execSync(`cd "${distDir}" && zip -r "${zipPath}" . -x "*.map"`, { stdio: "inherit" });

const { size } = await stat(zipPath);
console.log(`[pack] ${zipPath} (${(size / 1024).toFixed(1)} KB)`);
