import { test, expect } from "@playwright/test";

import { checkSocialMedia } from "../src/checks/social-media";

test("Social media-test hittar och kontrollerar sociala medier", async ({ page }) => {

  await page.route(
    "https://qa-test.local/",
    async (route) => {

      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: `
            <html>
                <head>
                <meta charset="UTF-8">
                <title>Test Företag</title>
            </head>

            <body>

              <!-- Konto som matchar företaget -->
              <a href="https://facebook.com/testforetag">
                Facebook
              </a>

              <!-- Konto som INTE matchar företaget -->
              <a href="https://instagram.com/heltannatforetag">
                Instagram
              </a>

              <!-- Konto som matchar företaget -->
              <a href="https://linkedin.com/company/testforetag">
                LinkedIn
              </a>

            </body>
          </html>
        `,
      });
    }
  );

  const result = await checkSocialMedia(
    page,
    ["https://qa-test.local/"],
    "https://qa-test.local/"
  );

  // Kontrollerar att tre sociala medier hittades
  expect(result.found).toHaveLength(3);

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

  // Instagram ska identifieras som ett konto
  // som inte matchar företaget
  expect(
    result.failed.some(
      (item) => item.platform === "Instagram"
    )
  ).toBe(true);

});