import { test, expect } from "@playwright/test";
import { searchSimilarDomains } from "../src/checks/similar-domains";

// Testar kontrollen av liknande domäner
// utan att vara beroende av en riktig DuckDuckGo-sökning.
test("Liknande domäner kontroll", async () => {

  // Sparar den riktiga fetch-funktionen så att den kan återställas efter testet.
  const originalFetch = globalThis.fetch;

  // Simulerar ett DuckDuckGo-svar.
  globalThis.fetch = async () => {

    // Skapar exempel på sökresultat från DuckDuckGo.
    const html = `
      <a class="result__a"
         href="https://digitalkontakt-ab.se">
         Digital Kontakt AB
      </a>

      <a class="result__a"
         href="https://digitalkontakt.se">
         Digital Kontakt
      </a>

      <a class="result__a"
         href="https://collabodoc.com">
         Collabodoc
      </a>
    `;

    // Returnerar ett simulerat lyckat HTTP-svar.
    return {
      ok: true,
      status: 200,
      text: async () => html,
    } as Response;
  };

  try {

    // Kör kontrollen med Digital Kontakt som företagsnamn.
    const result = await searchSimilarDomains(
      "https://digitalkontakt.se",
      "Digital Kontakt"
    );

    // Den relevanta alternativa domänen ska hittas.
    expect(result.domains).toContain(
      "digitalkontakt-ab.se"
    );

    // Den egna domänen ska inte räknas.
    expect(result.domains).not.toContain(
      "digitalkontakt.se"
    );

    // Den irrelevanta domänen ska inte räknas.
    // Detta testar den förbättrade filtreringen.
    expect(result.domains).not.toContain(
      "collabodoc.com"
    );

    // Endast en relevant domän ska finnas.
    expect(result.found).toBe(1);

    // En hittad relevant domän ger WARNING.
    expect(result.status).toBe("WARNING");

  } finally {

    // Återställer den riktiga fetch-funktionen efter testet.
    globalThis.fetch = originalFetch;
  }
});