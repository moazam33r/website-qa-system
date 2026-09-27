import { askOllama } from "./ollama";

import {
  QACheckResult,
} from "../report/qa-report";

// Analyserar resultaten från QA-systemet med hjälp av Ollama.
//
// FAIL och WARNING skickas med sitt innehåll.
// PASS-resultat sammanfattas kort för att hålla prompten tydlig
// och undvika att skicka onödigt mycket information till AI:n.
export async function analyzeQAResults(
  results: QACheckResult[]
): Promise<string> {

  // Hämtar alla problem som behöver uppmärksammas.
  const problems =
    results
      .filter(
        (result) =>
          result.status === "FAIL" ||
          result.status === "WARNING"
      )
      .map(
        (result) =>
          `${result.status}: ${result.name} - ${result.message.slice(0, 500)}`
      )
      .join("\n");

  // Hämtar de viktigaste kontrollerna som lyckades.
  // Endast de första 10 skickas för att hålla prompten kort.
  const passed =
    results
      .filter(
        (result) =>
          result.status === "PASS"
      )
      .slice(0, 10)
      .map(
        (result) =>
          result.name
      )
      .join(", ");

  // Skapar prompten som skickas till Qwen3.
  const prompt = `
Du är en QA-expert.

Analysera resultaten från ett automatiserat QA-test av en webbplats.

VIKTIGA PROBLEM:
${problems || "Inga FAIL eller WARNING-resultat hittades."}

KONTROLLER SOM FUNGERAR:
${passed || "Inga PASS-resultat hittades."}

Svara på svenska och använd exakt denna struktur:

1. Vad fungerar bra
- Kort sammanfattning.

2. Viktigaste problemen
- Lista de viktigaste FAIL och WARNING-resultaten.

3. Vad resultaten visar
- Förklara kort vad problemen betyder.

4. Rekommendationer
- Ge konkreta rekommendationer för att åtgärda problemen.

Regler:
- Hitta inte på problem som inte finns i resultaten.
- Använd endast information från QA-resultaten.
- Var kort och tydlig.
`;

  // Skickar prompten till den lokala Ollama-modellen.
  const response =
    await askOllama(prompt);

  // Returnerar AI:ns färdiga analys till QA-systemet.
  return response;
}