import { mkdir, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceIcon = join(root, "../vscode-extension/icon.png");
const iconsDir = join(root, "icons");
const storeDir = join(root, "store");

const sizes = [16, 32, 48, 128];

await mkdir(iconsDir, { recursive: true });
await mkdir(join(storeDir, "screenshots"), { recursive: true });
await mkdir(join(storeDir, "promo"), { recursive: true });

for (const size of sizes) {
  const out = join(iconsDir, `icon${size}.png`);
  execSync(`convert "${sourceIcon}" -resize ${size}x${size} "${out}"`, { stdio: "inherit" });
  console.log(`[icons] ${out}`);
}

const storeIcon = join(storeDir, "promo", "icon-128.png");
await copyFile(join(iconsDir, "icon128.png"), storeIcon);

const screenshot = join(storeDir, "screenshots", "screenshot-1280x800.png");
execSync(
  `convert -size 1280x800 xc:'#1a1b26' ` +
    `-gravity center -font DejaVu-Sans -pointsize 52 -fill '#c0caf5' ` +
    `-annotate +0-80 'RTL Text Fixer' ` +
    `-pointsize 28 -fill '#9ece6a' ` +
    `-annotate +0+20 'Fix mixed Persian / Arabic + English (BiDi)' ` +
    `-pointsize 22 -fill '#a9b1d6' ` +
    `-annotate +0+80 'ChatGPT · Claude · Gemini · Copilot · Perplexity' ` +
    `"${screenshot}"`,
  { stdio: "inherit" },
);
console.log(`[screenshot] ${screenshot}`);
