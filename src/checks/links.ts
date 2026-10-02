import { Page } from "@playwright/test";

// =========================================================
// TYPER
// =========================================================

// Resultat för en länk som leder till en sida som verkar
// vara fel i förhållande till länkens text.
export interface LinkIntentFailure {
  sourcePage: string;
  linkText: string;
  expected: string;
  targetUrl: string;
  targetTitle: string;
  targetHeading: string;
}

// =========================================================
// HJÄLPFUNKTIONER
// =========================================================

// Normaliserar text så att jämförelser blir enklare.
//
// Exempel:
// "Begär   Offert!" -> "begar offert"
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9åäö\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}


// =========================================================
// IDENTIFIERA LÄNKENS SYFTE
// =========================================================

// Försöker förstå vad användaren förväntar sig att en länk
// ska leda till baserat på länktexten.
//
// Vi kontrollerar inte alla vanliga textlänkar.
// Vi fokuserar på tydliga länkar där destinationen har
// ett tydligt förväntat syfte.
function detectLinkIntent(text: string): string | null {

  const normalized = normalizeText(text);

  // -------------------------------------------------------
  // OFFERT
  // -------------------------------------------------------

  if (
    normalized.includes("begar offert") ||
    normalized.includes("begar en offert") ||
    normalized.includes("offertforfragan") ||
    normalized.includes("offert") ||
    normalized.includes("fa offert") ||
    normalized.includes("kostnadsfri offert") ||
    normalized.includes("gratis offert")
  ) {
    return "offert";
  }


  // -------------------------------------------------------
  // KONTAKT
  // -------------------------------------------------------

  if (
    normalized === "kontakt" ||
    normalized.includes("kontakta oss") ||
    normalized.includes("kontakt oss") ||
    normalized.includes("kontakta foretaget") ||
    normalized.includes("hor av dig") ||
    normalized.includes("ta kontakt")
  ) {
    return "kontakt";
  }


  // -------------------------------------------------------
  // OM OSS
  // -------------------------------------------------------

  if (
    normalized === "om oss" ||
    normalized.includes("las mer om oss") ||
    normalized.includes("mer om oss") ||
    normalized.includes("om foretaget") ||
    normalized.includes("vilka ar vi")
  ) {
    return "om-oss";
  }


  // -------------------------------------------------------
  // TJÄNSTER
  // -------------------------------------------------------

  if (
    normalized === "tjanster" ||
    normalized === "vara tjanster" ||
    normalized.includes("vara tjanster") ||
    normalized.includes("vad vi erbjuder") ||
    normalized.includes("vara losningar")
  ) {
    return "tjanster";
  }


  // -------------------------------------------------------
  // REFERENSER / PROJEKT
  // -------------------------------------------------------

  if (
    normalized === "referenser" ||
    normalized === "vara referenser" ||
    normalized === "projekt" ||
    normalized === "vara projekt" ||
    normalized.includes("tidigare projekt")
  ) {
    return "referenser";
  }


  // -------------------------------------------------------
  // HITTADES INGET TYDLIGT SYFTE
  // -------------------------------------------------------

  return null;
}


// =========================================================
// KONTROLLERA OM DESTINATIONEN MATCHAR SYFTET
// =========================================================

