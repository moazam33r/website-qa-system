import { test } from "@playwright/test";
import { checkPages } from "../src/checks/pages";
import { checkForms } from "../src/checks/forms";

test("Forms check", async ({ page }) => {

  // Webbplatsen vi testar
  const url = "https://digitalkontakt.se/";

  // Hittar automatiskt webbplatsens sidor
  const pageResult = await checkPages(page, url);

  // Hämtar sidorna som hittades
  const pages = pageResult.links;

  // Kör formulärkontrollen
  await checkForms(page, pages);
});