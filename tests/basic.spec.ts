import { test, expect } from "@playwright/test";

test("Playwright fungerar", async ({ page }) => {

  // Hämtar webbplatsen som ska testas från TARGET_URL.
  const url = process.env.TARGET_URL;

  // Stoppar testet om ingen webbplats har angetts.
  if (!url) {
    throw new Error(
      "TARGET_URL måste anges"
    );
  }

  // Öppnar webbplatsen och sparar HTTP-svaret.
  const response = await page.goto(url);

  // Säkerställer att ett HTTP-svar faktiskt kom tillbaka.
  expect(response).not.toBeNull();

  // Webbplatsens startsida ska svara med status 200.
  expect(response?.status()).toBe(200);

  // Kontrollerar att sidan har en giltig URL.
  expect(page.url()).toContain(url);

  // Kontrollerar att sidan har en titel.
  await expect(page).toHaveTitle(/.+/);
});