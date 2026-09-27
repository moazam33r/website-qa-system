import { test, expect } from "@playwright/test";

import { checkPages } from "../src/checks/pages";

test("Pages check", async ({ page }) => {

  // Webbplatsen vi testar
  const url = "https://digitalkontakt.se/";

  // Kör sidkontrollen och sparar resultatet
  const result = await checkPages(
    page,
    url
  );

  // Kontrollerar att resultatet innehåller
  // de viktigaste egenskaperna från checkPages.
  expect(result).toHaveProperty("url");
  expect(result).toHaveProperty("status");
  expect(result).toHaveProperty("title");
  expect(result).toHaveProperty("links");
  expect(result).toHaveProperty("pages");
  expect(result).toHaveProperty("passedPages");
  expect(result).toHaveProperty("failedPages");

  // Kontrollerar att rätt typer returneras.
  expect(typeof result.url).toBe("string");
  expect(typeof result.status).toBe("number");
  expect(typeof result.title).toBe("string");
  expect(Array.isArray(result.links)).toBe(true);
  expect(Array.isArray(result.pages)).toBe(true);
  expect(typeof result.passedPages).toBe("number");
  expect(typeof result.failedPages).toBe("number");

  // Webbplatsens startsida ska svara med HTTP 200.
  expect(result.status).toBe(200);

  // Sidan ska ha en titel.
  expect(result.title.trim()).not.toBe("");

  // Minst en sida ska hittas.
  expect(result.links.length).toBeGreaterThan(0);

  // Antalet hittade sidor ska stämma med
  // antalet fungerande och trasiga sidor.
  expect(
    result.passedPages + result.failedPages
  ).toBe(result.pages.length);

  // Inga räknare ska kunna vara negativa.
  expect(result.passedPages).toBeGreaterThanOrEqual(0);
  expect(result.failedPages).toBeGreaterThanOrEqual(0);

  // Varje crawlad sida ska innehålla URL,
  // HTTP-status och working-status.
  for (const pageResult of result.pages) {

    expect(pageResult).toHaveProperty("url");
    expect(pageResult).toHaveProperty("status");
    expect(pageResult).toHaveProperty("working");

    expect(typeof pageResult.url).toBe("string");
    expect(typeof pageResult.status).toBe("number");
    expect(typeof pageResult.working).toBe("boolean");
  }

  // Testet ska inte acceptera trasiga sidor
  // på den webbplats vi använder som testdata.
  expect(result.failedPages).toBe(0);
});