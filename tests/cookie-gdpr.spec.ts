import { test, expect } from "@playwright/test";

import { checkCookieGdpr } from "../src/checks/cookie-gdpr";

// Testar att Cookie/GDPR-kontrollen hittar relevanta sidor.
test("Cookie / GDPR kontroll", async ({ page }) => {

  // Skapar exempel på sidor där en Cookie- eller integritetssida finns.
  const pages = [
    "https://example.com/",
    "https://example.com/integritetspolicy/",
    "https://example.com/cookiepolicy/",
    "https://example.com/kontakt/",
  ];

  // Kör Cookie/GDPR-kontrollen och sparar resultatet.
  const result = await checkCookieGdpr(
    page,
    pages
  );

  // Kontrollerar att resultatet innehåller
  // antal hittade sidor och själva sidlistan.
  expect(result).toHaveProperty("found");
  expect(result).toHaveProperty("pages");

  // Kontrollerar att rätt datatyper returneras.
  expect(typeof result.found).toBe("number");
  expect(Array.isArray(result.pages)).toBe(true);

  // Antalet hittade sidor ska inte kunna vara negativt.
  expect(result.found).toBeGreaterThanOrEqual(0);

  // Kontrollerar att två relevanta sidor hittades.
  expect(result.found).toBe(2);

  // Kontrollerar att rätt sidor hittades.
  expect(result.pages).toContain(
    "https://example.com/integritetspolicy/"
  );

  expect(result.pages).toContain(
    "https://example.com/cookiepolicy/"
  );

  // Kontrollerar att en vanlig kontaktsida
  // inte räknas som Cookie/GDPR-sida.
  expect(result.pages).not.toContain(
    "https://example.com/kontakt/"
  );

  // Antalet hittade sidor ska stämma
  // med längden på resultatlistan.
  expect(result.found).toBe(
    result.pages.length
  );
});