import { Page } from "@playwright/test";

// Kontrollerar om webbplatsen innehåller Google Maps
export async function checkGoogleMaps(
  page: Page,
  pages: string[]
) {

  // Sparar hittade Google Maps-länkar och kartor
  const found = new Set<string>();

  console.log("\nGoogle Maps check:");

  // Går igenom alla sidor på webbplatsen
  for (const pageUrl of pages) {

    await page.goto(pageUrl, {
      waitUntil: "networkidle",
    });

    // Kontrollerar vanliga länkar
    const links = await page.locator("a[href]").evaluateAll(
      (elements) =>
        elements.map(
          (element) =>
            (element as HTMLAnchorElement).href || ""
        )
    );

    for (const link of links) {

      const lowerLink = link.toLowerCase();

      // Google Maps Embed ska inte räknas som en vanlig länk
      if (lowerLink.includes("google.com/maps/embed")) {
        continue;
      }

      // Kontrollerar vanliga Google Maps-länkar
      if (
        lowerLink.includes("google.com/maps") ||
        lowerLink.includes("maps.google.com") ||
        lowerLink.includes("google.se/maps")
      ) {

        found.add(link);
      }
    }

    // Kontrollerar inbäddade Google Maps-kartor
    const iframes = await page.locator("iframe").evaluateAll(
      (elements) =>
        elements.map(
          (element) =>
            (element as HTMLIFrameElement).src || ""
        )
    );

    for (const iframeUrl of iframes) {

      const lowerIframeUrl =
        iframeUrl.toLowerCase();

      // Kontrollerar om iframe innehåller Google Maps
      if (
        lowerIframeUrl.includes("google.com/maps") ||
        lowerIframeUrl.includes("maps.google.com") ||
        lowerIframeUrl.includes("google.se/maps") ||
        lowerIframeUrl.includes("google.com/maps/embed")
      ) {

        found.add(iframeUrl);
      }
    }
  }

  // Visar resultatet
  if (found.size === 0) {

    console.log(
      "⚠ Ingen Google Maps hittades."
    );

  } else {

    for (const map of found) {

      console.log(
        "✓ Google Maps iframe hittades"
      );
    }
  }

  console.log(
    `\nGoogle Maps: ${found.size} hittades`
  );

  return {
    found: [...found],
  };
}