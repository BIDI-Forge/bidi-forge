import esbuild from "esbuild";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packagesDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceAliases: Record<string, string> = {
  "@bidi-forge/core": join(packagesDir, "core/src/index.ts"),
  "@rtl-text-fixer/shared": join(packagesDir, "shared/src/index.ts"),
};

const isWatch = process.argv.includes("--watch");

const buildOptions: esbuild.BuildOptions = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: ["node18"],
  outfile: "dist/extension.cjs",
  sourcemap: true,
  external: ["vscode"],
  alias: workspaceAliases,
};

const ctx = await esbuild.context(buildOptions);

if (isWatch) {
  await ctx.watch();
  console.log("[vscode-extension] watching...");
} else {
  await ctx.rebuild();
  await ctx.dispose();
  console.log("[vscode-extension] built");
}
