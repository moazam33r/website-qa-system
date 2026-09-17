import { Page } from "@playwright/test";

// Kontrollerar formulär och deras fält på webbplatsen
export async function checkForms(
  page: Page,
  pages: string[]
) {

  // Räknar antal formulär
  let formCount = 0;

  // Räknar antal fält
  let fieldCount = 0;

  // Räknar obligatoriska fält
  let requiredCount = 0;

  // Går igenom alla sidor på webbplatsen
  for (const pageUrl of pages) {

    // Öppnar sidan
    await page.goto(pageUrl);

    // Hämtar alla formulär
    const forms = page.locator("form");
    const currentFormCount = await forms.count();

    // Hoppar över sidor utan formulär
    if (currentFormCount === 0) {
      continue;
    }

    console.log(
      `✓ ${pageUrl} - ${currentFormCount} formulär hittades`
    );

    // Lägger till formulären i totalsumman
    formCount += currentFormCount;

    // Kontrollerar varje formulär
    for (let i = 0; i < currentFormCount; i++) {

      const form = forms.nth(i);

      // Hämtar alla input-, textarea- och select-fält
      const fields = form.locator(
        "input, textarea, select"
      );

      const currentFieldCount = await fields.count();

      // Lägger till fälten i totalsumman
      fieldCount += currentFieldCount;

      console.log(
        `  Formulär ${i + 1}: ${currentFieldCount} fält`
      );

      // Kontrollerar varje fält
      for (let j = 0; j < currentFieldCount; j++) {

        const field = fields.nth(j);

        // Hämtar information om fältet
        const type = await field.getAttribute("type");
        const name = await field.getAttribute("name");
        const placeholder = await field.getAttribute("placeholder");

        // Kontrollerar om fältet är obligatoriskt
        const required = await field.getAttribute("required");
        const ariaRequired = await field.getAttribute(
          "aria-required"
        );

        if (
          required !== null ||
          ariaRequired === "true"
        ) {
          requiredCount++;
        }

        console.log(
          `    - type=${type ?? "okänd"}, name=${name ?? "saknas"}, placeholder=${placeholder ?? "saknas"}`
        );
      }
    }
  }

  // Visar sammanfattning
  console.log("\nForm summary:");

  console.log(
    `Forms: ${formCount}`
  );

  console.log(
    `Fields: ${fieldCount}`
  );

  console.log(
    `Required fields: ${requiredCount}`
  );

  // Returnerar resultaten till QA-systemet
  return {
    formCount,
    fieldCount,
    requiredCount,
  };
}