// Kontrollerar URL, title, H1 och en begränsad mängd synlig
// text från destinationssidan.
//
// Vi använder flera signaler eftersom en sida exempelvis kan
// heta "/kontakt" men samtidigt vara en offert-/kontaktsida.
function destinationMatchesIntent(
  intent: string,
  targetUrl: string,
  targetTitle: string,
  targetHeading: string,
  targetText: string
): boolean {

  const urlText =
    normalizeText(
      new URL(targetUrl).pathname
    );

  const titleText =
    normalizeText(targetTitle);

  const headingText =
    normalizeText(targetHeading);

  const bodyText =
    normalizeText(targetText.slice(0, 5000));


  // -------------------------------------------------------
  // OFFERT
  // -------------------------------------------------------

  if (intent === "offert") {

    const keywords = [
      "offert",
      "begar offert",
      "offertforfragan",
      "offertformular",
      "fa offert",
      "kostnadsfri offert",
      "prisforfragan",
    ];

    return keywords.some(
      (keyword) =>
        urlText.includes(keyword) ||
        titleText.includes(keyword) ||
        headingText.includes(keyword) ||
        bodyText.includes(keyword)
    );
  }


  // -------------------------------------------------------
  // KONTAKT
  // -------------------------------------------------------

  if (intent === "kontakt") {

    const keywords = [
      "kontakt",
      "kontakta oss",
      "kontaktformular",
      "hor av dig",
    ];

    return keywords.some(
      (keyword) =>
        urlText.includes(keyword) ||
        titleText.includes(keyword) ||
        headingText.includes(keyword) ||
        bodyText.includes(keyword)
    );
  }


  // -------------------------------------------------------
  // OM OSS
  // -------------------------------------------------------

  if (intent === "om-oss") {

    const keywords = [
      "om oss",
      "om foretaget",
      "om-oss",
      "vilka ar vi",
    ];

    return keywords.some(
      (keyword) =>
        urlText.includes(keyword) ||
        titleText.includes(keyword) ||
        headingText.includes(keyword) ||
        bodyText.includes(keyword)
    );
  }


  // -------------------------------------------------------
  // TJÄNSTER
  // -------------------------------------------------------

  if (intent === "tjanster") {

    const keywords = [
      "tjanster",
      "vara tjanster",
      "vara losningar",
      "tjanst",
    ];

    return keywords.some(
      (keyword) =>
        urlText.includes(keyword) ||
        titleText.includes(keyword) ||
        headingText.includes(keyword) ||
        bodyText.includes(keyword)
    );
  }


  // -------------------------------------------------------
  // REFERENSER
  // -------------------------------------------------------

  if (intent === "referenser") {

    const keywords = [
      "referenser",
      "projekt",
      "vara projekt",
      "tidigare projekt",
      "case",
    ];

    return keywords.some(
      (keyword) =>
        urlText.includes(keyword) ||
        titleText.includes(keyword) ||
        headingText.includes(keyword) ||
        bodyText.includes(keyword)
    );
  }


  return true;
}


// =========================================================
// HUVUDFUNKTION
// =========================================================

