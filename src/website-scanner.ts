import { Page } from "@playwright/test";

export async function scanWebsite(page: Page, url: string) {
  const response = await page.goto(url);
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

  const uniqueLinks = [...new Set(links)];

  console.log("Website:", url);
  console.log("Status:", status);
  console.log("Title:", title);
  console.log("Internal links:", uniqueLinks.length);

  console.log("\nPages found:");
  uniqueLinks.forEach((link) => console.log("-", link));

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
      if (checkedLinks.has(link)) continue;

      checkedLinks.add(link);

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

  console.log("\nNavigation check:");

  const checkedNavigationLinks = new Set<string>();
  let navigationPassed = 0;
  let navigationFailed = 0;

  for (const pageUrl of uniqueLinks) {
    await page.goto(pageUrl);

    const navigationLinks = await page.locator("a[href]").evaluateAll((elements) =>
      elements
        .map((element) => {
          const href = (element as HTMLAnchorElement).href;

          if (
            href.startsWith("mailto:") ||
            href.startsWith("tel:") ||
            href.startsWith("javascript:")
          ) {
            return null;
          }

          const linkUrl = new URL(href);
          linkUrl.hash = "";

          return linkUrl.toString();
        })
        .filter((href): href is string => href !== null)
    );

    const uniqueNavigationLinks = [...new Set(navigationLinks)];

    for (const link of uniqueNavigationLinks) {
      const isInternalLink = link.startsWith(new URL(url).origin);

      if (!isInternalLink) continue;
      if (checkedNavigationLinks.has(link)) continue;

      checkedNavigationLinks.add(link);

      try {
        const response = await page.request.get(link);
        const linkStatus = response.status();

        if (linkStatus >= 200 && linkStatus < 400) {
          navigationPassed++;
        } else {
          navigationFailed++;
          console.log(`✗ Navigation - ${link} - ${linkStatus}`);
        }
      } catch {
        navigationFailed++;
        console.log(`✗ Navigation - ${link} - Request failed`);
      }
    }
  }

  console.log(
    `✓ ${navigationPassed} interna navigationslänkar fungerar`
  );

  if (navigationFailed > 0) {
    console.log(
      `✗ ${navigationFailed} interna navigationslänkar fungerar inte`
    );
  }

  console.log("\nBroken image check:");

  const checkedImages = new Set<string>();

  for (const pageUrl of uniqueLinks) {
    await page.goto(pageUrl);

    const imageUrls = await page.locator("img[src]").evaluateAll((elements) =>
      elements.map((element) => (element as HTMLImageElement).src)
    );

    const uniqueImageUrls = [...new Set(imageUrls)];

    for (const imageUrl of uniqueImageUrls) {
      if (imageUrl.startsWith("data:")) continue;
      if (checkedImages.has(imageUrl)) continue;

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

  console.log("\nRequired field check:");

  for (const pageUrl of uniqueLinks) {
    await page.goto(pageUrl);

    const forms = page.locator("form");
    const formCount = await forms.count();

    if (formCount === 0) continue;

    for (let i = 0; i < formCount; i++) {
      const form = forms.nth(i);

      const requiredFields = form.locator(
        'input[required], textarea[required], select[required], [aria-required="true"]'
      );

      const requiredCount = await requiredFields.count();

      if (requiredCount > 0) {
        console.log(`\nObligatoriska fält: ${pageUrl}`);
        console.log(`✓ ${requiredCount} obligatoriska fält hittades`);

        for (let j = 0; j < requiredCount; j++) {
          const field = requiredFields.nth(j);

          const type = await field.getAttribute("type");
          const name = await field.getAttribute("name");
          const placeholder = await field.getAttribute("placeholder");

          console.log(
            `  - type=${type ?? "okänd"}, name=${name ?? "saknas"}, placeholder=${placeholder ?? "saknas"}`
          );
        }
      }
    }
  }

  console.log("\nForm validation check:");

  for (const pageUrl of uniqueLinks) {
    await page.goto(pageUrl);

    const emailFields = page.locator(
      'input[type="email"], input[name*="email" i], input[name*="epost" i]'
    );

    const emailCount = await emailFields.count();

    if (emailCount === 0) continue;

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

  console.log("\nPhone validation check:");

  for (const pageUrl of uniqueLinks) {
    await page.goto(pageUrl);

    const phoneFields = page.locator(
      'input[type="tel"], input[name*="phone" i], input[name*="telefon" i], input[name*="mobile" i]'
    );

    const phoneCount = await phoneFields.count();

    if (phoneCount === 0) continue;

    console.log(`\nTelefonvalidering: ${pageUrl}`);

    for (let i = 0; i < phoneCount; i++) {
      const phoneField = phoneFields.nth(i);

      await phoneField.fill("070abc123");

      const isValid = await phoneField.evaluate(
        (element) => (element as HTMLInputElement).checkValidity()
      );

      if (isValid) {
        console.log("⚠ Ogiltigt telefonnummer accepterades");
      } else {
        console.log("✓ Ogiltigt telefonnummer stoppades");
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