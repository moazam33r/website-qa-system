import { test, expect } from "@playwright/test";
import { checkPages } from "../src/checks/pages";

test("Pages check", async ({ page }) => {

  // Webbplatsen vi testar
  const url = "https://digitalkontakt.se/";

  // Kör sidkontrollen
  const result = await checkPages(page, url);

  // Kontrollerar att webbplatsen svarar
  expect(result.status).toBe(200);

  // Kontrollerar att sidan har en titel
  expect(result.title).not.toBe("");

  // Kontrollerar att sidor hittades
  expect(result.links.length).toBeGreaterThan(0);
});