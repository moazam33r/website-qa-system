import { test, expect } from "@playwright/test";

import { checkGoogleBusinessProfile } from "../src/checks/google-business-profile";

// Testar att systemet hittar en Google Business Profile
// och att företagsnamnet matchar webbplatsens företag
test("Google Business Profile matchar rätt företag", async ({ page }) => {

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

  // Kontrollerar att en Google-profil hittades
  expect(result.found).toHaveLength(1);

  // Kontrollerar att företaget matchar Google-profilen
  expect(result.failed).toHaveLength(0);

});