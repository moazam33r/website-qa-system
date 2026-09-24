// Kontrollerar om webbplatsen har en Cookie/GDPR-sida
import { Page } from "@playwright/test";

export async function checkCookieGdpr(
  page: Page,
  pages: string[]
) {
  console.log("\n--- COOKIE / GDPR ---");

  const keywords = [
    "cookie",
    "cookies",
    "integritet",
    "privacy",
    "gdpr",
  ];

  const foundPages: string[] = [];

  for (const pageUrl of pages) {
    const url = pageUrl.toLowerCase();

    if (keywords.some((keyword) => url.includes(keyword))) {
      foundPages.push(pageUrl);
      console.log(`✓ ${pageUrl}`);
    }
  }

  if (foundPages.length === 0) {
    console.log("⚠ Ingen Cookie- eller Integritetspolicy hittades");
  }

  console.log(
    `\nCookie / GDPR: ${foundPages.length} sidor hittades`
  );

  return {
    found: foundPages.length,
    pages: foundPages,
  };
}