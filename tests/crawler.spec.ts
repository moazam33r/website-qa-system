import { test, expect } from "@playwright/test";

import { checkPages } from "../src/checks/pages";

test("Crawler hittar sidor från undersidor", async ({ page }) => {

  // Skapar en liten testwebbplats med tre sidor.
  // Startsidan länkar till sida 1 och sida 1 länkar till sida 2.
  await page.route("https://qa-test.local/**", async (route) => {

    // Hämtar vilken sida som efterfrågas.
    const url = route.request().url();

    // Startsidan länkar till sida 1.
    if (url === "https://qa-test.local/") {

      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: `
          <html>
            <head>
              <title>Testwebbplats</title>
            </head>
            <body>
              <h1>Startsida</h1>
              <a href="/sida-1/">Sida 1</a>
            </body>
          </html>
        `,
      });

      return;
    }

    // Sida 1 länkar till sida 2.
    if (url === "https://qa-test.local/sida-1/") {

      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: `
          <html>
            <head>
              <title>Sida 1</title>
            </head>
            <body>
              <h1>Sida 1</h1>
              <a href="/sida-2/">Sida 2</a>
            </body>
          </html>
        `,
      });

      return;
    }

    // Sida 2 har inga nya länkar.
    if (url === "https://qa-test.local/sida-2/") {

      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: `
          <html>
            <head>
              <title>Sida 2</title>
            </head>
            <body>
              <h1>Sida 2</h1>
            </body>
          </html>
        `,
      });

      return;
    }

    // Alla andra adresser ger 404.
    await route.fulfill({
      status: 404,
      contentType: "text/html",
      body: "<h1>404</h1>",
    });
  });

  // Startar crawlern från startsidan.
  const result = await checkPages(
    page,
    "https://qa-test.local/"
  );

  // Kontrollerar att resultatet innehåller
  // de viktigaste egenskaperna.
  expect(result).toHaveProperty("links");
  expect(result).toHaveProperty("pages");
  expect(result).toHaveProperty("passedPages");
  expect(result).toHaveProperty("failedPages");

  // Kontrollerar att rätt datatyper returneras.
  expect(Array.isArray(result.links)).toBe(true);
  expect(Array.isArray(result.pages)).toBe(true);
  expect(typeof result.passedPages).toBe("number");
  expect(typeof result.failedPages).toBe("number");

  // Hämtar alla hittade URL:er.
  const pages = result.links;

  console.log("\nCrawler test - hittade sidor:");

  pages.forEach((url) => {
    console.log("-", url);
  });

  // Kontrollerar att crawlern hittade alla tre sidor.
  expect(pages).toContain(
    "https://qa-test.local/"
  );

  expect(pages).toContain(
    "https://qa-test.local/sida-1/"
  );

  expect(pages).toContain(
    "https://qa-test.local/sida-2/"
  );

  // Vi förväntar oss exakt tre sidor.
  expect(pages).toHaveLength(3);

  // Alla tre mockade sidor ska fungera.
  expect(result.passedPages).toBe(3);
  expect(result.failedPages).toBe(0);

  // Antalet lyckade och misslyckade sidor
  // ska motsvara det totala antalet crawlad sidor.
  expect(
    result.passedPages + result.failedPages
  ).toBe(result.pages.length);
});