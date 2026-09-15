import { Page } from "@playwright/test";

// Kontrollerar interna och externa länkar på webbplatsen
export async function checkLinks(page: Page, url: string, pages: string[]) {

  // Håller koll på länkar som redan har kontrollerats
  const checkedLinks = new Set<string>();

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

      // Hoppar över länkar som redan testats
      if (checkedLinks.has(link)) continue;

      checkedLinks.add(link);

      // Hoppar över e-postlänkar
      if (link.startsWith("mailto:")) continue;

      // Hoppar över telefonlänkar
      if (link.startsWith("tel:")) continue;

      // Hoppar över JavaScript-länkar
      if (link.startsWith("javascript:")) continue;

      // Kontrollerar om länken är intern
      const isInternalLink = link.startsWith(new URL(url).origin);

      // Kontrollerar externa länkar
      if (!isInternalLink) {

        try {
          // Skickar en request till den externa länken
          const response = await page.request.get(link);

          // Hämtar HTTP-status
          const status = response.status();

          if (status >= 200 && status < 400) {
            console.log(`✓ Extern länk - ${link} - ${status}`);
          } else {
            console.log(`✗ Extern länk - ${link} - ${status}`);
          }

        } catch {
          console.log(`✗ Extern länk - ${link} - Request failed`);
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
          console.log(`✓ ${link} - ${status}`);
        } else {
          console.log(`✗ ${link} - ${status}`);
        }

      } catch {
        console.log(`✗ ${link} - Request failed`);
      }
    }
  }
}