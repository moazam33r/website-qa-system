// Koppling till Ollama via en separat Node-process.
// AI-anropet körs i ollama-worker.ts utanför Playwright-processen.
//
// Detta gör kommunikationen med den lokala AI-modellen
// mer stabil när QA-systemet körs från Playwright.

import {
  spawn,
} from "child_process";

import {
  resolve,
} from "path";

// Anropar Ollama genom en separat Node-process.
export async function askOllama(
  prompt: string
): Promise<string> {

  // Sökväg till worker-filen.
  const workerPath =
    resolve(
      __dirname,
      "ollama-worker.ts"
    );

  // Hämtar tsx CLI direkt från projektets node_modules.
  // Det är samma motor som används när vi kör "npx tsx".
  const tsxCli =
    resolve(
      process.cwd(),
      "node_modules",
      "tsx",
      "dist",
      "cli.mjs"
    );

  return new Promise(
    (resolvePromise, reject) => {

      // Startar worker-processen.
      const worker =
        spawn(
          process.execPath,
          [
            tsxCli,
            workerPath,
            prompt,
          ],
          {
            stdio: [
              "ignore",
              "pipe",
              "pipe",
            ],

            // Förhindrar att ett extra terminalfönster
            // öppnas när systemet körs i Windows.
            windowsHide: true,
          }
        );

      let output = "";
      let errorOutput = "";

      // Tar emot AI-svaret från worker-processen.
      worker.stdout.on(
        "data",
        (data) => {
          output +=
            data.toString();
        }
      );

      // Samlar eventuella fel från worker-processen.
      worker.stderr.on(
        "data",
        (data) => {
          errorOutput +=
            data.toString();
        }
      );

      // När worker-processen avslutas.
      worker.on(
        "close",
        (code) => {

          // Om worker-processen misslyckades
          // skickas felet vidare till QA-systemet.
          if (code !== 0) {

            reject(
              new Error(
                errorOutput.trim() ||
                `Ollama worker avslutades med kod ${code}`
              )
            );

            return;
          }

          // Hämtar AI-svaret.
          const result =
            output.trim();

          // Kontrollerar att ett svar faktiskt kom tillbaka.
          if (!result) {

            reject(
              new Error(
                "Ollama worker skickade ett tomt svar."
              )
            );

            return;
          }

          // Returnerar AI-svaret till QA-systemet.
          resolvePromise(
            result
          );
        }
      );

      // Hanterar om worker-processen inte kan startas.
      worker.on(
        "error",
        (error) => {
          reject(error);
        }
      );
    }
  );
}