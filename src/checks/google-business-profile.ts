import { Page } from "@playwright/test";
import fs from "fs";
import path from "path";

// Kontrollerar Google Maps och Google Business Profile
// och försöker koppla informationen till företaget.
export async function checkGoogleBusinessProfile(
  page: Page,
  pages: string[]
) {

  const found = new Set<string>();

  const failed: {
    url: string;
    message: string;
  }[] = [];

  const screenshots: {
    url: string;
    path: string;
  }[] = [];

  const mapsMatches: {
    url: string;
    companyName: string;
  }[] = [];

  if (pages.length === 0) {
    return {
      found: [],
      failed,
      screenshots,
      mapsMatches,
    };
  }

  // --------------------------------------------------
  // NORMALISERING
  // --------------------------------------------------

  function normalizeName(name: string) {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/aktiebolag/g, "")
      .replace(/\bab\b/g, "")
      .replace(/\bsverige\b/g, "")
      .replace(/[^a-z0-9]/g, "")
      .trim();
  }

  // --------------------------------------------------
  // HÄMTAR FÖRETAGSNAMN
  // --------------------------------------------------

  await page.goto(pages[0], {
    waitUntil: "domcontentloaded",
  });

  const companyNames: string[] = [];

  // JSON-LD
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

        if (
          object &&
          typeof object === "object" &&
          typeof object.name === "string"
        ) {
          companyNames.push(
            object.name.trim()
          );
        }

        // @graph
        if (
          object &&
          typeof object === "object" &&
          Array.isArray(object["@graph"])
        ) {

          for (const graphObject of object["@graph"]) {

            if (
              graphObject &&
              typeof graphObject === "object" &&
              typeof graphObject.name === "string"
            ) {

              companyNames.push(
                graphObject.name.trim()
              );
            }
          }
        }
      }

    } catch {
      // Ignorerar JSON-LD som inte går att läsa
    }
  }

  // Sidtitel
  const title = await page.title();

  if (title) {

    const titleParts = title
      .split("|")
      .map((part) => part.trim())
      .filter(Boolean);

    companyNames.push(
      ...titleParts
    );
  }

  // Footer
  const footerTexts =
    await page.locator("footer").allInnerTexts();

  for (const footerText of footerTexts) {

    const lines = footerText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {

      if (line.includes("©")) {

        const cleaned = line
          .replace(/©/g, "")
          .trim();

        if (cleaned.length > 2) {
          companyNames.push(cleaned);
        }
      }
    }
  }

  // Logotyp
  const logoTexts =
    await page
      .locator("img[alt]")
      .evaluateAll(
        (images) =>
          images
            .map(
              (image) =>
                (image as HTMLImageElement)
                  .alt
                  .trim()
            )
            .filter(
              (alt) =>
                alt &&
                /logo|logotyp/i.test(alt)
            )
      );

  companyNames.push(
    ...logoTexts
  );

  // Tar bort dubbletter
  const uniqueCompanyNames = [
    ...new Set(
      companyNames
        .map((name) => name.trim())
        .filter(
          (name) => name.length > 2
        )
    ),
  ];

  console.log(
    "\nMöjliga företagsnamn som används för Google-kontroll:"
  );

  for (const name of uniqueCompanyNames) {
    console.log(`- ${name}`);
  }

  const normalizedCompanyNames =
    uniqueCompanyNames
      .map(normalizeName)
      .filter(
        (name) => name.length > 3
      );

  // --------------------------------------------------
  // GOOGLE-LÄNKAR
  // --------------------------------------------------

  const googleProfileCandidates =
    new Set<string>();

  const googleMapsEmbeds =
    new Set<string>();

  // Går igenom alla sidor
  for (const pageUrl of pages) {

    await page.goto(pageUrl, {
      waitUntil: "networkidle",
    });

    // Vanliga länkar
    const links =
      await page
        .locator("a[href]")
        .evaluateAll(
          (elements) =>
            elements
              .map(
                (element) =>
                  (element as HTMLAnchorElement)
                    .href || ""
              )
              .filter(Boolean)
        );

    for (const link of links) {

      const lowerLink =
        link.toLowerCase();

      if (
        lowerLink.includes(
          "google.com/maps/place"
        ) ||
        lowerLink.includes(
          "google.se/maps/place"
        ) ||
        lowerLink.includes(
          "maps.google.com/maps/place"
        ) ||
        lowerLink.includes(
          "maps.app.goo.gl"
        )
      ) {

        googleProfileCandidates.add(
          link
        );
      }
    }

    // Google Maps iframe
    const iframeSources =
      await page
        .locator("iframe[src]")
        .evaluateAll(
          (iframes) =>
            iframes
              .map(
                (iframe) =>
                  (iframe as HTMLIFrameElement)
                    .src || ""
              )
              .filter(Boolean)
        );

    for (const iframeSrc of iframeSources) {

      const lowerIframe =
        iframeSrc.toLowerCase();

      if (
        lowerIframe.includes(
          "google.com/maps"
        ) ||
        lowerIframe.includes(
          "maps.google.com"
        ) ||
        lowerIframe.includes(
          "google.se/maps"
        )
      ) {

        googleMapsEmbeds.add(
          iframeSrc
        );
      }
    }
  }

  // --------------------------------------------------
  // GOOGLE MAPS
  // --------------------------------------------------

  if (googleMapsEmbeds.size > 0) {

    console.log(
      `\nGoogle Maps embeds: ${googleMapsEmbeds.size}`
    );

    for (const embed of googleMapsEmbeds) {

      console.log(
        `Google Maps URL: ${embed}`
      );

      let decodedEmbed = embed;

      try {
        decodedEmbed =
          decodeURIComponent(embed);
      } catch {
        // Behåller original-URL
      }

      const normalizedEmbed =
        normalizeName(
          decodedEmbed
        );

      let matchedName:
        | string
        | undefined;

      // Försöker matcha företagsnamnet
      for (
        let i = 0;
        i < normalizedCompanyNames.length;
        i++
      ) {

        const companyName =
          normalizedCompanyNames[i];

        if (!companyName) {
          continue;
        }

        if (
          normalizedEmbed.includes(
            companyName
          )
        ) {

          matchedName =
            uniqueCompanyNames[i];

          break;
        }
      }

      if (matchedName) {

        mapsMatches.push({
          url: embed,
          companyName: matchedName,
        });

        console.log(
          `✓ Google Maps matchar företaget: ${matchedName}`
        );

      } else {

        console.log(
          "⚠ Google Maps hittades men företagsnamnet kunde inte bekräftas."
        );
      }
    }

  } else {

    console.log(
      "\nIngen Google Maps embed hittades."
    );
  }

  // --------------------------------------------------
  // DIREKTA GOOGLE BUSINESS PROFILE-LÄNKAR
  // --------------------------------------------------

  if (
    googleProfileCandidates.size === 0
  ) {

    console.log(
      "\n⚠ Ingen direkt Google Business Profile-länk hittades på webbplatsen."
    );

  } else {

    console.log(
      `\nGoogle Business Profile-kandidater: ${googleProfileCandidates.size}`
    );

    for (
      const profile
      of googleProfileCandidates
    ) {

      try {

        await page.goto(profile, {
          waitUntil: "domcontentloaded",
          timeout: 20000,
        });

        const finalUrl =
          page.url();

        console.log(
          `Google-profil URL: ${finalUrl}`
        );

        let googleText = "";

        try {

          googleText =
            await page
              .locator("body")
              .innerText();

        } catch {

          googleText = "";
        }

        // URL + sidans text
        let decodedUrl =
          finalUrl;

        try {

          decodedUrl =
            decodeURIComponent(
              finalUrl
            );

        } catch {
          // Behåller original
        }

        const googleContent =
          `${decodedUrl} ${googleText}`;

        const normalizedGoogleContent =
          normalizeName(
            googleContent
          );

        let matchedName:
          | string
          | undefined;

        // Direkt matchning
        for (
          let i = 0;
          i < normalizedCompanyNames.length;
          i++
        ) {

          const companyName =
            normalizedCompanyNames[i];

          if (!companyName) {
            continue;
          }

          if (
            normalizedGoogleContent.includes(
              companyName
            )
          ) {

            matchedName =
              uniqueCompanyNames[i];

            break;
          }
        }

        // Matchning med viktiga ord
        if (!matchedName) {

          for (
            let i = 0;
            i < normalizedCompanyNames.length;
            i++
          ) {

            const companyName =
              normalizedCompanyNames[i];

            const words =
              companyName.match(
                /[a-z0-9]{3,}/g
              );

            if (!words) {
              continue;
            }

            const ignoredWords = [
              "sverige",
              "aktiebolag",
              "ab",
              "for",
              "och",
              "webb",
              "digitalbyra",
              "kyltjanst",
            ];

            const importantWords =
              words.filter(
                (word) =>
                  !ignoredWords.includes(
                    word
                  )
              );

            if (
              importantWords.length >= 2 &&
              importantWords.every(
                (word) =>
                  normalizedGoogleContent.includes(
                    word
                  )
              )
            ) {

              matchedName =
                uniqueCompanyNames[i];

              break;
            }
          }
        }

        // --------------------------------------------------
        // RESULTAT
        // --------------------------------------------------

        if (matchedName) {

          found.add(profile);

          console.log(
            `✓ Google Business Profile matchar företaget: ${matchedName}`
          );

          // Screenshot-mapp
          const screenshotDirectory =
            path.join(
              "test-results",
              "google-business-profile"
            );

          fs.mkdirSync(
            screenshotDirectory,
            {
              recursive: true,
            }
          );

          const screenshotNumber =
            screenshots.length + 1;

          const screenshotPath =
            path.join(
              screenshotDirectory,
              `profile-${screenshotNumber}.png`
            );

          await page.screenshot({
            path: screenshotPath,
            fullPage: true,
          });

          screenshots.push({
            url: finalUrl,
            path: screenshotPath,
          });

          console.log(
            `✓ Screenshot sparad: ${screenshotPath}`
          );

        } else {

          console.log(
            "⚠ Google-länken kunde hittas men företagsnamnet kunde inte bekräftas."
          );

          failed.push({
            url: profile,
            message:
              "Google Business Profile hittades men företagsnamnet kunde inte bekräftas",
          });
        }

      } catch {

        console.log(
          `✗ Kunde inte kontrollera Google Business Profile: ${profile}`
        );

        failed.push({
          url: profile,
          message:
            "Kunde inte läsa Google Business Profile",
        });
      }
    }
  }

  // --------------------------------------------------
  // SLUTRESULTAT
  // --------------------------------------------------

  console.log(
    `\nGoogle Maps som matchar företaget: ${mapsMatches.length}`
  );

  console.log(
    `Google Business Profiles verifierade: ${found.size}`
  );

  return {
    found: [...found],
    failed,
    screenshots,
    mapsMatches,
  };
}