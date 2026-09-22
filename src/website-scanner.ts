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

  // 2. Kontrollerar interna och externa länkar
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

  // 3. Kontrollerar bilder
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

  // 4. Kontrollerar formulär
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

  // 5. Kontrollerar formulärvalidering
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

  // 6. Kontrollerar navigation
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

  // 7. Kontrollerar CTA-knappar och länkar
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

  // 8. Kontrollerar sociala medier
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

  // 9. Kontrollerar Google Maps
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

  // 10. Kontrollerar Google Business Profile
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
      status: "WARNING",
      message:
        `Google Maps matchar företaget, men ingen direkt Business Profile-länk hittades`,
    });

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