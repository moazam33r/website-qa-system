import { Page } from "@playwright/test";
import { checkCTA } from "./checks/cta";
import { checkPages, PageProgress } from "./checks/pages";
import { checkLinks } from "./checks/links";
import { checkSocialMedia } from "./checks/social-media";
import { checkImages } from "./checks/images";
import { checkForms } from "./checks/forms";
import { checkValidation } from "./checks/validation";
import { checkNavigation } from "./checks/navigation";
import { checkGoogleMaps } from "./checks/google-maps";
import { checkGoogleBusinessProfile } from "./checks/google-business-profile";
import { checkSEO } from "./checks/seo";
import { checkPerformance } from "./checks/performance";
import { checkResponsive } from "./checks/responsive";
import { checkCookieGdpr } from "./checks/cookie-gdpr";
import { checkSecurity } from "./checks/security";
import { checkDomains } from "./checks/domains";
import { searchSimilarDomains } from "./checks/similar-domains";
import { checkText } from "./checks/text-check";
import { analyzeQAResults } from "./ai/qa-analyzer";

import {
  printQAReport,
  QACheckResult,
} from "./report/qa-report";

// =========================================================
// PROGRESS-TYP
// =========================================================

// Callback som används för att skicka aktuell progress
// tillbaka till servern och sedan vidare till popupen.
export type ScanProgressCallback = (
  percentage: number,
  message: string
) => void;


// =========================================================
// WEBSITE QA SYSTEM
// =========================================================

