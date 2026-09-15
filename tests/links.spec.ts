import { test } from "@playwright/test";
import { checkPages } from "../src/checks/pages";
import { checkLinks } from "../src/checks/links";

test("Links check", async ({ page }) => {

  // Webbplatsen vi testar
  const url = "https://digitalkontakt.se/";

  // Hittar automatiskt webbplatsens interna sidor
  const pageResult = await checkPages(page, url);

  // Hämtar sidorna som hittades
  const pages = pageResult.links;

  // Kör länkkontrollen på de hittade sidorna
  await checkLinks(page, url, pages);
});