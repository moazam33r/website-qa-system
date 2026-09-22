import { test, expect } from "@playwright/test";

import { checkGoogleBusinessProfile } from "../src/checks/google-business-profile";

test("Google Business Profile-test hittar Google-profil", async ({ page }) => {

  await page.route(
    "https://qa-test.local/",
    async (route) => {

      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: `
          <html>
            <head>
              <title>Test Företag</title>
            </head>

            <body>

              <a href="https://www.google.com/maps/place/Test+Företag">
                Google Business Profile
              </a>

            </body>
          </html>
        `,
      });

    }
  );

  const result =
    await checkGoogleBusinessProfile(
      page,
      ["https://qa-test.local/"]
    );

  expect(result.found).toHaveLength(1);

  expect(
    result.found[0]
  ).toContain("google.com/maps");

});