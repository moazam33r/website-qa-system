// Separat Node-process för AI-anropet.
// Den körs utanför Playwright-processen.
//
// Syftet är att isolera Ollama från Playwright
// och göra AI-anropet mer stabilt.

import http from "http";

// Läser prompten från kommandoraden.
const prompt =
  process.argv.slice(2).join(" ");

// Kontrollerar att en prompt faktiskt skickades.
if (!prompt) {
  console.error(
    "Ingen prompt skickades till Ollama."
  );

  process.exit(1);
}

// Skapar JSON-datan som skickas till Ollama.
const body = JSON.stringify({
  // Använder Qwen3 4B som lokal modell.
  model: "qwen3:4b",

  // Skickar både systeminstruktion och användarprompt.
  messages: [
    {
      // Systemrollen ger modellen grundregler
      // innan den får själva QA-prompten.
      role: "system",

      content:
        "Du är en svensk QA-analysassistent. " +
        "Returnera endast den färdiga QA-analysen. " +
        "Svara endast på svenska. " +
        "Skriv aldrig ditt resonemang eller din arbetsprocess. " +
        "Skriv aldrig text som 'Okay', 'Let's', 'The user', " +
        "'First, I need to' eller liknande. " +
        "Börja direkt med '1. Vad fungerar bra'.",
    },

    {
      // Här skickas den detaljerade QA-prompten
      // från analyzeQAResults().
      role: "user",
      content: prompt,
    },
  ],

  // Vi vill ha hela svaret på en gång.
  stream: false,

  // Stänger av Qwen3:s thinking-läge.
  think: false,

  // Begränsar hur långt AI-svaret får bli.
  options: {
    num_predict: 350,

    // Lägre temperatur ger ett mer förutsägbart svar.
    temperature: 0.2,
  },
});

// Skapar HTTP-anropet till Ollama.
const request =
  http.request(
    {
      hostname: "127.0.0.1",
      port: 11434,
      path: "/api/chat",
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        "Content-Length":
          Buffer.byteLength(body),
      },

      // Ger Ollama upp till 180 sekunder
      // om modellen behöver mer tid.
      timeout: 180000,
    },

    (response) => {

      let responseBody = "";

      // Samlar Ollamas svar.
      response.on(
        "data",
        (chunk) => {
          responseBody +=
            chunk.toString();
        }
      );

      // När hela svaret har kommit.
      response.on(
        "end",
        () => {

          // Kontrollerar HTTP-statusen.
          if (
            response.statusCode !== 200
          ) {
            console.error(
              `Ollama status: ${response.statusCode}`
            );

            process.exit(1);
          }

          try {

            // Läser Ollamas JSON-svar.
            const data =
              JSON.parse(
                responseBody
              );

            // Hämtar själva AI-svaret.
            let answer =
              data.message?.content ||
              "";

            // Kontrollerar att AI:n faktiskt
            // skickade tillbaka något.
            if (!answer.trim()) {
              console.error(
                "Ollama skickade ett tomt svar."
              );

              process.exit(1);
            }

            // Tar bort eventuella <think>-block
            // om modellen trots allt skickar sådana.
            answer =
              answer.replace(
                /<think>[\s\S]*?<\/think>/gi,
                ""
              );

            // Letar efter början på den riktiga
            // QA-analysen.
            const startIndex =
              answer.indexOf(
                "1. Vad fungerar bra"
              );

            // Tar bort eventuell text som modellen
            // skrev innan själva QA-analysen.
            if (startIndex !== -1) {
              answer =
                answer
                  .slice(startIndex)
                  .trim();
            }

            // Skriver endast ut det färdiga AI-svaret.
            console.log(answer);

          } catch (error) {

            console.error(
              `Kunde inte läsa Ollama-svaret: ${error}`
            );

            process.exit(1);
          }
        }
      );
    }
  );

// Hanterar anslutningsfel.
request.on(
  "error",
  (error) => {

    console.error(
      `Ollama-fel: ${error.message}`
    );

    process.exit(1);
  }
);

// Hanterar timeout.
request.on(
  "timeout",
  () => {

    console.error(
      "Ollama timeout efter 180 sekunder."
    );

    request.destroy();

    process.exit(1);
  }
);

// Skickar prompten till Ollama.
request.write(body);

request.end();