import { mkdir, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceIcon = join(root, "../vscode-extension/icon.png");
const iconsDir = join(root, "icons");
const storeDir = join(root, "store");

/** Source artboard has large light margins; shave then scale so Chrome details icon looks full. */
const SHAVE_PX = 58;
const TRIM_FUZZ = "18%";
const TRIM_COLOR = "#f6f8f2";

const sizes = [16, 32, 48, 128];

function hasImageMagickConvert() {
  try {
    execSync("command -v convert", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function buildIcon(size, outPath) {
  const resize = `${size}x${size}`;
  const unsharp = size >= 48 ? "-unsharp 0x0.6" : "-unsharp 0x0.9";
  execSync(
    `convert "${sourceIcon}" ` +
      `-fuzz ${TRIM_FUZZ} -transparent "${TRIM_COLOR}" ` +
      `-shave ${SHAVE_PX}x${SHAVE_PX} ` +
      `-trim +repage ` +
      `-resize ${resize} ` +
      `${unsharp} ` +
      `"${outPath}"`,
    { stdio: "inherit" },
  );
}

await mkdir(iconsDir, { recursive: true });
await mkdir(join(storeDir, "screenshots"), { recursive: true });
await mkdir(join(storeDir, "promo"), { recursive: true });

if (!hasImageMagickConvert()) {
  console.log("[icons] ImageMagick convert not found — using committed icons in icons/");
  process.exit(0);
}

for (const size of sizes) {
  const out = join(iconsDir, `icon${size}.png`);
  buildIcon(size, out);
  console.log(`[icons] ${out}`);
}

const storeIcon = join(storeDir, "promo", "icon-128.png");
await copyFile(join(iconsDir, "icon128.png"), storeIcon);

const promoDir = join(storeDir, "promo");

const screenshot = join(storeDir, "screenshots", "screenshot-1280x800.png");
execSync(
  `convert -size 1280x800 xc:'#1a1b26' ` +
    `-gravity center -font DejaVu-Sans -pointsize 52 -fill '#c0caf5' ` +
    `-annotate +0-80 'BIDI - Forge' ` +
    `-pointsize 28 -fill '#9ece6a' ` +
    `-annotate +0+20 'Fix mixed Persian / Arabic + English (BiDi)' ` +
    `-pointsize 22 -fill '#a9b1d6' ` +
    `-annotate +0+80 'ChatGPT · Claude · Gemini · Copilot · Perplexity' ` +
    `"${screenshot}"`,
  { stdio: "inherit" },
);
console.log(`[screenshot] ${screenshot}`);

const smallPromo = join(promoDir, "small-tile-440x280.png");
execSync(
  `convert -size 440x280 gradient:'#0f172a-#1e293b' ` +
    `\\( "${join(iconsDir, "icon128.png")}" -resize 96x96 \\) -gravity west -geometry +28+0 -composite ` +
    `-gravity east -font DejaVu-Sans-Bold -pointsize 26 -fill '#f8fafc' ` +
    `-annotate +28+0 'BIDI - Forge' ` +
    `-pointsize 14 -fill '#94a3b8' ` +
    `-annotate +28+36 'Mixed RTL + LTR\\nfor AI chats' ` +
    `"${smallPromo}"`,
  { stdio: "inherit" },
);
console.log(`[promo] ${smallPromo}`);

const marquee = join(promoDir, "marquee-1400x560.png");
execSync(
  `convert -size 1400x560 gradient:'#0d9488-#6366f1' ` +
    `-fill '#0f172a' -draw 'roundrectangle 40,40 1360,520 32,32' ` +
    `\\( "${join(iconsDir, "icon128.png")}" -resize 140x140 \\) -gravity west -geometry +80+0 -composite ` +
    `-gravity center -font DejaVu-Sans-Bold -pointsize 56 -fill '#f8fafc' ` +
    `-annotate +60-30 'BIDI · Forge' ` +
    `-pointsize 24 -fill '#cbd5e1' ` +
    `-annotate +60+40 'Fix Persian, Arabic & English in Claude, ChatGPT, Gemini' ` +
    `-pointsize 18 -fill '#94a3b8' ` +
    `-annotate +60+90 'Unicode BiDi · Local only · Open source' ` +
    `"${marquee}"`,
  { stdio: "inherit" },
);
console.log(`[promo] ${marquee}`);
