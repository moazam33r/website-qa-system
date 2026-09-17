import { Page } from "@playwright/test";

// Kontrollerar webbplatsens sidor och deras HTTP-status
export async function checkPages(page: Page, url: string) {

  // Öppnar webbplatsen
  const response = await page.goto(url);

  // Hämtar HTTP-status från startsidan
  const status = response?.status() ?? 0;

  // Hämtar sidans titel
  const title = await page.title();

  // Hämtar webbplatsens domän
  const origin = new URL(url).origin;

  // Hämtar alla interna länkar på startsidan
  const links = await page.locator("a[href]").evaluateAll(
    (elements, origin) =>
      elements
        .map((element) => {

          // Hämtar länken
          const href = (element as HTMLAnchorElement).href;

          // Gör om länken till en URL
          const linkUrl = new URL(href);

          // Tar bort # från slutet av länken
          linkUrl.hash = "";

          return linkUrl.toString();
        })

        // Behåller bara länkar från samma webbplats
        .filter((href) => href.startsWith(origin)),

    // Skickar med webbplatsens domän
    origin
  );

  // Tar bort duplicerade länkar
  const uniqueLinks = [...new Set(links)];

  console.log("Website:", url);
  console.log("Status:", status);
  console.log("Title:", title);
  console.log("Internal links:", uniqueLinks.length);

  console.log("\nPages found:");

  // Skriver ut alla hittade sidor
  uniqueLinks.forEach((link) => {
    console.log("-", link);
  });

  console.log("\nPage status:");

  // Sparar resultatet för varje sida
  const pageResults = [];

  // Besöker varje hittad sida
  for (const link of uniqueLinks) {

    // Öppnar sidan
    const pageResponse = await page.goto(link);

    // Hämtar HTTP-status
    const pageStatus = pageResponse?.status() ?? 0;

    // Sparar resultatet
    pageResults.push({
      url: link,
      status: pageStatus,
      working: pageStatus >= 200 && pageStatus < 400,
    });

    // Visar resultatet
    if (pageStatus >= 200 && pageStatus < 400) {
      console.log(`✓ ${link} - ${pageStatus}`);
    } else {
      console.log(`✗ ${link} - ${pageStatus}`);
    }
  }

  // Räknar fungerande sidor
  const passedPages = pageResults.filter(
    (result) => result.working
  ).length;

  // Räknar sidor med fel
  const failedPages = pageResults.filter(
    (result) => !result.working
  ).length;

  // Returnerar resultatet
  return {
    url,
    status,
    title,
    links: uniqueLinks,
    pages: pageResults,
    passedPages,
    failedPages,
  };
}