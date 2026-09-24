// Söker efter liknande företagsnamn på webben
export async function searchSimilarDomains(
  url: string,
  companyName: string
) {

  console.log(
    "\n--- LIKNANDE DOMÄNER / FÖRETAGSNAMN ---"
  );

  try {

    // Hämtar information från webbplatsens URL
    const parsedUrl = new URL(url);

    // Hämtar den egna domänen
    const ownDomain =
      parsedUrl.hostname
        .replace(/^www\./, "")
        .toLowerCase();

    // Skapar en normaliserad version av företagsnamnet
    const normalizedName =
      companyName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/aktiebolag/g, "")
        .replace(/\bab\b/g, "")
        .replace(/[^a-z0-9\s]/g, "")
        .trim();

    // Skapar sökningar från företagsnamnet
    const queries = new Set<string>();

    // Söker på hela företagsnamnet
    if (normalizedName) {

      queries.add(
        `"${normalizedName}"`
      );
    }

    // Tar bort mellanslag för att även hitta
    // företag som använder namnet som ett ord
    const words =
      normalizedName
        .split(/\s+/)
        .filter(
          (word) => word.length >= 3
        );

    if (words.length > 1) {

      queries.add(
        `"${words.join("")}"`
      );
    }

    console.log("\nSökningar:");

    // Visar vilka sökningar som genomförs
    for (const query of queries) {

      console.log(
        `- ${query}`
      );
    }

    // Domäner som inte ska räknas som möjliga
    // liknande företag
    const ignoredDomains = new Set([
      "google.com",
      "google.se",
      "bing.com",
      "duckduckgo.com",
      "linkedin.com",
      "instagram.com",
      "facebook.com",
      "youtube.com",
      "tiktok.com",
      "x.com",
      "twitter.com",
      "allabolag.se",
      "ratsit.se",
      "merinfo.se",
      "hitta.se",
      "eniro.se",
      "dnb.com",
      "se.linkedin.com",
      "se.revieweuro.com",
    ]);

    // Sparar alla hittade relevanta domäner
    const foundDomains = new Set<string>();

    // Söker på DuckDuckGo
    for (const query of queries) {

      try {

        // Skapar URL för DuckDuckGo HTML-sökning
        const searchUrl =
          `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

        // Hämtar sökresultaten
        const response =
          await fetch(searchUrl);

        // Kontrollerar om sökningen lyckades
        if (!response.ok) {

          console.log(
            `⚠ Sökningen misslyckades: ${response.status}`
          );

          continue;
        }

        // Hämtar HTML-koden från sökresultatet
        const html =
          await response.text();

        console.log(
          `\nResultat för ${query}:`
        );

        // Hittar länkar från DuckDuckGo-resultaten
        const resultLinks =
          html.match(
            /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="[^"]+"/gi
          ) || [];

        // Går igenom alla hittade sökresultat
        for (const link of resultLinks) {

          // Hämtar URL:en från href-attributet
          const hrefMatch =
            link.match(
              /href="([^"]+)"/i
            );

          if (!hrefMatch) {
            continue;
          }

          let resultUrl =
            hrefMatch[1];

          try {

            // Hanterar URL:er som börjar med //
            if (resultUrl.startsWith("//")) {

              resultUrl =
                `https:${resultUrl}`;
            }

            // Skapar ett URL-objekt av resultatet
            const parsedResultUrl =
              new URL(resultUrl);

            let targetUrl =
              parsedResultUrl;

            // DuckDuckGo kan använda en redirect
            // där den riktiga URL:en finns i parametern uddg
            const uddg =
              parsedResultUrl.searchParams.get(
                "uddg"
              );

            if (uddg) {

              try {

                // Hämtar den riktiga mål-URL:en
                targetUrl =
                  new URL(
                    decodeURIComponent(uddg)
                  );

              } catch {

                // Hoppar över ogiltiga URL:er
                continue;
              }
            }

            // Hämtar domännamnet
            const domain =
              targetUrl.hostname
                .replace(/^www\./, "")
                .toLowerCase();

            // Hoppar över den egna webbplatsen
            if (domain === ownDomain) {
              continue;
            }

            // Hoppar över sociala medier,
            // sökmotorer och företagsregister
            if (
              ignoredDomains.has(domain)
            ) {
              continue;
            }

            // Lägger bara till nya domäner
            if (!foundDomains.has(domain)) {

              foundDomains.add(domain);

              console.log(
                `- ${domain}`
              );
            }

          } catch {

            // Ignorerar ogiltiga URL:er
          }
        }

      } catch {

        // Hanterar problem med själva webbsökningen
        console.log(
          "⚠ Kunde inte genomföra webbsökningen."
        );
      }
    }

    // Visar resultatet om inga relevanta domäner hittades
    if (foundDomains.size === 0) {

      console.log(
        "\n- Inga andra domäner hittades"
      );

    } else {

      // Visar hur många relevanta domäner som hittades
      console.log(
        `\nTotalt hittades ${foundDomains.size} andra domäner.`
      );
    }

    // Returnerar resultatet till QA-systemet
    return {
      companyName,
      ownDomain,
      domains: [...foundDomains],
      found: foundDomains.size,

      // Om andra domäner hittades visas WARNING
      status:
        foundDomains.size > 0
          ? "WARNING" as const
          : "PASS" as const,
    };

  } catch {

    // Hanterar fel om URL eller kontrollen inte fungerar
    console.log(
      "⚠ Kunde inte söka efter liknande domäner."
    );

    // Returnerar ett varningsresultat
    return {
      companyName,
      ownDomain: "",
      domains: [],
      found: 0,
      status: "WARNING" as const,
    };
  }
}