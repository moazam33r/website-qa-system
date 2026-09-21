import { Page } from "@playwright/test";

// Kontrollerar länkar till sociala medier
export async function checkSocialMedia(
  page: Page,
  pages: string[],
  websiteUrl: string
) {

  // Plattformar vi letar efter
  const platforms = [
    {
      name: "Facebook",
      keywords: ["facebook.com", "fb.com"],
    },
    {
      name: "Instagram",
      keywords: ["instagram.com"],
    },
    {
      name: "LinkedIn",
      keywords: ["linkedin.com"],
    },
    {
      name: "YouTube",
      keywords: ["youtube.com", "youtu.be"],
    },
    {
      name: "TikTok",
      keywords: ["tiktok.com"],
    },
    {
      name: "X/Twitter",
      keywords: ["twitter.com", "x.com"],
    },
  ];

  // Sparar hittade sociala medier
  const found = new Map<string, string>();

  // Sparar sociala medier som inte verkar tillhöra företaget
  const failed: {
    platform: string;
    url: string;
    message: string;
  }[] = [];

  console.log("\nSocial media check:");

  // Hämtar webbplatsens domän
  const websiteDomain =
    new URL(websiteUrl).hostname
      .replace(/^www\./, "")
      .toLowerCase();

  const domainName =
    websiteDomain
      .split(".")[0]
      .toLowerCase();

  // Hittar sociala medier i text eller HTML
  const findSocialMedia = (
    content: string
  ) => {

    for (const platform of platforms) {

      for (const keyword of platform.keywords) {

        if (
          content
            .toLowerCase()
            .includes(keyword) &&
          !found.has(platform.name)
        ) {

          const urlMatch = content.match(
            new RegExp(
              `https?://[^"'\\s<>]*${keyword.replace(".", "\\.")}[^"'\\s<>]*`,
              "i"
            )
          );

          const socialUrl =
            urlMatch?.[0] ?? keyword;

          found.set(
            platform.name,
            socialUrl
          );

          break;
        }
      }
    }
  };

  // Lyssnar efter Trustindex-data
  page.on("response", async (response) => {

    const responseUrl = response.url();

    if (
      responseUrl.includes("trustindex.io/widgets/") &&
      responseUrl.includes("data.json")
    ) {

      try {

        const content =
          await response.text();

        const data = JSON.parse(content);

        if (data.sources) {

          for (const sourceKey of Object.keys(
            data.sources
          )) {

            const source =
              data.sources[sourceKey];

            const profileUrl =
              source?.user?.profile_url;

            if (!profileUrl) continue;

            for (const platform of platforms) {

              const matches =
                platform.keywords.some(
                  (keyword) =>
                    profileUrl
                      .toLowerCase()
                      .includes(keyword)
                );

              if (
                matches &&
                !found.has(platform.name)
              ) {

                found.set(
                  platform.name,
                  profileUrl
                );
              }
            }
          }
        }

      } catch {
        // Ignorerar om JSON inte kan läsas
      }
    }
  });

  // Går igenom alla sidor
  for (const pageUrl of pages) {

    await page.goto(pageUrl, {
      waitUntil: "networkidle",
    });

    // Hämtar vanliga länkar
    const links = await page.locator("a").evaluateAll(
      (elements) =>
        elements.map(
          (element) => ({
            href:
              (element as HTMLAnchorElement).href || "",

            text:
              element.textContent || "",

            className:
              element.getAttribute("class") || "",

            ariaLabel:
              element.getAttribute("aria-label") || "",

            title:
              element.getAttribute("title") || "",
          })
        )
    );

    // Kontrollerar vanliga länkar
    for (const link of links) {

      const searchableText = [
        link.href,
        link.text,
        link.className,
        link.ariaLabel,
        link.title,
      ].join(" ");

      findSocialMedia(
        searchableText
      );
    }

    // Kontrollerar hela HTML-koden
    const html =
      await page.content();

    findSocialMedia(html);

    // Väntar på dynamiskt innehåll
    await page.waitForTimeout(1500);
  }

  // Hämtar webbplatsens titel efter att sidan har laddats
  const websiteTitle =
    await page.title();

  const companyName =
    websiteTitle
      .split("|")[0]
      .trim()
      .toLowerCase();

  // Kontrollerar om de hittade kontona verkar
  // höra ihop med webbplatsen
  for (const [
    platform,
    socialUrl
  ] of found) {

    try {

      const socialUrlObject =
        new URL(socialUrl);

      let username =
  socialUrlObject.pathname
    .replace(/^\/+/, "")
    .split("/")
    .filter(Boolean)
    .pop()
    ?.toLowerCase() ?? "";

     const normalizedCompanyName =
  companyName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

      const normalizedUsername =
        username
          .replace(/[^a-z0-9]/g, "");

      const normalizedDomain =
        domainName
          .replace(/[^a-z0-9]/g, "");

     const matchesCompany =
  normalizedCompanyName.length > 0 &&
  (
    normalizedUsername.includes(
      normalizedCompanyName
    ) ||
    normalizedCompanyName.includes(
      normalizedUsername
    )
  );

const matchesDomain =
  normalizedDomain.length > 0 &&
  (
    normalizedUsername.includes(
      normalizedDomain
    ) ||
    normalizedDomain.includes(
      normalizedUsername
    )
  );

      const matches =
        matchesCompany ||
        matchesDomain;

      if (!matches) {

        failed.push({
          platform,
          url: socialUrl,
          message:
            `Kontot verkar inte matcha företaget ${companyName}`,
        });

        console.log(
          `✗ ${platform}: ${socialUrl}`
        );

        console.log(
          `  Kontot verkar inte tillhöra företaget ${companyName}`
        );

      } else {

        console.log(
          `✓ ${platform}: ${socialUrl}`
        );

        console.log(
          `  ✓ Kontot matchar företaget`
        );
      }

    } catch {

      failed.push({
        platform,
        url: socialUrl,
        message:
          `Kunde inte kontrollera sociala mediet: ${socialUrl}`,
      });

      console.log(
        `✗ ${platform}: kunde inte verifieras`
      );
    }
  }

  if (found.size === 0) {

    console.log(
      "Inga sociala medier hittades."
    );
  }

  console.log(
    `\nSociala medier: ${found.size} hittades`
  );

  console.log(
    `Sociala medier som inte matchar: ${failed.length}`
  );

  return {
    found: [...found.entries()].map(
      ([platform, url]) => ({
        platform,
        url,
      })
    ),

    failed,
  };
}