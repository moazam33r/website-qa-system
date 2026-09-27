// Separat Node-process för AI-anropet.
// Den körs utanför Playwright-processen.
//
// Syftet är att isolera Ollama från Playwright
// och göra AI-anropet mer stabilt.

import http from "http";

// Läser prompten från kommandoraden.
const prompt =
  process.argv.slice(2).join(" ");

if (!prompt) {
  console.error(
    "Ingen prompt skickades till Ollama."
  );

  process.exit(1);
}

// Skapar JSON-datan som skickas till Ollama.
const body = JSON.stringify({
  model: "qwen3:4b",

  messages: [
    {
      role: "user",
      content: prompt,
    },
  ],

  // Vi vill ha hela svaret på en gång.
  stream: false,

  // Qwen3 behöver inte använda sitt
  // längre thinking-läge för denna QA-analys.
  think: false,

  // Begränsar hur långt AI-svaret får bli.
  options: {
    num_predict: 500,
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
      // om modellen fortfarande behöver tid.
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
            const answer =
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

            // Skriver endast ut AI-svaret.
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