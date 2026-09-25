// Analyserar resultaten från QA-systemet med hjälp av Ollama.
// AI:n får våra PASS, WARNING och FAIL och skapar en tydlig sammanfattning.

import { askOllama } from "./ollama";
import { QACheckResult } from "../report/qa-report";

// Skickar QA-resultaten till AI:n för analys.
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

  // Förklarar för AI:n vad den ska göra med resultaten.
  const prompt = `
Du är en QA-assistent för webbplatser.

Analysera följande QA-resultat:

${qaResults}

Svara på svenska och:
1. Sammanfatta vad som fungerar bra.
2. Identifiera de viktigaste problemen.
3. Prioritera FAIL före WARNING.
4. Förklara kort varför problemen är viktiga.
5. Ge konkreta rekommendationer för vad som bör åtgärdas.

Ändra aldrig själva QA-resultaten.
Du ska endast analysera och förklara dem.
`;

  // Skickar analysen till den lokala AI-modellen.
  return await askOllama(prompt);
}