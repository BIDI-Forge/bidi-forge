import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

function fixtureUrl(name: string): string {
  return `file://${join(fixturesDir, name)}`;
}

test.describe("AI chat DOM fixtures", () => {
  test("Copilot composer and message roots exist", async ({ page }) => {
    await page.goto(fixtureUrl("copilot-composer.html"));
    await expect(page.locator('[contenteditable="true"]')).toBeVisible();
    await expect(page.locator('[data-content="ai-message"]')).toBeVisible();
  });

  test("Perplexity composer and answer exist", async ({ page }) => {
    await page.goto(fixtureUrl("perplexity-composer.html"));
    await expect(page.locator("textarea")).toBeVisible();
    await expect(page.locator(".prose.answer")).toBeVisible();
  });

  test("DeepSeek composer and assistant message exist", async ({ page }) => {
    await page.goto(fixtureUrl("deepseek-composer.html"));
    await expect(page.locator('.ProseMirror[contenteditable="true"]')).toBeVisible();
    await expect(page.locator('[data-role="assistant"]')).toBeVisible();
  });
});
