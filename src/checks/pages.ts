import { Page } from "@playwright/test";

// Kontrollerar och crawlar webbplatsens sidor
export async function checkPages(
  page: Page,
  url: string
) {

  // Hämtar webbplatsens domän
  const origin = new URL(url).origin;

  // Normaliserar startsidan så att / och utan / räknas som samma URL
  function normalizeUrl(rawUrl: string): string {
    const parsedUrl = new URL(rawUrl);

    parsedUrl.hash = "";

    if (parsedUrl.pathname === "/") {
      parsedUrl.pathname = "";
    }

    return parsedUrl.toString();
  }

  // Kö med sidor som ska besökas
  const pagesToVisit: string[] = [normalizeUrl(url)];

  // Håller koll på sidor som redan har besökts
  const visitedPages = new Set<string>();

  // Sparar resultatet för varje sida
  const pageResults: {
    url: string;
    status: number;
    working: boolean;
  }[] = [];

  console.log("\nWebsite:", url);

  // Fortsätter så länge det finns sidor kvar att besöka
  while (pagesToVisit.length > 0) {

    // Tar nästa sida från kön
    const currentUrl = pagesToVisit.shift();

    // Hoppar över om URL saknas
    if (!currentUrl) continue;

    // Hoppar över sidor som redan har besökts
    if (visitedPages.has(currentUrl)) continue;

    // Markerar sidan som besökt
    visitedPages.add(currentUrl);

    let responseStatus = 0;
    let pageLoaded = false;

    // Försöker öppna sidan upp till tre gånger
    for (let attempt = 1; attempt <= 3; attempt++) {

      try {

        // Försöker öppna sidan
        const response = await page.goto(
          currentUrl,
          {
            waitUntil: "domcontentloaded",
            timeout: 30000,
          }
        );

        // Hämtar HTTP-status
        responseStatus = response?.status() ?? 0;

        // Sidan kunde öppnas
        pageLoaded = true;

        break;

      } catch {

        console.log(
          `⚠ Kunde inte öppna ${currentUrl} - försök ${attempt}/3`
        );

        // Väntar lite innan nästa försök
        if (attempt < 3) {
          await page.waitForTimeout(1000);
        }
      }
    }

    // Sparar resultatet
    pageResults.push({
      url: currentUrl,
      status: responseStatus,
      working:
        pageLoaded &&
        responseStatus >= 200 &&
        responseStatus < 400,
    });

    // Visar resultatet
    if (
      pageLoaded &&
      responseStatus >= 200 &&
      responseStatus < 400
    ) {

      console.log(
        `✓ ${currentUrl} - ${responseStatus}`
      );

    } else {

      console.log(
        `✗ ${currentUrl} - ${responseStatus || "Request failed"}`
      );
    }

    // Om sidan inte kunde öppnas efter tre försök
    // finns det inga länkar att hämta från sidan
    if (!pageLoaded) {
      continue;
    }

    // Hämtar alla interna länkar från den aktuella sidan
    const links = await page.locator("a[href]").evaluateAll(
      (elements, origin) =>
        elements
          .map((element) => {

            // Hämtar länken
            const href = (
              element as HTMLAnchorElement
            ).href;

            try {

              // Gör om länken till en URL
              const linkUrl = new URL(href);

              // Tar bort # från URL:en
              linkUrl.hash = "";

              return linkUrl.toString();

            } catch {

              // Hoppar över URL:er som inte kan läsas
              return null;
            }
          })

          // Behåller bara giltiga URL:er
          .filter(
            (href): href is string =>
              href !== null
          )

          // Behåller bara länkar från samma webbplats
          .filter(
            (href) =>
              href.startsWith(origin)
          ),

      // Skickar med webbplatsens domän
      origin
    );

    // Normaliserar URL:er
    const normalizedLinks = links.map(
      (link) => normalizeUrl(link)
    );

    // Tar bort duplicerade länkar
    const uniqueLinks = [...new Set(normalizedLinks)];

    // Lägger till nya sidor i kön
    for (const link of uniqueLinks) {

      // Lägg bara till sidan om den inte redan har
      // besökts eller ligger i kön
      if (
        !visitedPages.has(link) &&
        !pagesToVisit.includes(link)
      ) {

        pagesToVisit.push(link);
      }
    }
  }

  // Öppnar startsidan igen för att hämta dess titel
  await page.goto(url);

  const title = await page.title();

  // Räknar fungerande sidor
  const passedPages = pageResults.filter(
    (result) => result.working
  ).length;

  // Räknar sidor som inte fungerar
  const failedPages = pageResults.filter(
    (result) => !result.working
  ).length;

  console.log("\nPages found:");

  // Visar alla hittade sidor
  pageResults.forEach((result) => {
    console.log("-", result.url);
  });

  console.log("\nPage summary:");

  console.log(
    `Pages: ${passedPages} passed, ${failedPages} failed`
  );

  // Returnerar resultatet till QA-systemet
  return {
    url,
    status: pageResults[0]?.status ?? 0,
    title,
    links: pageResults.map(
      (result) => result.url
    ),
    pages: pageResults,
    passedPages,
    failedPages,
  };
}