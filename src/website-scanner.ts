import { Page } from "@playwright/test";
import { checkCTA } from "./checks/cta";
import { checkPages } from "./checks/pages";
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

// Startar en komplett QA-skanning av webbplatsen
export async function scanWebsite(
  page: Page,
  url: string
) {

  console.log("\n=================================");
  console.log("       WEBSITE QA SYSTEM");
  console.log("=================================");
  console.log(`\nStartar skanning av: ${url}`);

  // Här sparar vi resultaten från alla kontroller
  const results: QACheckResult[] = [];

  // 1. Kontrollerar webbplatsens sidor
  console.log("\n--- SIDOR ---");

  const pageResult = await checkPages(
    page,
    url
  );

  // Hämtar sidorna som hittades
  const pages = pageResult.links;

  // Kontrollerar resultatet för sidorna
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

  // 2. Kontrollerar SEO
  console.log("\n--- SEO ---");

  const seoResult = await checkSEO(
    page,
    pages
  );

  if (seoResult.failed.length > 0) {

    results.push({
      name: "SEO",
      status: "FAIL",
      message:
        `${seoResult.failed.length} tekniska SEO-fel hittades`,
    });

  } else if (seoResult.warnings.length > 0) {

    results.push({
      name: "SEO",
      status: "WARNING",
      message:
        `${seoResult.warnings.length} SEO-varningar hittades`,
    });

  } else {

    results.push({
      name: "SEO",
      status: "PASS",
      message:
        `${seoResult.passed.length} SEO-kontroller godkända`,
    });
  }

  // 3. Kontrollerar webbplatsens prestanda
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

  // 4. Kontrollerar mobil och responsivitet
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

  // 5. Kontrollerar Cookie / GDPR-sidor
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

  // ==============================
  // HTTPS / SECURITY
  // ==============================

  const securityResult =
    await checkSecurity(url);

  results.push({
    name: "HTTPS / Security",
    status: securityResult.status,
    message: securityResult.message,
  });

  // ==============================
  // ALTERNATIVA DOMÄNER
  // ==============================

  const domainsResult =
    await checkDomains(url);

  results.push({
    name: "Alternativa domäner",
    status: domainsResult.status,
    message:
      `${domainsResult.passed} fungerar, ` +
      `${domainsResult.failed} fungerar inte`,
  });

  // ==============================
  // HÄMTAR FÖRETAGSNAMN
  // ==============================

  let companyName = "";

  try {

    await page.goto(url, {
      waitUntil: "domcontentloaded",
    });

    // Hämtar JSON-LD-data från sidan
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

          // Kontrollerar huvudobjektet
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

          // Kontrollerar även @graph
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
        // Ignorerar JSON-LD som inte går att läsa
      }
    }

  } catch {
    // Fortsätter med fallback nedan
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

  // ==============================
  // LIKNANDE DOMÄNER / FÖRETAGSNAMN
  // ==============================

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

  // 5.5. Kontrollerar stavning och grammatik
  console.log("\n--- TEXT / STAVNING ---");

  // Tar bort Google-recensioner från sidan innan texten kontrolleras.
  // Detta förhindrar att kundnamn och recensionstext räknas som stavfel.
  await page.evaluate(() => {
    const elements = Array.from(
      document.querySelectorAll("body *")
    );

    for (const element of elements) {
      const text = element.textContent?.trim() || "";

      // Hittar början av Google-recensionswidgeten.
      if (
        text.includes("Publicerat på Google") &&
        text.length < 5000
      ) {
        let parent = element.parentElement;

        // Letar efter ett större element som innehåller hela widgeten.
        for (let i = 0; i < 6 && parent; i++) {
          const parentText =
            parent.textContent?.trim() || "";

          if (
            parentText.includes("Publicerat på Google") &&
            parentText.length < 10000
          ) {
            parent.remove();
            break;
          }

          parent = parent.parentElement;
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

  // 6. Kontrollerar interna och externa länkar
  console.log("\n--- LÄNKAR ---");

  const linkResult = await checkLinks(
    page,
    url,
    pages
  );

  const totalLinkFailures =
    linkResult.internalFailed +
    linkResult.externalFailed;

  const totalLinks =
    linkResult.internalPassed +
    linkResult.internalFailed +
    linkResult.externalPassed +
    linkResult.externalFailed;

  if (totalLinkFailures === 0) {

    results.push({
      name: "Länkar",
      status: "PASS",
      message:
        `${totalLinks} länkar fungerar`,
    });

  } else {

    results.push({
      name: "Länkar",
      status: "FAIL",
      message:
        `${totalLinkFailures} länkar fungerar inte`,
    });
  }

  // 7. Kontrollerar bilder
  console.log("\n--- BILDER ---");

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

  // 8. Kontrollerar formulär
  console.log("\n--- FORMULÄR ---");

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

  // 9. Kontrollerar formulärvalidering
  console.log("\n--- VALIDERING ---");

  const validationResult = await checkValidation(
    page,
    pages
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

  // 10. Kontrollerar navigation
  console.log("\n--- NAVIGATION ---");

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

  // 11. Kontrollerar CTA-knappar och länkar
  console.log("\n--- CTA ---");

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

  // 12. Kontrollerar sociala medier
  console.log("\n--- SOCIALA MEDIER ---");

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

  // 13. Kontrollerar Google Maps
  console.log("\n--- GOOGLE MAPS ---");

  const googleMapsResult =
    await checkGoogleMaps(
      page,
      pages
    );

  if (googleMapsResult.found.length > 0) {

    results.push({
      name: "Google Maps",
      status: "PASS",
      message:
        `${googleMapsResult.found.length} Google Maps-länkar hittades`,
    });

  } else {

    results.push({
      name: "Google Maps",
      status: "WARNING",
      message:
        "Ingen Google Maps-länk hittades",
    });
  }

  // 14. Kontrollerar Google Business Profile
  console.log("\n--- GOOGLE BUSINESS PROFILE ---");

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

  // Analyserar alla QA-resultat med den lokala AI-modellen.
  console.log("\n--- AI-ANALYS ---");

  const aiAnalysis =
    await analyzeQAResults(results);

  // Skriver ut AI:ns analys.
  console.log(aiAnalysis);

  // Skriver ut den färdiga QA-rapporten.
  printQAReport(
    url,
    results
  );

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