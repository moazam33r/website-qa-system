// Koppling till Ollama som körs lokalt på datorn.
// Funktionen skickar en text till Qwen3 och läser AI-svaret
// medan modellen arbetar istället för att vänta på hela svaret.

const OLLAMA_URL = "http://localhost:11434/api/chat";
const MODEL = "qwen3:4b";

// Skickar en fråga till den lokala AI-modellen.
export async function askOllama(
  prompt: string
): Promise<string> {
  // Skickar frågan till Ollama och ber om ett streamat svar.
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
      stream: true,
    }),
  });

  // Kontrollerar att Ollama svarade korrekt.
  if (!response.ok) {
    throw new Error(
      `Ollama svarade med status ${response.status}`
    );
  }

  // Kontrollerar att Ollama skickar tillbaka en stream.
  if (!response.body) {
    throw new Error("Ollama skickade inget svar.");
  }

  // Läser svaret bit för bit.
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  // Här samlar vi hela AI-svaret.
  let fullResponse = "";

  while (true) {
    const { done, value } = await reader.read();

    // Streamen är färdig.
    if (done) {
      break;
    }

    // Gör om datan från Ollama till text.
    const chunk = decoder.decode(value, {
      stream: true,
    });

    // Ollama skickar ett JSON-objekt per rad.
    const lines = chunk
      .split("\n")
      .filter((line) => line.trim());

    // Läser varje JSON-rad.
    for (const line of lines) {
      try {
        const data = JSON.parse(line);

        // Lägger till texten från AI:n.
        if (data.message?.content) {
          fullResponse += data.message.content;
        }
      } catch {
        // Hoppar över en rad om den inte är komplett JSON.
      }
    }
  }

  // Kontrollerar att AI:n faktiskt skickade text.
  if (!fullResponse.trim()) {
    throw new Error("Ollama skickade ett tomt AI-svar.");
  }

  return fullResponse;
}