// Startar en komplett QA-skanning av webbplatsen.
export async function scanWebsite(
  page: Page,
  url: string,
  onProgress?: ScanProgressCallback
) {

  console.log("\n=================================");
  console.log("       WEBSITE QA SYSTEM");
  console.log("=================================");
  console.log(`\nStartar skanning av: ${url}`);


  // =======================================================
  // RESULTAT
  // =======================================================

  // Här sparar vi resultaten från alla kontroller.
  const results: QACheckResult[] = [];


  // =======================================================
  // PROGRESS
  // =======================================================

  // Sparar senast skickade procent.
  //
  // Detta är viktigt eftersom crawlern kan upptäcka nya
  // sidor under tiden. Vi vill aldrig att progressbaren
  // går bakåt från exempelvis 20 % till 15 %.
  let lastProgress = 0;

  // Skickar progress till servern.
  const reportProgress = (
    percentage: number,
    message: string
  ) => {

    // Säkerställer att värdet alltid ligger mellan 0 och 100.
    const safePercentage = Math.max(
      0,
      Math.min(100, Math.round(percentage))
    );

    // Progress får aldrig gå bakåt.
    const finalPercentage = Math.max(
      lastProgress,
      safePercentage
    );

    // Sparar senaste värdet.
    lastProgress = finalPercentage;

    // Skickar progress till servern.
    onProgress?.(
      finalPercentage,
      message
    );
  };


  // =======================================================
  // START
  // =======================================================

  reportProgress(
    0,
    "Förbereder QA-skanning..."
  );


  // =======================================================
  // 1. SIDOR / CRAWLING
  // =======================================================

  console.log("\n--- SIDOR ---");

  // Crawlern skickar information varje gång en sida
  // har analyserats.
  //
  // Vi använder inte en timer här.
  // Progressen kommer direkt från det faktiska arbetet
  // som crawlern utför.
  const pageResult = await checkPages(
    page,
    url,
    (progress: PageProgress) => {

      // Om inga sidor har upptäckts ännu visar vi 0 %.
      if (progress.current === 0) {

        reportProgress(
          0,
          progress.message
        );

        return;
      }

      // Antalet upptäckta sidor används som aktuell
      // arbetsmängd för crawlern.
      const discovered = Math.max(
        progress.discovered,
        progress.current,
        1
      );

      // Crawlern använder första delen av den totala
      // progressen.
      //
      // Eftersom nya sidor kan upptäckas under crawling
      // låter vi aldrig värdet gå bakåt.
      const crawlerPercentage =
        Math.round(
          (progress.current / discovered) * 30
        );

      reportProgress(
        crawlerPercentage,
        progress.message
      );
    }
  );


  // Hämtar sidorna som hittades.
  const pages = pageResult.links;


  // Kontrollerar resultatet för sidorna.
  if (
    pageResult.status >= 200 &&
    pageResult.status < 400 &&
    pageResult.failedPages === 0
  ) {

    results.push({
      name: "Sidor",
      status: "PASS",
      message:
        `${pageResult.passedPages}/${pageResult.pages.length} sidor fungerar`,
    });

  } else {

    results.push({
      name: "Sidor",
      status: "FAIL",
      message:
        `${pageResult.failedPages} sidor fungerar inte`,
    });
  }


  // Crawlingen är nu faktiskt färdig.
  reportProgress(
    30,
    `${pageResult.pages.length} sidor hittades. Fortsätter QA-analysen...`
  );


  // =======================================================
  // 2. SEO
  // =======================================================

  console.log("\n--- SEO ---");

  reportProgress(
    32,
    "Analyserar SEO..."
  );

  const seoResult = await checkSEO(
    page,
    pages
  );

  if (seoResult.failed.length > 0) {

    // Tar med både antal och detaljerade SEO-fel.
    const seoDetails =
      seoResult.failed
        .map((error) => `- ${error}`)
        .join("\n");

    results.push({
      name: "SEO",
      status: "FAIL",
      message:
        `${seoResult.failed.length} tekniska SEO-fel hittades\n` +
        seoDetails,
    });

  } else if (seoResult.warnings.length > 0) {

    // Tar med både antal och detaljerade SEO-varningar.
    // Detta gör att AI:n kan se exakt vilka sidor som har problem.
    const seoDetails =
      seoResult.warnings
        .map((warning) => `- ${warning}`)
        .join("\n");

    results.push({
      name: "SEO",
      status: "WARNING",
      message:
        `${seoResult.warnings.length} SEO-varningar hittades\n` +
        seoDetails,
    });

  } else {

    // Om inga problem finns visas det vanliga PASS-resultatet.
    results.push({
      name: "SEO",
      status: "PASS",
      message:
        `${seoResult.passed.length} SEO-kontroller godkända`,
    });
  }


  // =======================================================
  // 3. PRESTANDA
  // =======================================================

  reportProgress(
    35,
    "Analyserar webbplatsens prestanda..."
  );

  // Kontrollerar webbplatsens prestanda.
  const performanceResult =
    await checkPerformance(url);

  if (performanceResult.desktop !== null) {

    results.push({
      name: "Prestanda",
      status: performanceResult.status,
      message:
        `Desktop: ${performanceResult.desktop.score}/100 | ` +
        `Mobile: ${performanceResult.mobile?.score ?? "N/A"}/100`,
    });

  } else {

    results.push({
      name: "Prestanda",
      status: "WARNING",
      message:
        "PageSpeed-kontrollen kunde inte genomföras",
    });
  }


  // =======================================================
  // 4. RESPONSIVITET
  // =======================================================

  reportProgress(
    38,
    "Kontrollerar mobil och responsivitet..."
  );

  const responsiveResult =
    await checkResponsive(
      page,
      pages
    );

  if (responsiveResult.failed === 0) {

    results.push({
      name: "Responsivitet",
      status: "PASS",
      message:
        `${responsiveResult.passed} sidor fungerar i mobilvy`,
    });

  } else {

    results.push({
      name: "Responsivitet",
      status: "FAIL",
      message:
        `${responsiveResult.failed} sidor har problem i mobilvy`,
    });
  }


  // =======================================================
  // 5. COOKIE / GDPR
  // =======================================================

  reportProgress(
    41,
    "Kontrollerar Cookie / GDPR..."
  );

  // Kontrollerar Cookie / GDPR-sidor.
  const cookieGdprResult =
    await checkCookieGdpr(
      page,
      pages
    );

  if (cookieGdprResult.found > 0) {

    results.push({
      name: "Cookie / GDPR",
      status: "PASS",
      message:
        `${cookieGdprResult.found} relevanta sidor hittades`,
    });

  } else {

    results.push({
      name: "Cookie / GDPR",
      status: "WARNING",
      message:
        "Ingen Cookie- eller Integritetspolicy hittades",
    });
  }


  // =======================================================
  // 6. HTTPS / SECURITY
  // =======================================================

  reportProgress(
    44,
    "Kontrollerar HTTPS och säkerhet..."
  );

  const securityResult =
    await checkSecurity(url);

  results.push({
    name: "HTTPS / Security",
    status: securityResult.status,
    message: securityResult.message,
  });


  // =======================================================
  // 7. ALTERNATIVA DOMÄNER
  // =======================================================

  reportProgress(
    47,
    "Kontrollerar alternativa domäner..."
  );

  const domainsResult =
    await checkDomains(url);

  results.push({
    name: "Alternativa domäner",
    status: domainsResult.status,
    message:
      `${domainsResult.passed} fungerar, ` +
      `${domainsResult.failed} fungerar inte`,
  });


  // =======================================================
  // 8. HÄMTAR FÖRETAGSNAMN
  // =======================================================

  reportProgress(
    49,
    "Analyserar företagsinformation..."
  );

  let companyName = "";

  try {

    await page.goto(url, {
      waitUntil: "domcontentloaded",
    });

    // Hämtar JSON-LD-data från sidan.
    const jsonLdScripts = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();

    for (const scriptText of jsonLdScripts) {

      try {

        const data = JSON.parse(scriptText);

        const objects = Array.isArray(data)
          ? data
          : [data];

        for (const object of objects) {

          // Kontrollerar huvudobjektet.
          if (
            object &&
            typeof object === "object" &&
            typeof object.name === "string"
          ) {

            const type =
              object["@type"];

            console.log(
              "JSON-LD:",
              type,
              object.name
            );

            if (
              type === "Organization" ||
              type === "LocalBusiness" ||
              type === "Corporation" ||
              type === "ProfessionalService"
            ) {

              companyName =
                object.name.trim();

              break;
            }
          }

          // Kontrollerar även @graph.
          if (
            object &&
            typeof object === "object" &&
            Array.isArray(object["@graph"])
          ) {

            for (
              const graphObject
              of object["@graph"]
            ) {

              if (
                graphObject &&
                typeof graphObject === "object" &&
                typeof graphObject.name === "string"
              ) {

                const type =
                  graphObject["@type"];

                console.log(
                  "JSON-LD GRAPH:",
                  type,
                  graphObject.name
                );

                if (
                  type === "Organization" ||
                  type === "LocalBusiness" ||
                  type === "Corporation" ||
                  type === "ProfessionalService"
                ) {

                  companyName =
                    graphObject.name.trim();

                  break;
                }
              }
            }
          }

          if (companyName) {
            break;
          }
        }

        if (companyName) {
          break;
        }

      } catch {
        // Ignorerar JSON-LD som inte går att läsa.
      }
    }

  } catch {
    // Fortsätter med fallback nedan.
  }


  // Om JSON-LD inte gav något företagsnamn
  // används sidtiteln som reservlösning.
  if (!companyName) {

    companyName =
      pageResult.title
        ? pageResult.title
            .split("|")
            .pop()
            ?.trim() || ""
        : "";
  }

  console.log(
    `\nFöretagsnamn för liknande domäner: ${
      companyName || "kunde inte hittas"
    }`
  );


  // =======================================================
  // 9. LIKNANDE DOMÄNER / FÖRETAGSNAMN
  // =======================================================

  reportProgress(
    51,
    "Kontrollerar liknande domäner..."
  );

  if (companyName) {

    const similarDomainsResult =
      await searchSimilarDomains(
        url,
        companyName
      );

    if (similarDomainsResult.found > 0) {

      results.push({
        name: "Liknande domäner",
        status: "WARNING",
        message:
          `${similarDomainsResult.found} möjliga liknande domäner hittades`,
      });

    } else {

      results.push({
        name: "Liknande domäner",
        status: "PASS",
        message:
          "Inga andra domäner hittades",
      });
    }

  } else {

    results.push({
      name: "Liknande domäner",
      status: "WARNING",
      message:
        "Företagsnamn kunde inte hittas",
    });

    console.log(
      "\n⚠ Kunde inte hitta ett företagsnamn för kontroll av liknande domäner."
    );
  }


  // =======================================================
  // 10. TEXT / STAVNING
  // =======================================================

  console.log("\n--- TEXT / STAVNING ---");

  reportProgress(
    54,
    "Kontrollerar text och stavning..."
  );

  // Tar bort Google-recensioner från sidan innan texten kontrolleras.
  // Detta förhindrar att kundnamn och recensionstext räknas som stavfel.
  await page.evaluate(() => {

    const elements = Array.from(
      document.querySelectorAll("body *")
    );

    for (const element of elements) {

      const text =
        element.textContent?.trim() || "";

      // Hittar början av Google-recensionswidgeten.
      if (
        text.includes("Publicerat på Google") &&
        text.length < 5000
      ) {

        let parent =
          element.parentElement;

        // Letar efter ett större element som innehåller hela widgeten.
        for (
          let i = 0;
          i < 6 && parent;
          i++
        ) {

          const parentText =
            parent.textContent?.trim() || "";

          if (
            parentText.includes("Publicerat på Google") &&
            parentText.length < 10000
          ) {

            parent.remove();

            break;
          }

          parent =
            parent.parentElement;
        }
      }
    }
  });

  // Hämtar synlig text från resten av sidan.
  const pageText =
    await page.locator("body").innerText();

  // Skickar texten till LanguageTool.
  const textCheckResult =
    await checkText(pageText);

  // Lägger till resultatet i QA-rapporten.
  results.push({
    name: "Text / stavning",
    status: textCheckResult.status,
    message:
      textCheckResult.errors > 0
        ? `${textCheckResult.errors} möjliga textfel hittades`
        : "Inga stavnings- eller grammatikfel hittades",
  });


  // =======================================================
  // 11. LÄNKAR
  // =======================================================

  console.log("\n--- LÄNKAR ---");

  reportProgress(
    57,
    "Kontrollerar interna och externa länkar..."
  );

  const linkResult = await checkLinks(
    page,
    url,
    pages
  );

  // Räknar både trasiga länkar och länkar som verkar
// leda till fel typ av sida.
const totalLinkFailures =
  linkResult.internalFailed +
  linkResult.externalFailed;

const totalIntentFailures =
  linkResult.intentFailed;

const totalLinks =
  linkResult.internalPassed +
  linkResult.internalFailed +
  linkResult.externalPassed +
  linkResult.externalFailed;


// Om det finns trasiga länkar är resultatet FAIL.
if (totalLinkFailures > 0) {

  results.push({
    name: "Länkar",
    status: "FAIL",
    message:
      `${totalLinkFailures} länkar fungerar inte`,
  });


// Om själva länkarna fungerar men någon länk
// verkar leda till fel sida får vi WARNING.
} else if (totalIntentFailures > 0) {

  // Skapar detaljer för AI:n och PDF-rapporten.
  const intentDetails =
    linkResult.intentFailures
      .map(
        (failure) =>
          `"${failure.linkText}" → ${failure.expected} ` +
          `(faktisk destination: ${failure.targetUrl})`
      )
      .join("\n");

  results.push({
    name: "Länkar",
    status: "WARNING",
    message:
      `${totalLinks} länkar fungerar, men ` +
      `${totalIntentFailures} länkar verkar leda till fel sida.\n` +
      intentDetails,
  });


// Om både länkar och destinationer ser rätt ut
// blir resultatet PASS.
} else {

  results.push({
    name: "Länkar",
    status: "PASS",
    message:
      `${totalLinks} länkar fungerar och ` +
      `inga tydliga felaktiga destinationer hittades`,
  });
}


  // =======================================================
  // 12. BILDER
  // =======================================================

  console.log("\n--- BILDER ---");

  reportProgress(
    60,
    "Kontrollerar bilder..."
  );

  const imageResult = await checkImages(
    page,
    pages
  );

  if (imageResult.failed === 0) {

    results.push({
      name: "Bilder",
      status: "PASS",
      message:
        `${imageResult.passed} bilder fungerar`,
    });

  } else {

    results.push({
      name: "Bilder",
      status: "FAIL",
      message:
        `${imageResult.failed} bilder fungerar inte`,
    });
  }


  // =======================================================
  // 13. FORMULÄR
  // =======================================================

  console.log("\n--- FORMULÄR ---");

  reportProgress(
    63,
    "Kontrollerar formulär..."
  );

  const formResult = await checkForms(
    page,
    pages
  );

  results.push({
    name: "Formulär",
    status: "PASS",
    message:
      `${formResult.formCount} formulär, ` +
      `${formResult.fieldCount} fält, ` +
      `${formResult.requiredCount} obligatoriska fält`,
  });


  // =======================================================
  // 14. FORMULÄRVALIDERING
  // =======================================================

  console.log("\n--- VALIDERING ---");

  reportProgress(
    65,
    "Kontrollerar formulärvalidering..."
  );

  // Kontrollerar formulärvalidering och skickar progress vidare.
  const validationResult = await checkValidation(
    page,
    pages,
    (percentage, message) => {

      // Validation skickar progress mellan 0 och 100.
      //
      // Vi mappar den till området 65–72 % av den
      // övergripande QA-processen.
      const mappedPercentage =
        65 +
        Math.round(
          (percentage / 100) * 7
        );

      // Skickar den mappade progressen till servern.
      reportProgress(
        mappedPercentage,
        message
      );
    }
  );

  if (validationResult.emailFailed > 0) {

    results.push({
      name: "Validering",
      status: "FAIL",
      message:
        `${validationResult.emailFailed} e-postfält accepterar ogiltig e-post`,
    });

  } else if (validationResult.phoneFailed > 0) {

    results.push({
      name: "Validering",
      status: "WARNING",
      message:
        `${validationResult.phoneFailed} telefonfält saknar client-side validering`,
    });

  } else {

    results.push({
      name: "Validering",
      status: "PASS",
      message:
        "Formulärvalidering fungerar",
    });
  }


  // =======================================================
  // 15. NAVIGATION
  // =======================================================

  console.log("\n--- NAVIGATION ---");

  reportProgress(
    73,
    "Kontrollerar navigation..."
  );

  const navigationResult = await checkNavigation(
    page,
    url,
    pages
  );

  if (navigationResult.failed === 0) {

    results.push({
      name: "Navigation",
      status: "PASS",
      message:
        `${navigationResult.passed} interna navigationer fungerar`,
    });

  } else {

    results.push({
      name: "Navigation",
      status: "FAIL",
      message:
        `${navigationResult.failed} interna navigationer fungerar inte`,
    });
  }


  // =======================================================
  // 16. CTA
  // =======================================================

  console.log("\n--- CTA ---");

  reportProgress(
    76,
    "Kontrollerar CTA-knappar och länkar..."
  );

  const ctaResult = await checkCTA(
    page,
    pages
  );

  if (ctaResult.failed === 0) {

    results.push({
      name: "CTA",
      status: "PASS",
      message:
        `${ctaResult.passed} CTA-länkar fungerar`,
    });

  } else {

    results.push({
      name: "CTA",
      status: "FAIL",
      message:
        `${ctaResult.failed} CTA-länkar fungerar inte`,
    });
  }


  // =======================================================
  // 17. SOCIALA MEDIER
  // =======================================================

  console.log("\n--- SOCIALA MEDIER ---");

  reportProgress(
    79,
    "Kontrollerar sociala medier..."
  );

  const socialMediaResult =
    await checkSocialMedia(
      page,
      pages,
      url
    );

  if (socialMediaResult.failed.length > 0) {

    results.push({
      name: "Sociala medier",
      status: "FAIL",
      message:
        `${socialMediaResult.failed.length} sociala medier verkar inte tillhöra företaget`,
    });

  } else {

    results.push({
      name: "Sociala medier",
      status: "PASS",
      message:
        `${socialMediaResult.found.length} sociala medier hittades och matchar webbplatsen`,
    });
  }


  // =======================================================
  // 18. GOOGLE MAPS
  // =======================================================

  console.log("\n--- GOOGLE MAPS ---");

  reportProgress(
    82,
    "Kontrollerar Google Maps..."
  );

  const googleMapsResult =
    await checkGoogleMaps(
      page,
      pages
    );

  if (googleMapsResult.found.length > 0) {

    results.push({
      name: "Google Maps",
      status: "PASS",

      // Visar hur många Google Maps-förekomster som hittades.
      // Resultatet kan vara en länk eller en inbäddad karta.
      message:
        `${googleMapsResult.found.length} Google Maps-förekomster hittades`,
    });

  } else {

    results.push({
      name: "Google Maps",
      status: "WARNING",

      // Visar tydligt att ingen Google Maps-förekomst hittades.
      message:
        "Ingen Google Maps-förekomst hittades",
    });
  }


  // =======================================================
  // 19. GOOGLE BUSINESS PROFILE
  // =======================================================

  console.log("\n--- GOOGLE BUSINESS PROFILE ---");

  reportProgress(
    85,
    "Kontrollerar Google Business Profile..."
  );

  const googleBusinessProfileResult =
    await checkGoogleBusinessProfile(
      page,
      pages
    );

  if (
    googleBusinessProfileResult.failed.length > 0
  ) {

    results.push({
      name: "Google Business Profile",
      status: "FAIL",
      message:
        `${googleBusinessProfileResult.failed.length} Google-profiler kunde inte bekräftas`,
    });

  } else if (
    googleBusinessProfileResult.found.length > 0
  ) {

    results.push({
      name: "Google Business Profile",
      status: "PASS",
      message:
        `${googleBusinessProfileResult.found.length} Google-profiler hittades och matchar företaget`,
    });

  } else if (
    googleBusinessProfileResult.mapsMatches.length > 0
  ) {

    results.push({
      name: "Google Business Profile",
      status: "PASS",
      message:
        "Google Business Profile matchar företaget via Google Maps",
    });

  } else {

    results.push({
      name: "Google Business Profile",
      status: "WARNING",
      message:
        "Ingen direkt Google Business Profile-länk kunde verifieras",
    });
  }


  // =======================================================
  // 20. AI-ANALYS
  // =======================================================

  // Analyserar alla QA-resultat med den lokala AI-modellen.
  // Om AI:n inte fungerar ska den vanliga QA-rapporten ändå visas.
  console.log("\n--- AI-ANALYS ---");

  reportProgress(
    88,
    "Analyserar QA-resultatet med AI..."
  );

  let aiAnalysis =
    "AI-analys kunde inte genomföras.";

  try {

    // Försöker analysera QA-resultaten med Ollama.
    aiAnalysis =
      await analyzeQAResults(results);

    // Visar AI:ns analys om den lyckades.
    console.log(aiAnalysis);

  } catch (error) {

    // AI-fel ska inte stoppa resten av QA-systemet.
    console.log(
      "⚠ AI-analysen kunde inte genomföras."
    );

    // Lägger till en WARNING i QA-rapporten.
    results.push({
      name: "AI-analys",
      status: "WARNING",
      message:
        "AI-analysen kunde inte genomföras",
    });
  }


  // =======================================================
  // 21. QA-RAPPORT
  // =======================================================

  reportProgress(
    94,
    "Sammanställer QA-rapport..."
  );

  // Skriver alltid ut den färdiga QA-rapporten,
  // även om AI-analysen misslyckades.
  printQAReport(
    url,
    results
  );


  // =======================================================
  // KLAR
  // =======================================================

  reportProgress(
    100,
    "QA-analysen är klar."
  );


  // =======================================================
  // RETURNERA RESULTAT
  // =======================================================

  // Returnerar grundläggande information samt AI-analysen.
  return {
    url: pageResult.url,
    status: pageResult.status,
    title: pageResult.title,
    links: pageResult.links,
    pages: pageResult.pages,
    results,
    aiAnalysis,
  };
}