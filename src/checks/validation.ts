import { Page } from "@playwright/test";

// Kontrollerar validering av formulär
export async function checkValidation(
  page: Page,
  pages: string[]
) {

  // Räknar e-postfält som klarar valideringen
  let emailPassed = 0;

  // Räknar e-postfält som inte klarar valideringen
  let emailFailed = 0;

  // Räknar telefonfält som klarar valideringen
  let phonePassed = 0;

  // Räknar telefonfält som inte klarar valideringen
  let phoneFailed = 0;

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

        console.log(
          `\nObligatoriska fält: ${pageUrl}`
        );

        console.log(
          `✓ ${requiredCount} obligatoriska fält hittades`
        );
      }
    }
  }

  // Kontrollerar e-postvalidering
  console.log("\nEmail validation check:");

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

    console.log(
      `\nE-postvalidering: ${pageUrl}`
    );

    // Testar varje e-postfält
    for (let i = 0; i < emailCount; i++) {

      const emailField = emailFields.nth(i);

      // Fyller i en ogiltig e-postadress
      await emailField.fill("test123");

      // Kontrollerar webbläsarens validering
      const isValid = await emailField.evaluate(
        (element) =>
          (element as HTMLInputElement).checkValidity()
      );

      if (isValid) {

        emailFailed++;

        console.log(
          "⚠ Ogiltig e-post accepterades"
        );

      } else {

        emailPassed++;

        console.log(
          "✓ Ogiltig e-post stoppades"
        );
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

    console.log(
      `\nTelefonvalidering: ${pageUrl}`
    );

    // Testar varje telefonfält
    for (let i = 0; i < phoneCount; i++) {

      const phoneField = phoneFields.nth(i);

      // Fyller i ett ogiltigt telefonnummer
      await phoneField.fill("070abc123");

      // Kontrollerar webbläsarens validering
      const isValid = await phoneField.evaluate(
        (element) =>
          (element as HTMLInputElement).checkValidity()
      );

      if (isValid) {

        phoneFailed++;

        console.log(
          "⚠ Ogiltigt telefonnummer accepterades"
        );

      } else {

        phonePassed++;

        console.log(
          "✓ Ogiltigt telefonnummer stoppades"
        );
      }
    }
  }

  // Visar sammanfattning
  console.log("\nValidation summary:");

  console.log(
    `Email validation: ${emailPassed} passed, ${emailFailed} failed`
  );

  console.log(
    `Phone validation: ${phonePassed} passed, ${phoneFailed} failed`
  );

  // Returnerar resultaten till QA-systemet
  return {
    emailPassed,
    emailFailed,
    phonePassed,
    phoneFailed,
  };
}