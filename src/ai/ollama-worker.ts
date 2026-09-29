// Separat Node-process för AI-anropet.
// Den körs utanför Playwright-processen.
//
// Syftet är att isolera Ollama från Playwright
// och göra AI-anropet mer stabilt.

import http from "http";
import https from "https";

// Hämtar Ollama-inställningarna från .env.
import {
  getOllamaUrl,
  OLLAMA_MODEL,
  OLLAMA_TIMEOUT_MS,
} from "./ollama-config";

// Väljer rätt HTTP-klient beroende på om Ollama använder
// http:// eller https://.
const ollamaUrl = getOllamaUrl("/api/chat");

const httpClient =
  ollamaUrl.protocol === "https:"
    ? https
    : http;

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

// Kontrollerar först att Ollama-servern svarar.
// Detta gör att vi kan ge ett tydligare felmeddelande
// om Ollama inte är igång på datorn.
function checkOllamaConnection(): Promise<void> {
  return new Promise((resolve, reject) => {
    const tagsUrl =
      getOllamaUrl("/api/tags");

    const client =
      tagsUrl.protocol === "https:"
        ? https
        : http;

    const request =
      client.get(
        tagsUrl,
        (response) => {

          // Vi behöver inte läsa hela svaret.
          response.resume();

          // Status 200 betyder att Ollama svarar.
          if (response.statusCode === 200) {
            resolve();
            return;
          }

          reject(
            new Error(
              `Ollama svarade med HTTP ${response.statusCode}.`
            )
          );
        }
      );

    // Hanterar anslutningsfel.
    request.on(
      "error",
      () => {
        reject(
          new Error(
            `Kunde inte ansluta till Ollama på ${tagsUrl.origin}. ` +
            "Kontrollera att Ollama är installerat och körs."
          )
        );
      }
    );

    // Stoppar kontrollen om Ollama inte svarar.
    request.setTimeout(
      OLLAMA_TIMEOUT_MS,
      () => {
        request.destroy();

        reject(
          new Error(
            "Timeout när Ollama-servern kontrollerades."
          )
        );
      }
    );
  });
}

// Kontrollerar att den modell som är konfigurerad
// faktiskt finns installerad i Ollama.
function checkOllamaModel(): Promise<void> {
  return new Promise((resolve, reject) => {
    const tagsUrl =
      getOllamaUrl("/api/tags");

    const client =
      tagsUrl.protocol === "https:"
        ? https
        : http;

    const request =
      client.get(
        tagsUrl,
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

              // Ollama måste svara med HTTP 200.
              if (response.statusCode !== 200) {
                reject(
                  new Error(
                    `Kunde inte läsa Ollamas modeller. ` +
                    `HTTP ${response.statusCode}.`
                  )
                );

                return;
              }

              try {

                // Läser listan över installerade modeller.
                const data =
                  JSON.parse(responseBody);

                const installedModels =
                  Array.isArray(data.models)
                    ? data.models.map(
                        (model: { name?: string }) =>
                          model.name
                      )
                    : [];

                // Om användaren har angett en modell
                // med exakt version, exempelvis qwen3:4b,
                // kräver vi exakt den modellen.
                //
                // Om endast modellnamnet anges, exempelvis qwen3,
                // accepterar vi en installerad variant av modellen.
                const modelIsInstalled =
                  OLLAMA_MODEL.includes(":")
                    ? installedModels.includes(
                        OLLAMA_MODEL
                      )
                    : installedModels.some(
                        (model: string | undefined) =>
                          model?.split(":")[0] ===
                          OLLAMA_MODEL
                      );

                // Stoppar om modellen saknas.
                if (!modelIsInstalled) {
                  reject(
                    new Error(
                      `Modellen "${OLLAMA_MODEL}" är inte installerad. ` +
                      `Kör: ollama pull ${OLLAMA_MODEL}`
                    )
                  );

                  return;
                }

                // Modellen finns.
                resolve();

              } catch (error) {

                reject(
                  new Error(
                    `Kunde inte läsa Ollamas modellsvar: ${error}`
                  )
                );
              }
            }
          );
        }
      );

    // Hanterar anslutningsfel.
    request.on(
      "error",
      (error) => {
        reject(
          new Error(
            `Kunde inte kontrollera Ollamas modell: ${error.message}`
          )
        );
      }
    );

    // Stoppar kontrollen om Ollama inte svarar.
    request.setTimeout(
      OLLAMA_TIMEOUT_MS,
      () => {
        request.destroy();

        reject(
          new Error(
            "Timeout när Ollamas modell kontrollerades."
          )
        );
      }
    );
  });
}

// Skapar JSON-datan som skickas till Ollama.
const body = JSON.stringify({

  // Använder modellen från .env.
  // Standardvärdet är qwen3:4b.
  model: OLLAMA_MODEL,

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

// Kör först kontrollerna av Ollama och modellen.
// Därefter skickas själva QA-analysen.
async function run(): Promise<void> {

  try {

    // Kontrollerar att Ollama-servern är tillgänglig.
    await checkOllamaConnection();

    // Kontrollerar att rätt modell finns installerad.
    await checkOllamaModel();

    // Skickar sedan QA-prompten till Ollama.
    const request =
      httpClient.request(
        {
          // Använder host och port från .env.
          hostname:
            ollamaUrl.hostname,

          // Använder porten från .env-adressen.
          port:
            ollamaUrl.port
              ? Number(ollamaUrl.port)
              : ollamaUrl.protocol === "https:"
                ? 443
                : 80,

          // Skickar till Ollamas chat-endpoint.
          path:
            `${ollamaUrl.pathname}${ollamaUrl.search}`,

          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "Content-Length":
              Buffer.byteLength(body),
          },

          // Använder timeout från .env.
          timeout:
            OLLAMA_TIMEOUT_MS,
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

    // Hanterar anslutningsfel under själva AI-anropet.
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
          `Ollama timeout efter ${OLLAMA_TIMEOUT_MS} ms.`
        );

        request.destroy();

        process.exit(1);
      }
    );

    // Skickar prompten till Ollama.
    request.write(body);

    // Avslutar HTTP-anropet.
    request.end();

  } catch (error) {

    // Skriver ut ett tydligt fel om Ollama
    // eller modellen inte är tillgänglig.
    console.error(
      `Ollama kunde inte startas: ${
        error instanceof Error
          ? error.message
          : error
      }`
    );

    process.exit(1);
  }
}

// Startar Ollama-anropet.
run();