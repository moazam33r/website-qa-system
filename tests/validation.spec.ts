import { test, expect } from "@playwright/test";
import { checkPages } from "../src/checks/pages";
import { checkValidation } from "../src/checks/validation";

test("Validation check", async ({ page }) => {

  // Webbplatsen vi testar
  const url = "https://digitalkontakt.se/";

  // Hittar automatiskt webbplatsens sidor
  const pageResult = await checkPages(page, url);

  // Hämtar sidorna som hittades
  const pages = pageResult.links;

  // Kör valideringskontrollen och sparar resultatet
  const validationResult =
    await checkValidation(page, pages);

  // Kontrollerar att resultatet innehåller
  // alla förväntade valideringsvärden.
  expect(validationResult).toHaveProperty(
    "emailPassed"
  );

  expect(validationResult).toHaveProperty(
    "emailFailed"
  );

  expect(validationResult).toHaveProperty(
    "phonePassed"
  );

  expect(validationResult).toHaveProperty(
    "phoneFailed"
  );

  // Kontrollerar att alla resultat är nummer.
  expect(typeof validationResult.emailPassed)
    .toBe("number");

  expect(typeof validationResult.emailFailed)
    .toBe("number");

  expect(typeof validationResult.phonePassed)
    .toBe("number");

  expect(typeof validationResult.phoneFailed)
    .toBe("number");

  // Kontrollerar att inga räknare kan vara negativa.
  expect(validationResult.emailPassed)
    .toBeGreaterThanOrEqual(0);

  expect(validationResult.emailFailed)
    .toBeGreaterThanOrEqual(0);

  expect(validationResult.phonePassed)
    .toBeGreaterThanOrEqual(0);

  expect(validationResult.phoneFailed)
    .toBeGreaterThanOrEqual(0);
});