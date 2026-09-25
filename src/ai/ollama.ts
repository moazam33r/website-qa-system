// Koppling till Ollama som körs lokalt på datorn.
// Funktionen skickar en text till Qwen3 och returnerar AI-svaret.

const OLLAMA_URL = "http://localhost:11434/api/chat";
const MODEL = "qwen3:4b";

// Skickar en fråga till den lokala AI-modellen.
export async function askOllama(
  prompt: string
): Promise<string> {
  const response = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      stream: false,
    }),
  });

  // Kontrollerar att Ollama svarade korrekt.
  if (!response.ok) {
    throw new Error(
      `Ollama svarade med status ${response.status}`
    );
  }

  // Hämtar AI-svaret från JSON.
  const data = await response.json();

  return data.message.content;
}