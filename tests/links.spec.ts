import { test, expect } from "@playwright/test";

import { checkPages } from "../src/checks/pages";
import { checkLinks } from "../src/checks/links";

test("Links check", async ({ page }) => {

  // Webbplatsen vi testar
  const url = "https://digitalkontakt.se/";

  // Hittar automatiskt webbplatsens interna sidor
  const pageResult = await checkPages(
    page,
    url
  );

  // Hämtar sidorna som hittades
  const pages = pageResult.links;

  // Kör länkkontrollen och sparar resultatet
  const result = await checkLinks(
    page,
    url,
    pages
  );

  // Kontrollerar att alla resultat finns
  expect(result).toHaveProperty("internalPassed");
  expect(result).toHaveProperty("internalFailed");
  expect(result).toHaveProperty("externalPassed");
  expect(result).toHaveProperty("externalFailed");

  // Kontrollerar att alla räknare är nummer
  expect(typeof result.internalPassed).toBe("number");
  expect(typeof result.internalFailed).toBe("number");
  expect(typeof result.externalPassed).toBe("number");
  expect(typeof result.externalFailed).toBe("number");

  // Kontrollerar att inga räknare kan vara negativa
  expect(result.internalPassed).toBeGreaterThanOrEqual(0);
  expect(result.internalFailed).toBeGreaterThanOrEqual(0);
  expect(result.externalPassed).toBeGreaterThanOrEqual(0);
  expect(result.externalFailed).toBeGreaterThanOrEqual(0);

  // Minst en länk ska ha kontrollerats
  const totalLinks =
    result.internalPassed +
    result.internalFailed +
    result.externalPassed +
    result.externalFailed;

  expect(totalLinks).toBeGreaterThan(0);
});