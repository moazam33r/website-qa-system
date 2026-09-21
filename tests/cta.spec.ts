import { test, expect } from "@playwright/test";

import { checkCTA } from "../src/checks/cta";

test("CTA-test hittar fungerande och trasiga CTA-länkar", async ({ page }) => {

  // Mockar startsidan
  await page.route(
    "https://qa-test.local/",
    async (route) => {

      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: `
          <html>
            <body>

              <a
                class="button"
                href="/fungerar/"
              >
                Kontakta oss
              </a>

              <a href="/vanlig-lank/">
                Vanlig länk
              </a>

              <a
                class="cta"
                href="/trasig/"
              >
                Begar offert
              </a>

            </body>
          </html>
        `,
      });
    }
  );

  // Mockar HTTP-anropen som görs av CTA-kontrollen
  const originalGet = page.request.get.bind(
    page.request
  );

  page.request.get = async (url: string) => {

    // Fungerande CTA
    if (url.includes("/fungerar/")) {

      return {
        status: () => 200,
      } as any;
    }

    // Trasig CTA
    if (url.includes("/trasig/")) {

      return {
        status: () => 404,
      } as any;
    }

    // Övriga länkar
    return originalGet(url);
  };

  // Kör CTA-kontrollen
  const result = await checkCTA(
    page,
    ["https://qa-test.local/"]
  );

  // En CTA ska fungera
  expect(result.passed).toBe(1);

  // En CTA ska vara trasig
  expect(result.failed).toBe(1);
});