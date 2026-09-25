// Testar att AI:n kan analysera QA-resultat.
// Vi använder några exempelresultat innan vi kopplar in den riktiga skanningen.

import { analyzeQAResults } from "./qa-analyzer";
import { QACheckResult } from "../report/qa-report";

// Skapar exempel på resultat från QA-systemet.
const testResults: QACheckResult[] = [
  {
    name: "HTTPS",
    status: "PASS",
    message: "Webbplatsen använder HTTPS",
  },
  {
    name: "Telefonvalidering",
    status: "WARNING",
    message: "Ogiltigt telefonnummer accepterades",
  },
  {
    name: "Brutna länkar",
    status: "FAIL",
    message: "En intern länk fungerar inte",
  },
  {
    name: "Mobil PageSpeed",
    status: "WARNING",
    message: "PageSpeed-resultat: 83/100",
  },
];

// Kör AI-analysen och skriver ut resultatet.
async function main() {
  const analysis = await analyzeQAResults(testResults);

  console.log("\n--- AI-ANALYS AV QA-RESULTAT ---");
  console.log(analysis);
}

main().catch((error) => {
  console.error("QA-analysen misslyckades:", error);
});