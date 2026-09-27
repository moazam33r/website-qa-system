import { test, expect } from "@playwright/test";

import { checkCTA } from "../src/checks/cta";

test("CTA-test hittar fungerande och trasiga CTA-länkar", async ({ page }) => {

  // Mockar startsidan så att testet inte behöver använda en riktig webbplats.
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

  // Sparar den riktiga GET-funktionen så att
  // övriga anrop kan hanteras normalt.
  const originalGet = page.request.get.bind(
    page.request
  );

  // Mockar HTTP-svaren för CTA-länkarna.
  page.request.get = async (url: string) => {

    // Fungerande CTA.
    if (url.includes("/fungerar/")) {

      return {
        status: () => 200,
      } as any;
    }

    // Trasig CTA.
    if (url.includes("/trasig/")) {

      return {
        status: () => 404,
      } as any;
    }

    // Övriga länkar använder den riktiga funktionen.
    return originalGet(url);
  };

  // Kör CTA-kontrollen och sparar resultatet.
  const result = await checkCTA(
    page,
    ["https://qa-test.local/"]
  );

  // Kontrollerar att resultatet innehåller
  // antal fungerande och trasiga CTA-länkar.
  expect(result).toHaveProperty("passed");
  expect(result).toHaveProperty("failed");

  // Kontrollerar att värdena är nummer.
  expect(typeof result.passed).toBe("number");
  expect(typeof result.failed).toBe("number");

  // Kontrollerar att räknarna inte kan vara negativa.
  expect(result.passed).toBeGreaterThanOrEqual(0);
  expect(result.failed).toBeGreaterThanOrEqual(0);

  // Testet ska hitta exakt en fungerande CTA
  // och exakt en trasig CTA i vår mockade sida.
  expect(result.passed).toBe(1);
  expect(result.failed).toBe(1);
});