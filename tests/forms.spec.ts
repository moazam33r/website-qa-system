import { test, expect } from "@playwright/test";
import { checkPages } from "../src/checks/pages";
import { checkForms } from "../src/checks/forms";

test("Forms check", async ({ page }) => {

  // Webbplatsen vi testar
  const url = "https://digitalkontakt.se/";

  // Hittar automatiskt webbplatsens sidor
  const pageResult = await checkPages(page, url);

  // Hämtar sidorna som hittades
  const pages = pageResult.links;

  // Kör formulärkontrollen och sparar resultatet
  const formResult = await checkForms(
    page,
    pages
  );

  // Kontrollerar att resultatet innehåller formulärdata
  expect(formResult).toHaveProperty("formCount");

  // Kontrollerar att antalet fält finns i resultatet
  expect(formResult).toHaveProperty("fieldCount");

  // Kontrollerar att antalet obligatoriska fält finns i resultatet
  expect(formResult).toHaveProperty("requiredCount");

  // Kontrollerar att värdena är nummer
  expect(typeof formResult.formCount).toBe("number");
  expect(typeof formResult.fieldCount).toBe("number");
  expect(typeof formResult.requiredCount).toBe("number");

  // Kontrollerar att värdena aldrig är negativa
  expect(formResult.formCount).toBeGreaterThanOrEqual(0);
  expect(formResult.fieldCount).toBeGreaterThanOrEqual(0);
  expect(formResult.requiredCount).toBeGreaterThanOrEqual(0);
});