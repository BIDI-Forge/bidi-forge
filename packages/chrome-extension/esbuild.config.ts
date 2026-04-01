import esbuild from "esbuild";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { watch } from "node:fs";
import { join } from "node:path";

const outdir = "dist";
const isWatch = process.argv.includes("--watch");

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

  await esbuild.build({
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
  });

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
