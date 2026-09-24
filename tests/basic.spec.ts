import { test, expect } from "@playwright/test";

test("Playwright fungerar", async ({ page }) => {
  const url = process.env.TARGET_URL;

  if (!url) {
    throw new Error("TARGET_URL måste anges");
  }

  await page.goto(url);

  await expect(page).toHaveTitle(/.+/);
});