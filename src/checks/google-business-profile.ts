import { Page } from "@playwright/test";

// Kontrollerar om webbplatsen innehåller en Google Business Profile
// och om profilen verkar tillhöra rätt företag
export async function checkGoogleBusinessProfile(
  page: Page,
  pages: string[]
) {

  const found = new Set<string>();

  const failed: {
    url: string;
    message: string;
  }[] = [];

  // Öppnar startsidan
  await page.goto(pages[0], {
    waitUntil: "domcontentloaded",
  });

  // Sparar möjliga företagsnamn
  const companyNames: string[] = [];

  // Hämtar företagsnamn från JSON-LD
  const jsonLdScripts =
    await page.locator(
      'script[type="application/ld+json"]'
    ).allTextContents();

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
          companyNames.push(object.name.trim());
        }

        // Kontrollerar objekt i @graph
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

  // Hämtar namn från sidans titel
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

  // Hämtar namn från footer
  const footerTexts =
    await page.locator("footer").allInnerTexts();

  for (const footerText of footerTexts) {

    const copyrightMatches =
      footerText.match(/©\s*([^\n]+)/gi);

    if (copyrightMatches) {

      for (const match of copyrightMatches) {

        const name = match
          .replace(/^©\s*/i, "")
          .trim();

        if (name) {
          companyNames.push(name);
        }
      }
    }
  }

  // Hämtar möjliga företagsnamn från logotypens alt-text
  const logoTexts =
    await page.locator("img[alt]").evaluateAll(
      (images) =>
        images
          .map(
            (image) =>
              (image as HTMLImageElement).alt.trim()
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
    )
  ];

  console.log(
    "\nMöjliga företagsnamn som används för Google-kontroll:"
  );

  for (const name of uniqueCompanyNames) {
    console.log(`- ${name}`);
  }

  // Gör namn enklare att jämföra
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

  const normalizedCompanyNames =
    uniqueCompanyNames
      .map(normalizeName)
      .filter(
        (name) => name.length > 3
      );

  // Går igenom alla hittade sidor
  for (const pageUrl of pages) {

    await page.goto(pageUrl, {
      waitUntil: "networkidle",
    });

    const links =
      await page.locator("a[href]").evaluateAll(
        (elements) =>
          elements.map(
            (element) =>
              (element as HTMLAnchorElement).href || ""
          )
      );

    // Letar efter Google Business Profile
    for (const link of links) {

      const lowerLink =
        link.toLowerCase();

      // Google Maps embed är inte en Business Profile
      if (
        lowerLink.includes(
          "google.com/maps/embed"
        ) ||
        lowerLink.includes(
          "maps.google.com/maps/embed"
        )
      ) {
        continue;
      }

      if (
        lowerLink.includes(
          "google.com/maps/place"
        ) ||
        lowerLink.includes(
          "maps.google.com"
        ) ||
        lowerLink.includes(
          "google.se/maps"
        ) ||
        lowerLink.includes(
          "maps.app.goo.gl"
        )
      ) {

        found.add(link);

        console.log(
          `Google-profil hittad: ${link}`
        );
      }
    }
  }

  // Ingen profil hittades
  if (found.size === 0) {

    console.log(
      "✗ Ingen Google Business Profile hittades."
    );

  } else {

    // Kontrollerar varje hittad profil
    for (const profile of found) {

      try {

        await page.goto(profile, {
          waitUntil: "domcontentloaded",
          timeout: 15000,
        });

        // Hämtar den slutliga URL:en efter eventuell redirect
        const finalUrl = page.url();

        console.log(
          `Google slutlig URL: ${finalUrl}`
        );

        const googleText =
          await page.locator("body").innerText();

        // Avkodar Google URL
        // Exempel: Digital%2BKontakt -> Digital+Kontakt
        // och sedan Digital+Kontakt -> Digital Kontakt
        const decodedUrl =
          decodeURIComponent(finalUrl)
            .replace(/\+/g, " ");

        // Kontrollerar både Google URL och sidans text
        const googleContent =
          `${decodedUrl} ${googleText}`;

        const normalizedGoogleContent =
          normalizeName(googleContent);

        let matchedName: string | undefined;

        // Försöker hitta direkt matchning
        for (
          let i = 0;
          i < normalizedCompanyNames.length;
          i++
        ) {

          const companyName =
            normalizedCompanyNames[i];

          if (!companyName) continue;

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

        // Om direkt matchning inte fungerar
        // kontrolleras viktiga ord från företagsnamnet
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

            if (!words) continue;

            const importantWords =
              words.filter(
                (word) =>
                  ![
                    "sverige",
                    "aktiebolag",
                    "ab",
                    "for",
                    "och",
                    "webb",
                    "digitalbyra",
                  ].includes(word)
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

        if (matchedName) {

          console.log(
            `✓ Google Business Profile matchar företaget: ${matchedName}`
          );

        } else {

          console.log(
            "✗ Google Business Profile verkar inte tillhöra företaget"
          );

          failed.push({
            url: profile,
            message:
              "Inget av webbplatsens företagsnamn kunde hittas på Google-profilen",
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

  console.log(
    `\nGoogle Business Profile: ${found.size} hittades`
  );

  return {
    found: [...found],
    failed,
  };
}