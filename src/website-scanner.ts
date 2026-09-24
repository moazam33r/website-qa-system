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

  // SEO-fel betyder att något tekniskt behöver åtgärdas
  if (seoResult.failed.length > 0) {

    results.push({
      name: "SEO",
      status: "FAIL",
      message:
        `${seoResult.failed.length} tekniska SEO-fel hittades`,
    });

  // SEO-varningar betyder att något bör förbättras
  } else if (seoResult.warnings.length > 0) {

    results.push({
      name: "SEO",
      status: "WARNING",
      message:
        `${seoResult.warnings.length} SEO-varningar hittades`,
    });

  // Om inga fel eller varningar hittades
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

  // Visar både Desktop och Mobile Performance
  if (performanceResult.desktop !== null) {

    results.push({
      name: "Prestanda",
      status: performanceResult.status,
      message:
        `Desktop: ${performanceResult.desktop.score}/100 | ` +
        `Mobile: ${performanceResult.mobile?.score ?? "N/A"}/100`,
    });

  } else {

    // Om PageSpeed inte kunde genomföras
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

  // Om inga sidor har horisontell scroll
  if (responsiveResult.failed === 0) {

    results.push({
      name: "Responsivitet",
      status: "PASS",
      message:
        `${responsiveResult.passed} sidor fungerar i mobilvy`,
    });

  } else {

    // Om någon sida har problem i mobilvy
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

  // Om en Cookie- eller Integritetspolicy hittades
  if (cookieGdprResult.found > 0) {

    results.push({
      name: "Cookie / GDPR",
      status: "PASS",
      message:
        `${cookieGdprResult.found} relevanta sidor hittades`,
    });

  } else {

    // Om ingen relevant sida hittades
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

  // 6. Kontrollerar interna och externa länkar
  console.log("\n--- LÄNKAR ---");

  const linkResult = await checkLinks(
    page,
    url,
    pages
  );

  // Räknar ihop alla trasiga länkar
  const totalLinkFailures =
    linkResult.internalFailed +
    linkResult.externalFailed;

  // Räknar ihop alla kontrollerade länkar
  const totalLinks =
    linkResult.internalPassed +
    linkResult.internalFailed +
    linkResult.externalPassed +
    linkResult.externalFailed;

  // Om alla länkar fungerar
  if (totalLinkFailures === 0) {

    results.push({
      name: "Länkar",
      status: "PASS",
      message:
        `${totalLinks} länkar fungerar`,
    });

  } else {

    // Om trasiga länkar hittades
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

  // Om alla bilder fungerar
  if (imageResult.failed === 0) {

    results.push({
      name: "Bilder",
      status: "PASS",
      message:
        `${imageResult.passed} bilder fungerar`,
    });

  } else {

    // Om trasiga bilder hittades
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

  // Visar antal formulär och formulärfält
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

  // Ogiltig e-post är ett fel
  if (validationResult.emailFailed > 0) {

    results.push({
      name: "Validering",
      status: "FAIL",
      message:
        `${validationResult.emailFailed} e-postfält accepterar ogiltig e-post`,
    });

  // Ogiltigt telefonnummer som accepteras ger en varning
  } else if (validationResult.phoneFailed > 0) {

    results.push({
      name: "Validering",
      status: "WARNING",
      message:
        `${validationResult.phoneFailed} telefonfält saknar client-side validering`,
    });

  // Om all formulärvalidering fungerar
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

  // Om alla interna navigationer fungerar
  if (navigationResult.failed === 0) {

    results.push({
      name: "Navigation",
      status: "PASS",
      message:
        `${navigationResult.passed} interna navigationer fungerar`,
    });

  } else {

    // Om interna navigationer inte fungerar
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

  // Om alla CTA-länkar fungerar
  if (ctaResult.failed === 0) {

    results.push({
      name: "CTA",
      status: "PASS",
      message:
        `${ctaResult.passed} CTA-länkar fungerar`,
    });

  } else {

    // Om CTA-länkar inte fungerar
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

  // Om sociala medier inte matchar företaget
  if (socialMediaResult.failed.length > 0) {

    results.push({
      name: "Sociala medier",
      status: "FAIL",
      message:
        `${socialMediaResult.failed.length} sociala medier verkar inte tillhöra företaget`,
    });

  } else {

    // Om sociala medier hittades och matchar
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

  // Om Google Maps-länkar hittades
  if (googleMapsResult.found.length > 0) {

    results.push({
      name: "Google Maps",
      status: "PASS",
      message:
        `${googleMapsResult.found.length} Google Maps-länkar hittades`,
    });

  } else {

    // Om ingen Google Maps-länk hittades
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

  // Om profiler inte kunde bekräftas
  if (
    googleBusinessProfileResult.failed.length > 0
  ) {

    results.push({
      name: "Google Business Profile",
      status: "FAIL",
      message:
        `${googleBusinessProfileResult.failed.length} Google-profiler kunde inte bekräftas`,
    });

  // Om direkta Google-profiler hittades
  } else if (
    googleBusinessProfileResult.found.length > 0
  ) {

    results.push({
      name: "Google Business Profile",
      status: "PASS",
      message:
        `${googleBusinessProfileResult.found.length} Google-profiler hittades och matchar företaget`,
    });

  // Om Google Business Profile kunde matchas via Google Maps
  } else if (
    googleBusinessProfileResult.mapsMatches.length > 0
  ) {

    results.push({
      name: "Google Business Profile",
      status: "PASS",
      message:
        "Google Business Profile matchar företaget via Google Maps",
    });

  // Om ingen direkt profil kunde verifieras
  } else {

    results.push({
      name: "Google Business Profile",
      status: "WARNING",
      message:
        "Ingen direkt Google Business Profile-länk kunde verifieras",
    });
  }

  // Skriver ut den färdiga QA-rapporten
  printQAReport(
    url,
    results
  );

  // Returnerar grundläggande information
  return {
    url: pageResult.url,
    status: pageResult.status,
    title: pageResult.title,
    links: pageResult.links,
    pages: pageResult.pages,
    results,
  };
}