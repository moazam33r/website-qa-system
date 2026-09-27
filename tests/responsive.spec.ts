import { test, expect } from "@playwright/test";
import { checkResponsive } from "../src/checks/responsive";

test("Responsive check", async ({ page }) => {

  // Testet kan ta längre tid eftersom sidan kontrolleras
  // i mobilstorlek och kan innehålla flera sidor.
  test.setTimeout(180000);

  // Hämtar webbplatsen från TARGET_URL.
  const url = process.env.TARGET_URL;

  // Stoppar testet om ingen webbplats har angetts.
  if (!url) {
    throw new Error("TARGET_URL måste anges");
  }

  // Skickar webbplatsen till responsivitetskontrollen.
  const pages = [url];

  // Kör kontrollen och sparar resultatet.
  const result = await checkResponsive(
    page,
    pages
  );

  // Kontrollerar att resultatet innehåller
  // antal godkända och underkända sidor.
  expect(result).toHaveProperty("passed");
  expect(result).toHaveProperty("failed");

  // Kontrollerar att värdena är nummer.
  expect(typeof result.passed).toBe("number");
  expect(typeof result.failed).toBe("number");

  // Kontrollerar att räknarna inte kan vara negativa.
  expect(result.passed).toBeGreaterThanOrEqual(0);
  expect(result.failed).toBeGreaterThanOrEqual(0);

  // Minst en sida ska ha kontrollerats.
  expect(
    result.passed + result.failed
  ).toBeGreaterThan(0);

  // Ett responsivitetsfel ska göra testet rött.
  expect(result.failed).toBe(0);
});