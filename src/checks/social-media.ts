import { Page } from "@playwright/test";

// Kontrollerar länkar till sociala medier
export async function checkSocialMedia(
  page: Page,
  pages: string[]
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

  console.log("\nSocial media check:");

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

  // Lyssnar efter Trustindex data
  page.on("response", async (response) => {

    const url = response.url();

    if (
      url.includes("trustindex.io/widgets/") &&
      url.includes("data.json")
    ) {

      try {

        const content =
          await response.text();

        const data = JSON.parse(content);

        // Kontrollerar Trustindex sources
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

  // Visar resultatet
  if (found.size === 0) {

    console.log(
      "Inga sociala medier hittades."
    );

  } else {

    for (const [
      platform,
      link
    ] of found) {

      console.log(
        `✓ ${platform}: ${link}`
      );
    }
  }

  console.log(
    `\nSociala medier: ${found.size} hittades`
  );

  return {
    found: [...found.entries()].map(
      ([platform, url]) => ({
        platform,
        url,
      })
    ),
  };
}