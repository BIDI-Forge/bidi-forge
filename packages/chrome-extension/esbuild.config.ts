import esbuild from "esbuild";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { watch } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const outdir = "dist";
const isWatch = process.argv.includes("--watch");

/** Bundle workspace packages from TypeScript sources so `pnpm -C packages/chrome-extension build` works without a prior `core` build. */
const packagesDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceAliases: Record<string, string> = {
  "@rtl-text-fixer/core": join(packagesDir, "core/src/index.ts"),
  "@rtl-text-fixer/shared": join(packagesDir, "shared/src/index.ts"),
};

async function ensureOutDir(): Promise<void> {
  await mkdir(outdir, { recursive: true });
}

async function copyStatic(): Promise<void> {
  await ensureOutDir();
  await copyFile("src/popup.html", join(outdir, "popup.html"));
  await copyFile("src/popup.css", join(outdir, "popup.css"));

  const manifestRaw = await readFile("src/manifest.json", "utf8");
  const manifest = JSON.parse(manifestRaw) as Record<string, unknown>;
  await writeFile(join(outdir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
}

async function buildAll(): Promise<void> {
  await ensureOutDir();
  await copyStatic();

  // Content scripts are not treated as ESM modules by Chrome, so they must not contain `export`.
  // Background service worker can be ESM, and popup is loaded as a module in popup.html.
  await esbuild.build({
    entryPoints: { content: "src/content.ts" },
    bundle: true,
    format: "iife",
    target: ["chrome114"],
    outdir,
    sourcemap: true,
    alias: workspaceAliases,
  });

  await esbuild.build({
    entryPoints: { background: "src/background.ts", popup: "src/popup.ts" },
    bundle: true,
    format: "esm",
    target: ["chrome114"],
    outdir,
    sourcemap: true,
    alias: workspaceAliases,
  });
}

if (isWatch) {
  await buildAll();
  console.log("[chrome-extension] watching...");

  const ctx = await esbuild.context({
    entryPoints: {
      content: "src/content.ts",
      background: "src/background.ts",
      popup: "src/popup.ts",
    },
    bundle: true,
    format: "esm",
    target: ["chrome114"],
    outdir,
    sourcemap: true,
    alias: workspaceAliases,
  });

  // Note: watch mode uses ESM for rebuild speed; run `pnpm build` before packing/loading to ensure
  // `content.js` is rebuilt as IIFE (no ESM exports).

  // esbuild@0.25.x: watch() has no onRebuild callback.
  await ctx.watch();

  // Copy static assets on change (popup + manifest).
  const staticFiles = ["src/popup.html", "src/popup.css", "src/manifest.json"];
  for (const file of staticFiles) {
    watch(file, { persistent: true }, () => {
      void copyStatic();
    });
  }
} else {
  await buildAll();
  console.log("[chrome-extension] built");
}
