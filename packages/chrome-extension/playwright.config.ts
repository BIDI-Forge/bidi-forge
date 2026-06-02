import { defineConfig } from "@playwright/test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: join(root, "e2e"),
  timeout: 30_000,
  use: {
    headless: true,
  },
});
