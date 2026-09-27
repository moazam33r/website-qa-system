import { test, expect } from "@playwright/test";

import { scanWebsite } from "../src/website-scanner";

test("Website scanner", async ({ page }) => {

  // Scanningen kör många olika kontroller och AI-analys,
  // därför behöver testet längre timeout.
  test.setTimeout(300000);

  // Hämtar webbplatsen från TARGET_URL.
  const url = process.env.TARGET_URL;

  // Stoppar testet om ingen webbplats har angetts.
  if (!url) {
    throw new Error(
      "TARGET_URL måste anges"
    );
  }

  // Kör hela QA-scanningen och sparar resultatet.
  const result = await scanWebsite(
    page,
    url
  );

  // Kontrollerar att resultatet innehåller
  // de viktigaste egenskaperna.
  expect(result).toHaveProperty("url");
  expect(result).toHaveProperty("status");
  expect(result).toHaveProperty("title");
  expect(result).toHaveProperty("links");
  expect(result).toHaveProperty("pages");
  expect(result).toHaveProperty("results");
  expect(result).toHaveProperty("aiAnalysis");

  // Kontrollerar att rätt datatyper returneras.
  expect(typeof result.url).toBe("string");
  expect(typeof result.status).toBe("number");
  expect(typeof result.title).toBe("string");
  expect(Array.isArray(result.links)).toBe(true);
  expect(Array.isArray(result.pages)).toBe(true);
  expect(Array.isArray(result.results)).toBe(true);
  expect(typeof result.aiAnalysis).toBe("string");

  // Webbplatsens startsida ska svara med en lyckad HTTP-status.
  expect(result.status).toBe(200);

  // Webbplatsen ska ha en titel.
  expect(result.title.trim()).not.toBe("");

  // Crawlern ska ha hittat minst en sida.
  expect(result.pages.length).toBeGreaterThan(0);

  // QA-systemet ska ha producerat minst ett kontrollresultat.
  expect(result.results.length).toBeGreaterThan(0);

  // Kontrollerar att varje QA-resultat har rätt struktur.
  for (const qaResult of result.results) {

    expect(qaResult).toHaveProperty("name");
    expect(qaResult).toHaveProperty("status");
    expect(qaResult).toHaveProperty("message");

    expect(typeof qaResult.name).toBe("string");
    expect(typeof qaResult.status).toBe("string");
    expect(typeof qaResult.message).toBe("string");

    // Säkerställer att endast giltiga QA-statusar används.
    expect([
      "PASS",
      "WARNING",
      "FAIL",
    ]).toContain(qaResult.status);
  }
});