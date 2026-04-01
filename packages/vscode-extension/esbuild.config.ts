import esbuild from "esbuild";

const isWatch = process.argv.includes("--watch");

const ctx = await esbuild.context({
  entryPoints: ["src/extension.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: ["node18"],
  outfile: "dist/extension.cjs",
  sourcemap: true,
  external: ["vscode"],
});

if (isWatch) {
  await ctx.watch();
  console.log("[vscode-extension] watching...");
} else {
  await ctx.rebuild();
  await ctx.dispose();
  console.log("[vscode-extension] built");
}
