// Läser och validerar inställningarna för den lokala Ollama-servern.
// Inställningarna kan ändras via .env utan att själva koden behöver ändras.

import dotenv from "dotenv";

// Läser in miljövariabler från projektets .env-fil.
dotenv.config();

// Standardadress för Ollama som körs lokalt på datorn.
export const OLLAMA_HOST =
  process.env.OLLAMA_HOST ||
  "http://127.0.0.1:11434";

// Modellen som används av QA-systemets AI-analys.
export const OLLAMA_MODEL =
  process.env.OLLAMA_MODEL ||
  "qwen3:4b";

// Maximal tid som systemet väntar på ett svar från Ollama.
// 180000 ms = 3 minuter.
export const OLLAMA_TIMEOUT_MS =
  Number(process.env.OLLAMA_TIMEOUT_MS || "180000");

// Kontrollerar att timeout-värdet är giltigt.
if (
  !Number.isFinite(OLLAMA_TIMEOUT_MS) ||
  OLLAMA_TIMEOUT_MS <= 0
) {
  throw new Error(
    "OLLAMA_TIMEOUT_MS måste vara ett positivt antal millisekunder."
  );
}

// Skapar en komplett URL till Ollama.
// Funktionen används för exempelvis /api/tags och /api/chat.
export function getOllamaUrl(
  path: string
): URL {
  // Läser den konfigurerade Ollama-adressen.
  const baseUrl = new URL(OLLAMA_HOST);

  // Tillåter endast HTTP eller HTTPS.
  if (
    baseUrl.protocol !== "http:" &&
    baseUrl.protocol !== "https:"
  ) {
    throw new Error(
      "OLLAMA_HOST måste börja med http:// eller https://."
    );
  }

  // Returnerar den färdiga URL:en.
  return new URL(path, baseUrl);
}