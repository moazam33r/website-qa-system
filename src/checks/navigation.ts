import { Page } from "@playwright/test";

// Kontrollerar att interna navigationslänkar fungerar
export async function checkNavigation(
  page: Page,
  url: string,
  pages: string[]
) {

  // Håller koll på navigationer som redan har kontrollerats
  const checkedNavigationLinks = new Set<string>();

  // Räknar fungerande navigationer
  let passed = 0;

  // Räknar navigationer som inte fungerar
  let failed = 0;

  console.log("\nNavigation check:");

  // Går igenom alla sidor på webbplatsen
  for (const pageUrl of pages) {

    // Öppnar sidan
    await page.goto(pageUrl);

    // Hämtar alla länkar på sidan
    const navigationLinks = await page.locator("a[href]").evaluateAll(
      (elements) =>
        elements
          .map((element) => {

            // Hämtar länkens adress
            const href = (element as HTMLAnchorElement).href;

            // Hoppar över e-postlänkar
            if (href.startsWith("mailto:")) {
              return null;
            }

            // Hoppar över telefonlänkar
            if (href.startsWith("tel:")) {
              return null;
            }

            // Hoppar över JavaScript-länkar
            if (href.startsWith("javascript:")) {
              return null;
            }

            // Tar bort # från länken
            const linkUrl = new URL(href);
            linkUrl.hash = "";

            return linkUrl.toString();
          })

          // Tar bort länkar som är null
          .filter((href): href is string => href !== null)
    );

    // Tar bort duplicerade länkar
    const uniqueNavigationLinks = [...new Set(navigationLinks)];

    // Kontrollerar varje navigation
    for (const link of uniqueNavigationLinks) {

      // Kontrollerar om länken är intern
      const isInternalLink = link.startsWith(
        new URL(url).origin
      );

      // Hoppar över externa länkar
      if (!isInternalLink) continue;

      // Hoppar över länkar som redan har kontrollerats
      if (checkedNavigationLinks.has(link)) continue;

      checkedNavigationLinks.add(link);

      try {

        // Skickar en request till sidan
        const response = await page.request.get(link);

        // Hämtar HTTP-status
        const status = response.status();

        // Kontrollerar om navigationen fungerar
        if (status >= 200 && status < 400) {

          passed++;

        } else {

          failed++;

          console.log(
            `✗ Navigation - ${link} - ${status}`
          );
        }

      } catch {

        // Navigationen kunde inte nås
        failed++;

        console.log(
          `✗ Navigation - ${link} - Request failed`
        );
      }
    }
  }

  // Visar sammanfattning
  console.log("\nNavigation summary:");

  console.log(
    `Navigation: ${passed} passed, ${failed} failed`
  );

  // Returnerar resultaten till QA-systemet
  return {
    passed,
    failed,
  };
}