import { Page } from "@playwright/test";

export async function scanWebsite(page: Page, url: string) {
  // Öppnar webbplatsen och hämtar HTTP-svaret
  const response = await page.goto(url);

  // Hämtar statuskod och sidtitel från startsidan
  const status = response?.status() ?? 0;
  const title = await page.title();

  const links = await page.locator("a[href]").evaluateAll((elements) =>
    elements
      .map((element) => {
        const href = (element as HTMLAnchorElement).href;
        const linkUrl = new URL(href);

        linkUrl.hash = "";

        return linkUrl.toString();
      })
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
    const pageResponse = await page.goto(link);
    const pageStatus = pageResponse?.status() ?? 0;

    if (pageStatus >= 200 && pageStatus < 400) {
      console.log(`✓ ${link} - ${pageStatus}`);
    } else {
      console.log(`✗ ${link} - ${pageStatus}`);
    }
  }

  // Kontrollerar länkar på varje intern sida
  console.log("\nBroken link check:");

  const checkedLinks = new Set<string>();

  for (const pageUrl of uniqueLinks) {
    await page.goto(pageUrl);

    const pageLinks = await page.locator("a[href]").evaluateAll((elements) =>
      elements.map((element) => {
        const href = (element as HTMLAnchorElement).href;
        const linkUrl = new URL(href);

        linkUrl.hash = "";

        return linkUrl.toString();
      })
    );

    const uniquePageLinks = [...new Set(pageLinks)];

    for (const link of uniquePageLinks) {
      if (checkedLinks.has(link)) {
        continue;
      }

      checkedLinks.add(link);

      // Hoppar över telefon-, e-post- och JavaScript-länkar
      if (
        link.startsWith("mailto:") ||
        link.startsWith("tel:") ||
        link.startsWith("javascript:")
      ) {
        continue;
      }

      const isInternalLink = link.startsWith(new URL(url).origin);

     if (!isInternalLink) {
  try {
    const externalResponse = await page.request.get(link);
    const externalStatus = externalResponse.status();

    if (externalStatus >= 200 && externalStatus < 400) {
      console.log(`✓ Extern länk - ${link} - ${externalStatus}`);
    } else {
      console.log(`✗ Extern länk - ${link} - ${externalStatus}`);
    }
  } catch {
    console.log(`✗ Extern länk - ${link} - Request failed`);
  }

  continue;
}

      try {
        const linkResponse = await page.request.get(link);
        const linkStatus = linkResponse.status();

        if (linkStatus >= 200 && linkStatus < 400) {
          console.log(`✓ ${link} - ${linkStatus}`);
        } else {
          console.log(`✗ ${link} - ${linkStatus}`);
        }
      } catch {
        console.log(`✗ ${link} - Request failed`);
      }
    }
  }

  // Kontrollerar bilder på alla interna sidor
  console.log("\nBroken image check:");

  const checkedImages = new Set<string>();

  for (const pageUrl of uniqueLinks) {
    await page.goto(pageUrl);

    const imageUrls = await page.locator("img[src]").evaluateAll((elements) =>
      elements.map((element) => (element as HTMLImageElement).src)
    );

    const uniqueImageUrls = [...new Set(imageUrls)];

    for (const imageUrl of uniqueImageUrls) {
      // Hoppar över inline-bilder med data-URL
      if (imageUrl.startsWith("data:")) {
        continue;
      }

      if (checkedImages.has(imageUrl)) {
        continue;
      }

      checkedImages.add(imageUrl);

      try {
        const imageResponse = await page.request.get(imageUrl);
        const imageStatus = imageResponse.status();

        if (imageStatus >= 200 && imageStatus < 400) {
          console.log(`✓ ${imageUrl} - ${imageStatus}`);
        } else {
          console.log(`✗ ${imageUrl} - ${imageStatus}`);
        }
      } catch {
        console.log(`✗ ${imageUrl} - Request failed`);
      }
    }
  }

  // Kontrollerar formulär på alla interna sidor
  console.log("\nForm check:");

  for (const pageUrl of uniqueLinks) {
    await page.goto(pageUrl);

    const forms = page.locator("form");
    const formCount = await forms.count();

    if (formCount === 0) {
      console.log(`- ${pageUrl} - Inga formulär hittades`);
      continue;
    }

    console.log(`✓ ${pageUrl} - ${formCount} formulär hittades`);

    for (let i = 0; i < formCount; i++) {
      const form = forms.nth(i);

      const fields = form.locator("input, textarea, select");
      const fieldCount = await fields.count();

      console.log(`  Formulär ${i + 1}: ${fieldCount} fält`);

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

  // Testar e-postvalidering i formulär
  console.log("\nForm validation check:");

  for (const pageUrl of uniqueLinks) {
    await page.goto(pageUrl);

    const emailFields = page.locator(
      'input[type="email"], input[name*="email" i], input[name*="epost" i]'
    );

    const emailCount = await emailFields.count();

    if (emailCount === 0) {
      continue;
    }

    console.log(`\nE-postvalidering: ${pageUrl}`);

    for (let i = 0; i < emailCount; i++) {
      const emailField = emailFields.nth(i);

      await emailField.fill("test123");

      const isValid = await emailField.evaluate(
        (element) => (element as HTMLInputElement).checkValidity()
      );

      if (isValid) {
        console.log("⚠ Ogiltig e-post accepterades");
      } else {
        console.log("✓ Ogiltig e-post stoppades");
      }
    }
  }

  return {
    url,
    status,
    title,
    links: uniqueLinks,
  };
}