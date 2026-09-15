import { Page } from "@playwright/test";

export async function scanWebsite(page: Page, url: string) {
  // Öppnar webbplatsen och hämtar HTTP-svaret
  const response = await page.goto(url);

  // Hämtar statuskod och sidtitel från startsidan
  const status = response?.status() ?? 0;
  const title = await page.title();

  // Hittar alla länkar på sidan
  const links = await page.locator("a[href]").evaluateAll((elements) =>
    elements
      .map((element) => (element as HTMLAnchorElement).href)

      // Behåller endast länkar som tillhör samma webbplats
      .filter((href) => href.startsWith(window.location.origin))
  );

  // Tar bort eventuella dubbletter
  const uniqueLinks = [...new Set(links)];

  console.log("Website:", url);
  console.log("Status:", status);
  console.log("Title:", title);
  console.log("Internal links:", uniqueLinks.length);

  // Skriver ut alla hittade interna sidor
  console.log("\nPages found:");
  uniqueLinks.forEach((link) => {
    console.log("-", link);
  });

  // Kontrollerar HTTP-status för varje intern sida
  console.log("\nPage status:");

  for (const link of uniqueLinks) {
    // Öppnar sidan och hämtar dess HTTP-svar
    const pageResponse = await page.goto(link);
    const pageStatus = pageResponse?.status() ?? 0;

    // Godkänner statuskoder mellan 200 och 399
    if (pageStatus >= 200 && pageStatus < 400) {
      console.log(`✓ ${link} - ${pageStatus}`);
    } else {
      // Rapporterar sidor med felaktig statuskod
      console.log(`✗ ${link} - ${pageStatus}`);
    }
  }

  // Returnerar information som kan användas av andra tester
  return {
    url,
    status,
    title,
    links: uniqueLinks,
  };
}