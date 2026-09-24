import { Page } from "@playwright/test";

// Kontrollerar grundläggande SEO på alla sidor på webbplatsen
export async function checkSEO(
  page: Page,
  pages: string[]
) {

  // Sparar godkända SEO-kontroller
  const passed: string[] = [];

  // Sparar SEO-problem som bör förbättras
  const warnings: string[] = [];

  // Sparar tekniska fel där kontrollen inte kunde genomföras
  const failed: string[] = [];

  // Används för att undvika att samma sida kontrolleras flera gånger
  const checkedPages = new Set<string>();

  // Går igenom alla sidor som hittades av webbplatsens crawler
  for (const url of pages) {

    // Hoppar över sidan om den redan har kontrollerats
    if (checkedPages.has(url)) {
      continue;
    }

    // Markerar sidan som kontrollerad
    checkedPages.add(url);

    try {

      // Öppnar sidan och väntar tills HTML-dokumentet har laddats
      await page.goto(
        url,
        {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        }
      );

      // Hämtar sidans title
      const title = await page.title();

      // Kontrollerar att sidan har en title
      if (title.trim()) {

        passed.push(
          `${url} - Title found`
        );

      } else {

        // Saknad title är en SEO-varning
        warnings.push(
          `${url} - Title missing`
        );
      }

      // Hittar meta description på sidan
      const descriptionLocator =
        page.locator(
          'meta[name="description"]'
        );

      // Räknar hur många meta descriptions som finns
      const descriptionCount =
        await descriptionLocator.count();

      // Om ingen meta description finns registreras en varning
      if (descriptionCount === 0) {

        warnings.push(
          `${url} - Meta description missing`
        );

      } else {

        // Hämtar innehållet från den första meta description
        const description =
          await descriptionLocator
            .first()
            .getAttribute("content");

        // Kontrollerar att meta description faktiskt innehåller text
        if (description?.trim()) {

          passed.push(
            `${url} - Meta description found`
          );

        } else {

          warnings.push(
            `${url} - Meta description missing`
          );
        }
      }

      // Hämtar alla H1-rubriker på sidan
      const h1Elements =
        await page.locator("h1").all();

      // Kontrollerar antalet H1-rubriker
      if (h1Elements.length === 1) {

        // Hämtar texten från sidans H1
        const h1Text =
          await h1Elements[0].innerText();

        // Kontrollerar att H1-rubriken inte är tom
        if (h1Text.trim()) {

          passed.push(
            `${url} - Exactly one H1 found`
          );

        } else {

          warnings.push(
            `${url} - H1 exists but is empty`
          );
        }

      } else if (h1Elements.length === 0) {

        // En sida utan H1 registreras som en SEO-varning
        warnings.push(
          `${url} - H1 missing`
        );

      } else {

        // Flera H1 kan förekomma på en sida,
        // därför registreras detta som en varning istället för ett fel
        warnings.push(
          `${url} - Multiple H1 tags found (${h1Elements.length})`
        );
      }

      // Hämtar alla bilder på sidan
      const images =
        await page.locator("img").all();

      // Räknar bilder som saknar alt-attribut
      let imagesWithoutAlt = 0;

      // Går igenom varje bild
      for (const image of images) {

        // Hämtar bildens alt-attribut
        const alt =
          await image.getAttribute("alt");

        // Om alt-attributet saknas räknas bilden
        if (alt === null) {
          imagesWithoutAlt++;
        }
      }

      // Kontrollerar om alla bilder har alt-attribut
      if (imagesWithoutAlt === 0) {

        passed.push(
          `${url} - All images have alt attributes`
        );

      } else {

        // Saknade alt-attribut registreras som en SEO-varning
        warnings.push(
          `${url} - ${imagesWithoutAlt} images are missing alt attributes`
        );
      }

      // Hittar canonical-länken på sidan
      const canonicalLocator =
        page.locator(
          'link[rel="canonical"]'
        );

      // Räknar hur många canonical-länkar som finns
      const canonicalCount =
        await canonicalLocator.count();

      // Om canonical saknas registreras en varning
      if (canonicalCount === 0) {

        warnings.push(
          `${url} - Canonical missing`
        );

      } else {

        // Hämtar adressen från canonical-länken
        const canonical =
          await canonicalLocator
            .first()
            .getAttribute("href");

        // Kontrollerar att canonical innehåller en adress
        if (canonical?.trim()) {

          passed.push(
            `${url} - Canonical found`
          );

        } else {

          warnings.push(
            `${url} - Canonical missing`
          );
        }
      }

    } catch (error) {

      // Om sidan inte kan kontrolleras registreras ett tekniskt fel
      failed.push(
        `${url} - SEO check could not be completed`
      );

      // Skriver ut felet i terminalen för felsökning
      console.log(
        `⚠ SEO error on ${url}`,
        error
      );
    }
  }

  // Skriver ut sammanfattningen av SEO-kontrollen
  console.log("\nSEO RESULTS");

  // Visar antal godkända kontroller
  console.log(
    `✓ Passed: ${passed.length}`
  );

  // Visar antal varningar
  console.log(
    `⚠ Warnings: ${warnings.length}`
  );

  // Visar antal tekniska fel
  console.log(
    `✗ Technical errors: ${failed.length}`
  );

  // Visar alla SEO-varningar om det finns några
  if (warnings.length > 0) {

    console.log("\nSEO WARNINGS:");

    warnings.forEach((warning) => {
      console.log("-", warning);
    });
  }

  // Visar alla tekniska SEO-fel om det finns några
  if (failed.length > 0) {

    console.log("\nSEO ERRORS:");

    failed.forEach((error) => {
      console.log("-", error);
    });
  }

  // Returnerar resultaten så att website-scanner.ts
  // kan använda dem i den slutliga QA-rapporten
  return {
    passed,
    warnings,
    failed,
  };
}