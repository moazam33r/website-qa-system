// Kontrollerar om webbplatsen fungerar i mobilvy
import { Page } from "@playwright/test";

export async function checkResponsive(
  page: Page,
  pages: string[]
) {
  console.log("\n--- MOBIL / RESPONSIVITET ---");

  const originalViewport = page.viewportSize();

  // Mobilstorlek
  await page.setViewportSize({
    width: 375,
    height: 667,
  });

  let passed = 0;
  let failed = 0;

  for (const pageUrl of pages) {
    try {
      await page.goto(pageUrl, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      if (hasHorizontalScroll) {
        failed++;

        console.log(
          `✗ ${pageUrl} - Horisontell scroll hittades`
        );
      } else {
        passed++;

        console.log(
          `✓ ${pageUrl} - Mobilvy fungerar`
        );
      }

    } catch (error) {
      failed++;

      console.log(
        `✗ ${pageUrl} - Kunde inte kontrolleras`
      );
    }
  }

  // Återställ viewport
  if (originalViewport) {
    await page.setViewportSize(originalViewport);
  }

  console.log(
    `\nResponsivitet: ${passed} passed, ${failed} failed`
  );

  return {
    passed,
    failed,
  };
}