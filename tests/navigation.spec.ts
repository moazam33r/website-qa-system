import { test, expect } from "@playwright/test";

import { checkPages } from "../src/checks/pages";
import { checkNavigation } from "../src/checks/navigation";

test("Navigation check", async ({ page }) => {

  // Webbplatsen vi testar
  const url = "https://digitalkontakt.se/";

  // Hittar automatiskt webbplatsens sidor
  const pageResult = await checkPages(
    page,
    url
  );

  // Hämtar sidorna som hittades
  const pages = pageResult.links;

  // Kör navigationskontrollen och sparar resultatet
  const result = await checkNavigation(
    page,
    url,
    pages
  );

  // Kontrollerar att resultatet innehåller
  // antal fungerande och trasiga navigationer
  expect(result).toHaveProperty("passed");
  expect(result).toHaveProperty("failed");

  // Kontrollerar att värdena är nummer
  expect(typeof result.passed).toBe("number");
  expect(typeof result.failed).toBe("number");

  // Kontrollerar att räknarna inte kan vara negativa
  expect(result.passed).toBeGreaterThanOrEqual(0);
  expect(result.failed).toBeGreaterThanOrEqual(0);

  // Minst en navigation ska ha kontrollerats
  expect(
    result.passed + result.failed
  ).toBeGreaterThan(0);

  // Ett trasigt navigationsmål ska göra testet rött
  expect(result.failed).toBe(0);
});