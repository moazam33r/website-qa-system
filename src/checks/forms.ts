import { Page } from "@playwright/test";

// Kontrollerar formulär och deras fält på webbplatsen
export async function checkForms(page: Page, pages: string[]) {

  // Går igenom alla sidor på webbplatsen
  for (const pageUrl of pages) {

    // Öppnar sidan
    await page.goto(pageUrl);

    // Hämtar alla formulär
    const forms = page.locator("form");
    const formCount = await forms.count();

    // Om sidan inte har något formulär går vi vidare
    if (formCount === 0) {
      console.log(`- ${pageUrl} - Inga formulär hittades`);
      continue;
    }

    console.log(`✓ ${pageUrl} - ${formCount} formulär hittades`);

    // Kontrollerar varje formulär
    for (let i = 0; i < formCount; i++) {

      const form = forms.nth(i);

      // Hämtar alla input-, textarea- och select-fält
      const fields = form.locator("input, textarea, select");
      const fieldCount = await fields.count();

      console.log(`  Formulär ${i + 1}: ${fieldCount} fält`);

      // Kontrollerar varje fält
      for (let j = 0; j < fieldCount; j++) {

        const field = fields.nth(j);

        // Hämtar information om fältet
        const type = await field.getAttribute("type");
        const name = await field.getAttribute("name");
        const placeholder = await field.getAttribute("placeholder");

        console.log(
          `    - type=${type ?? "okänd"}, name=${name ?? "saknas"}, placeholder=${placeholder ?? "saknas"}`
        );
      }
    }
  }
}