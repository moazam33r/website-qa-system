import { Page } from "@playwright/test";

// Kontrollerar interna och externa länkar på webbplatsen
export async function checkLinks(
  page: Page,
  url: string,
  pages: string[]
) {

  // Håller koll på länkar som redan har kontrollerats
  const checkedLinks = new Set<string>();

  // Räknar interna länkar
  let internalPassed = 0;
  let internalFailed = 0;

  // Räknar externa länkar
  let externalPassed = 0;
  let externalFailed = 0;

  // Går igenom alla sidor på webbplatsen
  for (const pageUrl of pages) {

    // Öppnar sidan
    await page.goto(pageUrl);

    // Hämtar alla länkar på sidan
    const pageLinks = await page.locator("a[href]").evaluateAll((elements) =>
      elements.map((element) => {

        // Hämtar länkens adress
        const href = (element as HTMLAnchorElement).href;

        // Tar bort # från länken
        const linkUrl = new URL(href);
        linkUrl.hash = "";

        return linkUrl.toString();
      })
    );

    // Tar bort duplicerade länkar
    const uniquePageLinks = [...new Set(pageLinks)];

    // Kontrollerar varje länk
    for (const link of uniquePageLinks) {

      // Hoppar över länkar som redan har testats
      if (checkedLinks.has(link)) continue;

      checkedLinks.add(link);

      // Hoppar över e-postlänkar
      if (link.startsWith("mailto:")) continue;

      // Hoppar över telefonlänkar
      if (link.startsWith("tel:")) continue;

      // Hoppar över JavaScript-länkar
      if (link.startsWith("javascript:")) continue;

      // Kontrollerar om länken är intern
      const isInternalLink = link.startsWith(
        new URL(url).origin
      );

      // Kontrollerar externa länkar
      if (!isInternalLink) {

        try {

          // Skickar en request till den externa länken
          const response = await page.request.get(link);

          // Hämtar HTTP-status
          const status = response.status();

          if (status >= 200 && status < 400) {

            externalPassed++;

            console.log(
              `✓ Extern länk - ${link} - ${status}`
            );

          } else {

            externalFailed++;

            console.log(
              `✗ Extern länk - ${link} - ${status}`
            );
          }

        } catch {

          externalFailed++;

          console.log(
            `✗ Extern länk - ${link} - Request failed`
          );
        }

        continue;
      }

      // Kontrollerar interna länkar
      try {

        // Skickar en request till den interna länken
        const response = await page.request.get(link);

        // Hämtar HTTP-status
        const status = response.status();

        if (status >= 200 && status < 400) {

          internalPassed++;

          console.log(
            `✓ ${link} - ${status}`
          );

        } else {

          internalFailed++;

          console.log(
            `✗ ${link} - ${status}`
          );
        }

      } catch {

        internalFailed++;

        console.log(
          `✗ ${link} - Request failed`
        );
      }
    }
  }

  // Visar sammanfattning
  console.log("\nLink summary:");

  console.log(
    `Internal links: ${internalPassed} passed, ${internalFailed} failed`
  );

  console.log(
    `External links: ${externalPassed} passed, ${externalFailed} failed`
  );

  // Returnerar resultaten till QA-systemet
  return {
    internalPassed,
    internalFailed,
    externalPassed,
    externalFailed,
  };
}