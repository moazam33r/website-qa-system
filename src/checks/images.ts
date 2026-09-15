import { Page } from "@playwright/test";

// Kontrollerar att bilder på webbplatsen fungerar
export async function checkImages(page: Page, pages: string[]) {

  // Håller koll på bilder som redan har kontrollerats
  const checkedImages = new Set<string>();

  // Går igenom alla sidor på webbplatsen
  for (const pageUrl of pages) {

    // Öppnar sidan
    await page.goto(pageUrl);

    // Hämtar alla bilder på sidan
    const imageUrls = await page.locator("img[src]").evaluateAll((elements) =>
      elements.map((element) => (element as HTMLImageElement).src)
    );

    // Tar bort duplicerade bilder
    const uniqueImageUrls = [...new Set(imageUrls)];

    // Kontrollerar varje bild
    for (const imageUrl of uniqueImageUrls) {

      // Hoppar över bilder som använder data-URL
      if (imageUrl.startsWith("data:")) continue;

      // Hoppar över bilder som redan har kontrollerats
      if (checkedImages.has(imageUrl)) continue;

      checkedImages.add(imageUrl);

      try {

        // Skickar en request till bilden
        const response = await page.request.get(imageUrl);

        // Hämtar HTTP-status
        const status = response.status();

        // Kontrollerar om bilden fungerar
        if (status >= 200 && status < 400) {
          console.log(`✓ ${imageUrl} - ${status}`);
        } else {
          console.log(`✗ ${imageUrl} - ${status}`);
        }

      } catch {

        // Visar fel om bilden inte kunde laddas
        console.log(`✗ ${imageUrl} - Request failed`);
      }
    }
  }
}