// Kontrollerar interna och externa länkar på webbplatsen.
//
// Utöver HTTP-status kontrolleras även om tydliga länkar
// verkar leda till rätt typ av sida.
export async function checkLinks(
  page: Page,
  url: string,
  pages: string[]
) {

  // Håller koll på länkar som redan har kontrollerats.
  const checkedLinks = new Set<string>();

  // Räknar interna länkar.
  let internalPassed = 0;
  let internalFailed = 0;

  // Räknar externa länkar.
  let externalPassed = 0;
  let externalFailed = 0;

  // Sparar länkar där destinationen inte verkar matcha
  // länkens avsedda syfte.
  const intentFailures: LinkIntentFailure[] = [];


  // Hämtar webbplatsens origin en gång.
  const siteOrigin = new URL(url).origin;


  // =======================================================
  // GÅ IGENOM ALLA SIDOR
  // =======================================================

  for (const pageUrl of pages) {

    // Öppnar sidan.
    await page.goto(pageUrl, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });


    // Hämtar alla länkar på sidan.
    //
    // Vi hämtar nu både:
    // - href
    // - synlig länktext
    //
    // Detta behövs för Link Intent Validation.
    const pageLinks =
      await page.locator("a[href]").evaluateAll(
        (elements) =>
          elements.map((element) => {

            const href =
              (element as HTMLAnchorElement).href;

            const text =
              (element.textContent || "").trim();

            const linkUrl =
              new URL(href);

            // Tar bort # från länken.
            linkUrl.hash = "";

            return {
              url: linkUrl.toString(),
              text,
            };
          })
      );


    // Tar bort duplicerade länkar.
    const uniquePageLinks = Array.from(
      new Map(
        pageLinks.map((link) => [
          `${link.url}|${link.text}`,
          link,
        ])
      ).values()
    );


    // =====================================================
    // KONTROLLERA VARJE LÄNK
    // =====================================================

    for (const linkData of uniquePageLinks) {

      const link = linkData.url;
      const linkText = linkData.text;


      // Hoppar över länkar som redan har testats.
      if (checkedLinks.has(link)) {
        continue;
      }

      checkedLinks.add(link);


      // Hoppar över e-postlänkar.
      if (link.startsWith("mailto:")) {
        continue;
      }


      // Hoppar över telefonlänkar.
      if (link.startsWith("tel:")) {
        continue;
      }


      // Hoppar över JavaScript-länkar.
      if (link.startsWith("javascript:")) {
        continue;
      }


      // Kontrollerar om länken är intern.
      const isInternalLink =
        link.startsWith(siteOrigin);


      // =====================================================
      // EXTERNA LÄNKAR
      // =====================================================

      if (!isInternalLink) {

        try {

          // Skickar request till den externa länken.
          const response =
            await page.request.get(link);

          // Hämtar HTTP-status.
          const status =
            response.status();


          if (
            status >= 200 &&
            status < 400
          ) {

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


      // =====================================================
      // INTERNA LÄNKAR
      // =====================================================

      try {

        // Skickar request till den interna länken.
        const response =
          await page.request.get(link);

        // Hämtar HTTP-status.
        const status =
          response.status();


        if (
          status >= 200 &&
          status < 400
        ) {

          internalPassed++;

          console.log(
            `✓ ${link} - ${status}`
          );


          // =================================================
          // LINK INTENT
          // =================================================

          // Försöker förstå vad länken förväntas leda till.
          const intent =
            detectLinkIntent(linkText);


          // Om länken inte har ett tydligt syfte hoppar
          // vi över intent-kontrollen.
          //
          // Exempel:
          // "Läs mer" är för generellt för att avgöra
          // vilken sida länken borde leda till.
          if (!intent) {
            continue;
          }


          try {

            // Hämtar HTML från destinationssidan.
            const html =
              await response.text();


            // ------------------------------------------------
            // Hämtar title
            // ------------------------------------------------

            const titleMatch =
              html.match(
                /<title[^>]*>([\s\S]*?)<\/title>/i
              );

            const targetTitle =
              titleMatch?.[1]
                ?.replace(/<[^>]+>/g, "")
                .trim() || "";


            // ------------------------------------------------
            // Hämtar första H1
            // ------------------------------------------------

            const headingMatch =
              html.match(
                /<h1[^>]*>([\s\S]*?)<\/h1>/i
              );

            const targetHeading =
              headingMatch?.[1]
                ?.replace(/<[^>]+>/g, "")
                .trim() || "";


            // ------------------------------------------------
            // Hämtar text
            // ------------------------------------------------

            const targetText =
              html
                .replace(
                  /<script[\s\S]*?<\/script>/gi,
                  " "
                )
                .replace(
                  /<style[\s\S]*?<\/style>/gi,
                  " "
                )
                .replace(
                  /<[^>]+>/g,
                  " "
                )
                .replace(
                  /\s+/g,
                  " "
                )
                .trim();


            // Kontrollerar om destinationen verkar motsvara
            // länkens syfte.
            const matches =
              destinationMatchesIntent(
                intent,
                link,
                targetTitle,
                targetHeading,
                targetText
              );


            if (!matches) {

              // Översätter intern intent till en text som
              // blir lättare att förstå i rapporten.
              const expectedLabels: Record<
                string,
                string
              > = {
                offert: "offert-/förfrågningssida",
                kontakt: "kontaktsida",
                "om-oss": "Om oss-sida",
                tjanster: "tjänstesida",
                referenser: "referens-/projektsida",
              };


              const expected =
                expectedLabels[intent] ||
                intent;


              // Sparar detaljer om problemet.
              intentFailures.push({
                sourcePage: pageUrl,
                linkText:
                  linkText || "(saknar länktext)",
                expected,
                targetUrl: link,
                targetTitle,
                targetHeading,
              });


              console.log(
                `✗ Link Intent - "${linkText}" ` +
                `verkar leda till fel sida: ${link}`
              );

            } else {

              console.log(
                `✓ Link Intent - "${linkText}" ` +
                `matchar destinationen`
              );
            }

          } catch {

            // Om HTML inte kan analyseras låter vi det vanliga
            // länktestet fortsätta vara PASS.
            //
            // Vi ska inte skapa FAIL bara för att
            // innehållsanalysen inte gick att genomföra.
            console.log(
              `⚠ Link Intent kunde inte analyseras: ${link}`
            );
          }


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


  // =======================================================
  // SAMMANFATTNING
  // =======================================================

  console.log("\nLink summary:");

  console.log(
    `Internal links: ${internalPassed} passed, ${internalFailed} failed`
  );

  console.log(
    `External links: ${externalPassed} passed, ${externalFailed} failed`
  );


  console.log("\nLink Intent summary:");

  if (intentFailures.length === 0) {

    console.log(
      "✓ Alla tydliga länkar verkar leda till rätt typ av sida."
    );

  } else {

    console.log(
      `✗ ${intentFailures.length} länkar verkar leda till fel sida.`
    );


    // Visar detaljer för varje problem.
    for (const failure of intentFailures) {

      console.log(
        `✗ "${failure.linkText}" på ${failure.sourcePage}`
      );

      console.log(
        `  Förväntat: ${failure.expected}`
      );

      console.log(
        `  Faktisk destination: ${failure.targetUrl}`
      );

      console.log(
        `  Title: ${failure.targetTitle || "saknas"}`
      );

      console.log(
        `  H1: ${failure.targetHeading || "saknas"}`
      );
    }
  }


  // Returnerar resultaten till QA-systemet.
  return {
    internalPassed,
    internalFailed,
    externalPassed,
    externalFailed,

    // Nya resultat för Link Intent.
    intentFailures,
    intentFailed: intentFailures.length,
  };
}