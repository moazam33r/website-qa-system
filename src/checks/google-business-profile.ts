import { Page } from "@playwright/test";

// Kontrollerar om webbplatsen innehåller en Google Business Profile
export async function checkGoogleBusinessProfile(
  page: Page,
  pages: string[]
) {

  const found = new Set<string>();

  console.log("\nGoogle Business Profile check:");

  for (const pageUrl of pages) {

    await page.goto(pageUrl, {
      waitUntil: "networkidle",
    });

    const links = await page.locator("a[href]").evaluateAll(
      (elements) =>
        elements.map(
          (element) =>
            (element as HTMLAnchorElement).href || ""
        )
    );

    for (const link of links) {

      const lowerLink = link.toLowerCase();

      if (
        lowerLink.includes("google.com/maps") ||
        lowerLink.includes("maps.google.com") ||
        lowerLink.includes("google.se/maps")
      ) {

        found.add(link);
      }
    }
  }

  if (found.size === 0) {

    console.log(
      "✗ Ingen Google Business Profile hittades."
    );

  } else {

    for (const profile of found) {

      console.log(
        `✓ Google Business Profile: ${profile}`
      );
    }
  }

  console.log(
    `\nGoogle Business Profile: ${found.size} hittades`
  );

  return {
    found: [...found],
  };
}