import { Page } from "@playwright/test";

// Kontrollerar CTA-knappar och tydliga CTA-länkar
export async function checkCTA(
  page: Page,
  pages: string[]
) {

  let passed = 0;
  let failed = 0;

  console.log("\nCTA check:");

  // Vanliga klasser som används för knappar/CTA
  const buttonClasses = [
    "btn",
    "button",
    "cta",
    "wp-block-button__link",
    "elementor-button",
    "et_pb_button",
  ];

  // Går igenom alla sidor
  for (const pageUrl of pages) {

    await page.goto(pageUrl);

    // Hittar länkar, knappar och submit-knappar
    const elements = page.locator(
      'a[href], button, input[type="submit"]'
    );

    const count = await elements.count();

    // Kontrollerar varje element
    for (let i = 0; i < count; i++) {

      const element = elements.nth(i);

      // Hoppar över dolda element
      const visible = await element.isVisible().catch(
        () => false
      );

      if (!visible) continue;

      // Hämtar elementets tag
      const tagName = await element.evaluate(
        (el) => el.tagName.toLowerCase()
      );

      // Hämtar CSS-klasser
      const className =
        (
          await element.getAttribute("class")
        )?.toLowerCase() ?? "";

      // Hämtar role
      const role =
        (
          await element.getAttribute("role")
        )?.toLowerCase() ?? "";

      // Kontrollerar om elementet har en vanlig knapp/CTA-klass
      const hasButtonClass =
        buttonClasses.some(
          (buttonClass) =>
            className.includes(buttonClass)
        );

      // Kontrollerar om elementet är en knapp
      const isButtonElement =
        tagName === "button" ||
        tagName === "input";

      // Kontrollerar om länken har role="button"
      const isButtonRole =
        role === "button";

      // Bestämmer om elementet är en CTA
      const isCTA =
        isButtonElement ||
        isButtonRole ||
        hasButtonClass;

      // Hoppar över vanliga textlänkar
      if (!isCTA) continue;

      // Hämtar text
      const text =
        (
          await element.innerText().catch(
            () => ""
          )
        ).trim();

      // Hämtar href
      const href =
        await element.getAttribute("href");

      // Om CTA:n saknar href kan vi inte kontrollera destinationen
      if (!href) {
        continue;
      }

      // Ignorera länkar som inte leder till en sida
      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:")
      ) {
        continue;
      }

      try {

        // Gör relativ URL till absolut URL
        const targetUrl = new URL(
          href,
          pageUrl
        ).toString();

        // Kontrollerar destinationen
        const response =
          await page.request.get(
            targetUrl
          );

        if (
          response.status() >= 200 &&
          response.status() < 400
        ) {

          passed++;

        } else {

          failed++;

          console.log(
            `✗ CTA fungerar inte: "${text}" - ${targetUrl} - ${response.status()}`
          );
        }

      } catch {

        failed++;

        console.log(
          `✗ CTA kunde inte kontrolleras: "${text}"`
        );
      }
    }
  }

  console.log("\nCTA summary:");

  console.log(
    `CTA: ${passed} passed, ${failed} failed`
  );

  return {
    passed,
    failed,
  };
}