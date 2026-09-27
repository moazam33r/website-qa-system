import { test, expect } from "@playwright/test";

import { checkPages } from "../src/checks/pages";
import { checkImages } from "../src/checks/images";

test("Images check", async ({ page }) => {

  // Webbplatsen vi testar
  const url = "https://digitalkontakt.se/";

  // Hittar automatiskt webbplatsens sidor
  const pageResult = await checkPages(
    page,
    url
  );

  // Hämtar sidorna som hittades
  const pages = pageResult.links;

  // Kör bildkontrollen och sparar resultatet
  const result = await checkImages(
    page,
    pages
  );

  // Kontrollerar att resultatet innehåller
  // antal fungerande och trasiga bilder
  expect(result).toHaveProperty("passed");
  expect(result).toHaveProperty("failed");

  // Kontrollerar att värdena är nummer
  expect(typeof result.passed).toBe("number");
  expect(typeof result.failed).toBe("number");

  // Kontrollerar att räknarna inte kan vara negativa
  expect(result.passed).toBeGreaterThanOrEqual(0);
  expect(result.failed).toBeGreaterThanOrEqual(0);

  // Minst en bild ska ha kontrollerats
  expect(
    result.passed + result.failed
  ).toBeGreaterThan(0);
});