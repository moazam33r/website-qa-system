import { test, expect } from "@playwright/test";
import fs from "fs";

import { checkGoogleBusinessProfile } from "../src/checks/google-business-profile";

test("Google Business Profile och Google Maps matchar rätt företag", async ({ page }) => {

  // Mockad testsida
  await page.route(
    "https://qa-test.local/",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html; charset=utf-8",
        body: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <title>Test Företag</title>
            </head>

            <body>

              <a href="https://www.google.com/maps/place/Test-Foretag">
                Google Business Profile
              </a>

              <iframe
                src="https://www.google.com/maps/embed?pb=Test-Foretag"
              ></iframe>

            </body>
          </html>
        `,
      });
    }
  );

  // Mockad Google Business Profile
  await page.route(
    "https://www.google.com/maps/place/Test-Foretag",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html; charset=utf-8",
        body: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <title>Test Företag - Google Maps</title>
            </head>

            <body>

              <h1>Test Företag</h1>

              <p>
                Test Företag är ett företag i Stockholm.
              </p>

            </body>
          </html>
        `,
      });
    }
  );

  // Kör Google Business Profile-kontrollen
  const result =
    await checkGoogleBusinessProfile(
      page,
      ["https://qa-test.local/"]
    );

  // En riktig Business Profile ska hittas
  expect(result.found).toHaveLength(1);

  // Företaget ska matcha profilen
  expect(result.failed).toHaveLength(0);

  // Google Maps ska också matcha företaget
  expect(result.mapsMatches).toHaveLength(1);

  expect(
    result.mapsMatches[0].companyName
  ).toBe("Test Företag");

  // Screenshot ska ha skapats
  expect(result.screenshots).toHaveLength(1);

  expect(
    fs.existsSync(result.screenshots[0].path)
  ).toBe(true);
});