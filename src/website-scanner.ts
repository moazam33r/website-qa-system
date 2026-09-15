import { Page } from "@playwright/test";

export async function scanWebsite(page: Page, url: string) {
  // Öppnar webbplatsen och hämtar HTTP-svaret
  const response = await page.goto(url);

  // Hämtar statuskod och sidtitel från startsidan
  const status = response?.status() ?? 0;
  const title = await page.title();

  // Hittar alla länkar på startsidan
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

  // Kontrollerar länkar på varje intern sida
  console.log("\nBroken link check:");

  // Håller reda på länkar som redan har kontrollerats
  const checkedLinks = new Set<string>();

  for (const pageUrl of uniqueLinks) {
    // Öppnar sidan som ska kontrolleras
    await page.goto(pageUrl);

    // Hämtar alla länkar från sidan
    const pageLinks = await page.locator("a[href]").evaluateAll((elements) =>
      elements.map((element) => (element as HTMLAnchorElement).href)
    );

    // Tar bort dubbletter från sidan
    const uniquePageLinks = [...new Set(pageLinks)];

    // Kontrollerar varje länk
    for (const link of uniquePageLinks) {
      // Hoppar över länkar som redan har kontrollerats
      if (checkedLinks.has(link)) {
        continue;
      }

      // Lägger till länken så att den inte kontrolleras igen
      checkedLinks.add(link);

      // Kontrollerar om länken är intern eller extern
      const isInternalLink = link.startsWith(new URL(url).origin);

      // Externa länkar hanteras separat eftersom externa webbplatser
      // kan blockera automatiserade requests och ge missvisande statuskoder
      if (!isInternalLink) {
        console.log(`⚠ Extern länk - ${link}`);
        continue;
      }

      try {
        // Skickar en HTTP-request till den interna länken
        const linkResponse = await page.request.get(link);
        const linkStatus = linkResponse.status();

        // Godkänner statuskoder mellan 200 och 399
        if (linkStatus >= 200 && linkStatus < 400) {
          console.log(`✓ ${link} - ${linkStatus}`);
        } else {
          // Rapporterar interna länkar som returnerar exempelvis 404 eller 500
          console.log(`✗ ${link} - ${linkStatus}`);
        }
      } catch {
        // Hanterar länkar där requesten misslyckas
        console.log(`✗ ${link} - Request failed`);
      }
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