// Analyserar resultaten från QA-systemet med hjälp av Ollama.
// AI:n får våra PASS, WARNING och FAIL och skapar en tydlig sammanfattning.

import { askOllama } from "./ollama";
import { QACheckResult } from "../report/qa-report";

// Skickar QA-resultaten till den lokala AI-modellen för analys.
export async function analyzeQAResults(
  results: QACheckResult[]
): Promise<string> {
  // Gör om resultaten till vanlig text som AI:n kan läsa.
  const qaResults = results
    .map(
      (result) =>
        `${result.status}: ${result.name} - ${result.message}`
    )
    .join("\n");

  // Ger AI:n tydliga regler för hur resultaten får analyseras.
  const prompt = `
Du är en QA-assistent för webbplatser.

Analysera ENDAST QA-resultaten nedan.

QA-RESULTAT:

${qaResults}

VIKTIGA REGLER:

1. Använd endast information som uttryckligen finns i QA-resultaten.
2. Hitta aldrig på nya fel, tester, resultat eller tekniska detaljer.
3. Ändra aldrig statusen PASS, WARNING eller FAIL.
4. Beskriv vad testet faktiskt visar, inte vad du antar att det betyder.
5. Gör inga tekniska eller affärsmässiga antaganden som inte finns i resultatet.
6. Använd inte formuleringar som "säkerställer", "garanterar", "helt korrekt", "felfri" eller liknande.
7. Skriv inte att ett resultat påverkar SEO, säkerhet, konvertering, dataintegritet eller liknande om detta inte uttryckligen står i QA-resultatet.
8. Om ett test bara visar att något saknas eller inte är validerat, beskriv endast detta.
9. FAIL ska alltid visas före WARNING.
10. Om det inte finns några FAIL, skriv: "Inga FAIL-resultat hittades."
11. Om det finns WARNING, ange exakt vilka WARNING-resultat som finns.
12. Rekommendationer ska endast beskriva vad som konkret kan kontrolleras eller åtgärdas utifrån resultatet.
13. Skapa aldrig egna gränsvärden eller krav.
14. Håll analysen kort och tydlig.

Svara på svenska.

Använd exakt denna struktur:

1. Vad fungerar bra
- Sammanfatta de viktigaste PASS-resultaten.
- Använd endast information från PASS-resultaten.

2. Viktigaste problemen
- Lista FAIL först.
- Lista sedan WARNING.
- Ange vad varje test faktiskt hittade.
- Om inga FAIL finns, skriv "Inga FAIL-resultat hittades."

3. Vad resultaten visar
- Förklara kort vad de identifierade problemen innebär utifrån själva testresultatet.
- Gör inga ytterligare antaganden.

4. Rekommendationer
- Ge konkreta förslag på vad som kan kontrolleras eller åtgärdas.
- Förslagen måste vara direkt kopplade till de identifierade resultaten.

Viktigt:
Du är en QA-analysassistent.
Du ska förklara testresultaten, inte hitta på ytterligare information.
`;

  // Skickar analysen till den lokala AI-modellen.
  return await askOllama(prompt);
}