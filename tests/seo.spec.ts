import { test, expect } from "@playwright/test";
import { checkSEO } from "../src/checks/seo";

test("SEO-kontroll", async ({ page }) => {

  // Webbplatsens sida som ska kontrolleras
  const pages = [
    "https://digitalkontakt.se",
  ];

  // Kör SEO-kontrollen och sparar resultatet
  const result = await checkSEO(
    page,
    pages
  );

  // Kontrollerar att resultatet innehåller
  // de tre förväntade resultatlistorna.
  expect(result).toHaveProperty("passed");
  expect(result).toHaveProperty("warnings");
  expect(result).toHaveProperty("failed");

  // Kontrollerar att alla resultat är arrayer.
  expect(Array.isArray(result.passed))
    .toBe(true);

  expect(Array.isArray(result.warnings))
    .toBe(true);

  expect(Array.isArray(result.failed))
    .toBe(true);

  // Kontrollerar att SEO-kontrollen faktiskt
  // har genomfört minst en kontroll.
  const totalResults =
    result.passed.length +
    result.warnings.length +
    result.failed.length;

  expect(totalResults).toBeGreaterThan(0);

  // Kontrollerar att varje resultat är text.
  for (const item of result.passed) {
    expect(typeof item).toBe("string");
  }

  for (const item of result.warnings) {
    expect(typeof item).toBe("string");
  }

  for (const item of result.failed) {
    expect(typeof item).toBe("string");
  }
});