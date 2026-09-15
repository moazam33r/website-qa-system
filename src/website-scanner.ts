import { Page } from "@playwright/test";

import { checkPages } from "./checks/pages";
import { checkLinks } from "./checks/links";
import { checkImages } from "./checks/images";
import { checkForms } from "./checks/forms";
import { checkValidation } from "./checks/validation";
import { checkNavigation } from "./checks/navigation";

// Startar en komplett QA-skanning av webbplatsen
export async function scanWebsite(page: Page, url: string) {

  console.log("\n=================================");
  console.log("       WEBSITE QA SYSTEM");
  console.log("=================================");
  console.log(`\nStartar skanning av: ${url}`);

  // 1. Kontrollerar webbplatsens sidor
  console.log("\n--- SIDOR ---");

  const pageResult = await checkPages(page, url);

  // Hämtar alla sidor som hittades
  const pages = pageResult.links;

  // 2. Kontrollerar interna och externa länkar
  console.log("\n--- LÄNKAR ---");

  await checkLinks(
    page,
    url,
    pages
  );

  // 3. Kontrollerar bilder
  console.log("\n--- BILDER ---");

  await checkImages(
    page,
    pages
  );

  // 4. Kontrollerar formulär
  console.log("\n--- FORMULÄR ---");

  await checkForms(
    page,
    pages
  );

  // 5. Kontrollerar formulärvalidering
  console.log("\n--- VALIDERING ---");

  await checkValidation(
    page,
    pages
  );

  // 6. Kontrollerar navigation
  console.log("\n--- NAVIGATION ---");

  await checkNavigation(
    page,
    url,
    pages
  );

  console.log("\n=================================");
  console.log("       QA-SKANNING KLAR");
  console.log("=================================\n");

  // Returnerar grundläggande information om webbplatsen
  return {
    url: pageResult.url,
    status: pageResult.status,
    title: pageResult.title,
    links: pageResult.links,
  };
}
