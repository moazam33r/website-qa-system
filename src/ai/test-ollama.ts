// Testar att vårt QA-system kan kommunicera med Ollama.
// Vi skickar en enkel fråga och skriver ut AI:ns svar.

import { askOllama } from "./ollama";

// Skickar en testfråga till AI:n.
async function main() {
  const answer = await askOllama(
    "Svara kort på svenska: Vad betyder QA inom mjukvarutestning?"
  );

  // Visar AI:ns svar i terminalen.
  console.log("\n--- AI-SVAR ---");
  console.log(answer);
}

main().catch((error) => {
  console.error("AI-testet misslyckades:", error);
});