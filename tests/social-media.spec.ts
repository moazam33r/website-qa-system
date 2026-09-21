import { test, expect } from "@playwright/test";

import { checkSocialMedia } from "../src/checks/social-media";

test("Social media-test hittar sociala medier", async ({ page }) => {

  // Skapar en testsida med sociala medier-länkar
  await page.route(
    "https://qa-test.local/",
    async (route) => {

      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: `
          <html>
            <body>

              <a href="https://facebook.com/test">
                Facebook
              </a>

              <a href="https://instagram.com/test">
                Instagram
              </a>

              <a href="https://linkedin.com/company/test">
                LinkedIn
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

  // Kör kontrollen
  const result = await checkSocialMedia(
    page,
    ["https://qa-test.local/"]
  );

  // Facebook ska hittas
  expect(
    result.found.some(
      (item) => item.platform === "Facebook"
    )
  ).toBe(true);

  // Instagram ska hittas
  expect(
    result.found.some(
      (item) => item.platform === "Instagram"
    )
  ).toBe(true);

  // LinkedIn ska hittas
  expect(
    result.found.some(
      (item) => item.platform === "LinkedIn"
    )
  ).toBe(true);

  // En vanlig kontaktlänk ska inte räknas
  expect(
    result.found.some(
      (item) => item.platform === "Kontakt"
    )
  ).toBe(false);

  // Totalt tre sociala medier ska hittas
  expect(result.found).toHaveLength(3);
});