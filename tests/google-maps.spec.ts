import { test, expect } from "@playwright/test";

import { checkGoogleMaps } from "../src/checks/google-maps";

test("Google Maps-test hittar Google Maps-länk", async ({ page }) => {

  await page.route(
    "https://qa-test.local/",
    async (route) => {

      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: `
          <html>
            <body>

              <a href="https://www.google.com/maps/place/Test+Company">
                Hitta oss på Google Maps
              </a>

              <a href="/kontakt/">
                Kontakt
              </a>

            </body>
          </html>
        `,
      });
    }
  );

  const result = await checkGoogleMaps(
    page,
    ["https://qa-test.local/"]
  );

  expect(result.found).toHaveLength(1);

  expect(
    result.found[0]
  ).toContain("google.com/maps");
});