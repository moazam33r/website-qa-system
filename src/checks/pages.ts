import { Page } from "@playwright/test";

// =========================================================
// TYPES
// =========================================================

// Information som skickas tillbaka medan crawlern arbetar.
export interface PageProgress {
  // Antal sidor som redan har analyserats.
  current: number;

  // Antal sidor som hittills har upptäckts.
  discovered: number;

  // Text som kan visas i popupen.
  message: string;
}


// =========================================================
// CRAWLER
// =========================================================

// Kontrollerar och crawlar webbplatsens sidor.
//
// onProgress används för att skicka riktig progress
// vidare till website-scanner -> API -> extension.
export async function checkPages(
  page: Page,
  url: string,
  onProgress?: (progress: PageProgress) => void
) {

  // Hämtar webbplatsens domän.
  const origin = new URL(url).origin;


  // =========================================================
  // URL-NORMALISERING
  // =========================================================

  // Normaliserar URL:er så att exempelvis
  // / och /#section räknas som samma sida.
  function normalizeUrl(rawUrl: string): string {

    // Skapar ett URL-objekt.
    const parsedUrl = new URL(rawUrl);

    // Tar bort anchors.
    parsedUrl.hash = "";

    // Startsidan ska inte ha ett extra /.
    if (parsedUrl.pathname === "/") {
      parsedUrl.pathname = "";
    }

    // Returnerar den normaliserade URL:en.
    return parsedUrl.toString();
  }


  // =========================================================
  // CRAWLER-KÖ
  // =========================================================

  // Kö med sidor som ska besökas.
  const pagesToVisit: string[] = [
    normalizeUrl(url),
  ];

  // Håller koll på sidor som redan har besökts.
  const visitedPages = new Set<string>();

  // Sparar resultatet för varje sida.
  const pageResults: {
    url: string;
    status: number;
    working: boolean;
  }[] = [];


  // Visar information i terminalen.
  console.log("\nWebsite:", url);


  // Skickar första progress-eventet direkt.
  onProgress?.({
    current: 0,
    discovered: pagesToVisit.length,
    message: "Förbereder crawling...",
  });


  // =========================================================
  // CRAWLING
  // =========================================================

  // Fortsätter så länge det finns sidor kvar att besöka.
  while (pagesToVisit.length > 0) {

    // Tar nästa sida från kön.
    const currentUrl = pagesToVisit.shift();

    // Hoppar över om URL saknas.
    if (!currentUrl) {
      continue;
    }

    // Hoppar över sidor som redan har besökts.
    if (visitedPages.has(currentUrl)) {
      continue;
    }

    // Markerar sidan som besökt.
    visitedPages.add(currentUrl);


    // =========================================================
    // ÖPPNA SIDAN
    // =========================================================

    let responseStatus = 0;
    let pageLoaded = false;

    // Försöker öppna sidan upp till tre gånger.
    for (let attempt = 1; attempt <= 3; attempt++) {

      try {

        // Försöker öppna sidan.
        const response = await page.goto(
          currentUrl,
          {
            waitUntil: "domcontentloaded",
            timeout: 30000,
          }
        );

        // Hämtar HTTP-status.
        responseStatus =
          response?.status() ?? 0;

        // Sidan kunde öppnas.
        pageLoaded = true;

        break;

      } catch {

        // Visar att försöket misslyckades.
        console.log(
          `⚠ Kunde inte öppna ${currentUrl} - försök ${attempt}/3`
        );

        // Väntar lite innan nästa försök.
        if (attempt < 3) {
          await page.waitForTimeout(1000);
        }
      }
    }


    // =========================================================
    // SPARA RESULTAT
    // =========================================================

    // Sparar resultatet för den aktuella sidan.
    pageResults.push({
      url: currentUrl,
      status: responseStatus,
      working:
        pageLoaded &&
        responseStatus >= 200 &&
        responseStatus < 400,
    });


    // =========================================================
    // LOGGA RESULTAT
    // =========================================================

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


    // =========================================================
    // HÄMTA NYA LÄNKAR
    // =========================================================

    // Om sidan inte kunde öppnas efter tre försök
    // finns det inga länkar att hämta från sidan.
    if (pageLoaded) {

      // Hämtar alla interna länkar från sidan.
      const links =
        await page.locator("a[href]").evaluateAll(
          (elements, origin) =>
            elements
              .map((element) => {

                // Hämtar länken.
                const href = (
                  element as HTMLAnchorElement
                ).href;

                try {

                  // Gör om länken till en URL.
                  const linkUrl = new URL(href);

                  // Tar bort # från URL:en.
                  linkUrl.hash = "";

                  return linkUrl.toString();

                } catch {

                  // Hoppar över URL:er som inte kan läsas.
                  return null;
                }
              })

              // Behåller bara giltiga URL:er.
              .filter(
                (href): href is string =>
                  href !== null
              )

              // Behåller bara länkar från samma webbplats.
              .filter(
                (href) =>
                  href.startsWith(origin)
              ),

          // Skickar med webbplatsens domän.
          origin
        );


      // Normaliserar URL:er.
      const normalizedLinks =
        links.map((link) =>
          normalizeUrl(link)
        );


      // Tar bort duplicerade länkar.
      const uniqueLinks = [
        ...new Set(normalizedLinks),
      ];


      // Lägger till nya sidor i kön.
      for (const link of uniqueLinks) {

        // Lägg bara till sidan om den inte redan
        // har besökts eller ligger i kön.
        if (
          !visitedPages.has(link) &&
          !pagesToVisit.includes(link)
        ) {

          pagesToVisit.push(link);
        }
      }
    }


    // =========================================================
    // RIKTIG PROGRESS
    // =========================================================

    // Antalet sidor som faktiskt har analyserats.
    const current =
      pageResults.length;

    // Antalet sidor som crawlern hittills känner till.
    const discovered =
      visitedPages.size +
      pagesToVisit.length;

    // Skickar riktig progress vidare.
    //
    // Vi använder INGEN timer och INGEN slumpmässig
    // procent. Informationen kommer direkt från crawlern.
    onProgress?.({
      current,
      discovered,
      message:
        `${current} av ${discovered} sidor analyserade`,
    });


    // Visar även progress i terminalen.
    console.log(
      `Crawling progress: ${current}/${discovered}`
    );
  }


  // =========================================================
  // CRAWLING KLAR
  // =========================================================

  // När kön är tom vet vi att crawlern har hittat
  // och analyserat alla sidor den kan nå.
  const totalPages =
    pageResults.length;


  // Skickar 100 % för själva crawling-fasen.
  onProgress?.({
    current: totalPages,
    discovered: totalPages,
    message:
      `${totalPages} av ${totalPages} sidor analyserade`,
  });


  // =========================================================
  // HÄMTA STARTSIDANS TITEL
  // =========================================================

  // Öppnar startsidan igen för att hämta dess titel.
  await page.goto(url);

  // Hämtar sidans titel.
  const title = await page.title();


  // =========================================================
  // PAGE SUMMARY
  // =========================================================

  // Räknar fungerande sidor.
  const passedPages =
    pageResults.filter(
      (result) => result.working
    ).length;


  // Räknar sidor som inte fungerar.
  const failedPages =
    pageResults.filter(
      (result) => !result.working
    ).length;


  // Visar alla hittade sidor.
  console.log("\nPages found:");

  pageResults.forEach((result) => {
    console.log("-", result.url);
  });


  // Visar sammanfattning.
  console.log("\nPage summary:");

  console.log(
    `Pages: ${passedPages} passed, ${failedPages} failed`
  );


  // =========================================================
  // RETURNERA RESULTAT
  // =========================================================

  // Returnerar resultatet till QA-systemet.
  return {
    url,
    status:
      pageResults[0]?.status ?? 0,
    title,

    // Lista över alla hittade URL:er.
    links:
      pageResults.map(
        (result) => result.url
      ),

    // Fullständiga resultat för varje sida.
    pages: pageResults,

    // Antal fungerande sidor.
    passedPages,

    // Antal sidor som inte fungerar.
    failedPages,
  };
}