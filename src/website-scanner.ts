import { Page } from "@playwright/test";

export async function scanWebsite(page: Page, url: string) {
  // Öppnar webbplatsen och hämtar HTTP-svaret
  const response = await page.goto(url);

  // Hämtar statuskod och sidtitel från startsidan
  const status = response?.status() ?? 0;
  const title = await page.title();

  // Hittar alla länkar på startsidan
  const links = await page.locator("a[href]").evaluateAll((elements) =>
    elements
      .map((element) => (element as HTMLAnchorElement).href)

      // Behåller endast länkar som tillhör samma webbplats
      .filter((href) => href.startsWith(window.location.origin))
  );

  // Tar bort eventuella dubbletter
  const uniqueLinks = [...new Set(links)];

  console.log("Website:", url);
  console.log("Status:", status);
  console.log("Title:", title);
  console.log("Internal links:", uniqueLinks.length);

  // Skriver ut alla hittade interna sidor
  console.log("\nPages found:");
  uniqueLinks.forEach((link) => {
    console.log("-", link);
  });

  // Kontrollerar HTTP-status för varje intern sida
  console.log("\nPage status:");

  for (const link of uniqueLinks) {
    // Öppnar sidan och hämtar dess HTTP-svar
    const pageResponse = await page.goto(link);
    const pageStatus = pageResponse?.status() ?? 0;

    // Godkänner statuskoder mellan 200 och 399
    if (pageStatus >= 200 && pageStatus < 400) {
      console.log(`✓ ${link} - ${pageStatus}`);
    } else {
      // Rapporterar sidor med felaktig statuskod
      console.log(`✗ ${link} - ${pageStatus}`);
    }
  }

  // Kontrollerar länkar på varje intern sida
  console.log("\nBroken link check:");

  // Håller reda på länkar som redan har kontrollerats
  const checkedLinks = new Set<string>();

  for (const pageUrl of uniqueLinks) {
    // Öppnar sidan som ska kontrolleras
    await page.goto(pageUrl);

    // Hämtar alla länkar från sidan
    const pageLinks = await page.locator("a[href]").evaluateAll((elements) =>
      elements.map((element) => (element as HTMLAnchorElement).href)
    );

    // Tar bort dubbletter från sidan
    const uniquePageLinks = [...new Set(pageLinks)];

    // Kontrollerar varje länk
    for (const link of uniquePageLinks) {
      // Hoppar över länkar som redan har kontrollerats
      if (checkedLinks.has(link)) {
        continue;
      }

      // Lägger till länken så att den inte kontrolleras igen
      checkedLinks.add(link);

      // Kontrollerar om länken är intern eller extern
      const isInternalLink = link.startsWith(new URL(url).origin);

      // Externa länkar hanteras separat eftersom externa webbplatser
      // kan blockera automatiserade requests och ge missvisande statuskoder
      if (!isInternalLink) {
        console.log(`⚠ Extern länk - ${link}`);
        continue;
      }

      try {
        // Skickar en HTTP-request till den interna länken
        const linkResponse = await page.request.get(link);
        const linkStatus = linkResponse.status();

        // Godkänner statuskoder mellan 200 och 399
        if (linkStatus >= 200 && linkStatus < 400) {
          console.log(`✓ ${link} - ${linkStatus}`);
        } else {
          // Rapporterar interna länkar som returnerar exempelvis 404 eller 500
          console.log(`✗ ${link} - ${linkStatus}`);
        }
      } catch {
        // Hanterar länkar där requesten misslyckas
        console.log(`✗ ${link} - Request failed`);
      }
    }
  }

  // Kontrollerar bilder på alla interna sidor
  console.log("\nBroken image check:");

  // Håller reda på bilder som redan har kontrollerats
  const checkedImages = new Set<string>();

  for (const pageUrl of uniqueLinks) {
    // Öppnar sidan som ska kontrolleras
    await page.goto(pageUrl);

    // Hämtar alla bildadresser från sidan
    const imageUrls = await page.locator("img[src]").evaluateAll((elements) =>
      elements.map((element) => (element as HTMLImageElement).src)
    );

    // Tar bort dubbletter från sidan
    const uniqueImageUrls = [...new Set(imageUrls)];

    // Kontrollerar varje bild
    for (const imageUrl of uniqueImageUrls) {
      // Hoppar över bilder som redan har kontrollerats
      if (checkedImages.has(imageUrl)) {
        continue;
      }

      // Lägger till bilden så att den inte kontrolleras igen
      checkedImages.add(imageUrl);

      try {
        // Skickar en HTTP-request till bilden
        const imageResponse = await page.request.get(imageUrl);
        const imageStatus = imageResponse.status();

        // Godkänner statuskoder mellan 200 och 399
        if (imageStatus >= 200 && imageStatus < 400) {
          console.log(`✓ ${imageUrl} - ${imageStatus}`);
        } else {
          // Rapporterar bilder som exempelvis returnerar 404 eller 500
          console.log(`✗ ${imageUrl} - ${imageStatus}`);
        }
      } catch {
        // Hanterar bilder där requesten misslyckas
        console.log(`✗ ${imageUrl} - Request failed`);
      }
    }
  }

  // Kontrollerar formulär på alla interna sidor
  console.log("\nForm check:");

  for (const pageUrl of uniqueLinks) {
    // Öppnar sidan som ska kontrolleras
    await page.goto(pageUrl);

    // Hittar alla formulär på sidan
    const forms = page.locator("form");
    const formCount = await forms.count();

    // Rapporterar om sidan innehåller formulär
    if (formCount === 0) {
      console.log(`- ${pageUrl} - Inga formulär hittades`);
      continue;
    }

    console.log(`✓ ${pageUrl} - ${formCount} formulär hittades`);

    // Går igenom varje formulär på sidan
    for (let i = 0; i < formCount; i++) {
      const form = forms.nth(i);

      // Hämtar alla input-, textarea- och select-fält
      const fields = form.locator("input, textarea, select");
      const fieldCount = await fields.count();

      console.log(`  Formulär ${i + 1}: ${fieldCount} fält`);

      // Skriver ut information om varje fält
      for (let j = 0; j < fieldCount; j++) {
        const field = fields.nth(j);

        const type = await field.getAttribute("type");
        const name = await field.getAttribute("name");
        const placeholder = await field.getAttribute("placeholder");

        console.log(
          `    - type=${type ?? "okänd"}, name=${name ?? "saknas"}, placeholder=${placeholder ?? "saknas"}`
        );
      }
    }
  }

  // Returnerar information som kan användas av andra tester
  return {
    url,
    status,
    title,
    links: uniqueLinks,
  };
}