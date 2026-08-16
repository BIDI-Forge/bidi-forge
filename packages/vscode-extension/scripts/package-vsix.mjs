#!/usr/bin/env node
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const out = join(root, `BIDI-Forge-${version}.vsix`);

execSync(`pnpm exec vsce package --no-dependencies -o "${out}"`, {
  cwd: root,
  stdio: "inherit",
});
console.log(`[package-vsix] ${out}`);
