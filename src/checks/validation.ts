import { Page } from "@playwright/test";

// Kontrollerar validering av formulär
export async function checkValidation(page: Page, pages: string[]) {

  // Kontrollerar obligatoriska fält
  console.log("\nRequired field check:");

  for (const pageUrl of pages) {

    // Öppnar sidan
    await page.goto(pageUrl);

    // Hämtar alla formulär
    const forms = page.locator("form");
    const formCount = await forms.count();

    // Hoppar över sidor utan formulär
    if (formCount === 0) continue;

    // Kontrollerar varje formulär
    for (let i = 0; i < formCount; i++) {

      const form = forms.nth(i);

      // Hittar obligatoriska fält
      const requiredFields = form.locator(
        'input[required], textarea[required], select[required], [aria-required="true"]'
      );

      const requiredCount = await requiredFields.count();

      if (requiredCount > 0) {

        console.log(`\nObligatoriska fält: ${pageUrl}`);
        console.log(`✓ ${requiredCount} obligatoriska fält hittades`);

        // Visar information om varje obligatoriskt fält
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

  // Kontrollerar e-postvalidering
  console.log("\nForm validation check:");

  for (const pageUrl of pages) {

    // Öppnar sidan
    await page.goto(pageUrl);

    // Hittar e-postfält
    const emailFields = page.locator(
      'input[type="email"], input[name*="email" i], input[name*="epost" i]'
    );

    const emailCount = await emailFields.count();

    // Hoppar över sidor utan e-postfält
    if (emailCount === 0) continue;

    console.log(`\nE-postvalidering: ${pageUrl}`);

    // Testar varje e-postfält
    for (let i = 0; i < emailCount; i++) {

      const emailField = emailFields.nth(i);

      // Fyller i en ogiltig e-postadress
      await emailField.fill("test123");

      // Kontrollerar webbläsarens validering
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

  // Kontrollerar telefonvalidering
  console.log("\nPhone validation check:");

  for (const pageUrl of pages) {

    // Öppnar sidan
    await page.goto(pageUrl);

    // Hittar telefonfält
    const phoneFields = page.locator(
      'input[type="tel"], input[name*="phone" i], input[name*="telefon" i], input[name*="mobile" i]'
    );

    const phoneCount = await phoneFields.count();

    // Hoppar över sidor utan telefonfält
    if (phoneCount === 0) continue;

    console.log(`\nTelefonvalidering: ${pageUrl}`);

    // Testar varje telefonfält
    for (let i = 0; i < phoneCount; i++) {

      const phoneField = phoneFields.nth(i);

      // Fyller i ett ogiltigt telefonnummer
      await phoneField.fill("070abc123");

      // Kontrollerar webbläsarens validering
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
}