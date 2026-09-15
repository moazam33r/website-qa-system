import { test, expect } from "@playwright/test";

import { checkPages } from "../src/checks/pages";
import { checkNavigation } from "../src/checks/navigation";

test("Navigation check", async ({ page }) => {

  // Webbplatsen vi testar
  const url = "https://digitalkontakt.se/";

  // Hittar automatiskt webbplatsens sidor
  const pageResult = await checkPages(page, url);

  // Hämtar sidorna som hittades
  const pages = pageResult.links;

  // Kör navigationskontrollen
  const result = await checkNavigation(
    page,
    url,
    pages
  );

  // Kontrollerar att inga interna navigationer har gått sönder
  expect(result.failed).toBe(0);
});