import { test, expect } from "@playwright/test";
import { checkText } from "../src/checks/text-check";

// Testar textkontrollen genom att simulera
// ett svar från LanguageTool.
test("Textkontroll hittar stavfel", async () => {

  // Sparar den riktiga fetch-funktionen
  // så att den kan återställas efter testet.
  const originalFetch = globalThis.fetch;

  // Simulerar ett svar från LanguageTool.
  globalThis.fetch = async () => {

    // Skapar ett exempel på ett stavfel.
    const responseData = {
      matches: [
        {
          message: "Möjligt stavfel",
          context: {
            text: "Detta är ett felaktigt ord.",
            offset: 13,
            length: 10,
          },
          replacements: [
            {
              value: "korrekt",
            },
          ],
          rule: {
            id: "SPELLING",
            issueType: "misspelling",
          },
        },
      ],
    };

    // Returnerar ett simulerat lyckat API-svar.
    return {
      ok: true,
      status: 200,
      json: async () => responseData,
    } as Response;
  };

  try {

    // Kör textkontrollen med exempeltext.
    const result = await checkText(
      "Detta är ett felaktigt ord."
    );

    // Ett textfel ska hittas.
    expect(result.errors).toBe(1);

    // Resultatet ska bli WARNING
    // eftersom ett textfel hittades.
    expect(result.status).toBe("WARNING");

    // Kontrollera att felet finns i resultatet.
    expect(result.issues).toHaveLength(1);

    // Kontrollera att LanguageTools meddelande sparades.
    expect(result.issues[0].message)
      .toBe("Möjligt stavfel");

    // Kontrollera att förslaget sparades.
    expect(result.issues[0].suggestions)
      .toContain("korrekt");

  } finally {

    // Återställer den riktiga fetch-funktionen.
    globalThis.fetch = originalFetch;
  }
});