// Testar att Website QA System kan skapa en PDF-rapport.

import { test, expect } from "@playwright/test";

// Importerar PDF-generatorn.
import { createPDFReport } from "../src/report/pdf-report";

// Importerar Node.js filsystem.
import fs from "fs";


// Testar PDF-genereringen.
test("PDF report can be generated", async () => {

  // Skapar några testresultat.
  // Vi använder samma QACheckResult-struktur
  // som resten av systemet använder.
  const results = [
    {
      name: "Sidor",
      status: "PASS" as const,
      message: "12/12 sidor fungerar",
    },

    {
      name: "SEO",
      status: "WARNING" as const,
      message: "4 SEO-varningar hittades",
    },

    {
      name: "Länkar",
      status: "PASS" as const,
      message: "18 länkar fungerar",
    },

    {
      name: "Validation",
      status: "FAIL" as const,
      message: "2 telefonfält accepterar ogiltiga nummer",
    },
  ];


  // Skapar PDF-rapporten.
  const pdfPath = await createPDFReport({
    websiteUrl: "https://digitalkontakt.se",
    results,

    // Testar även att AI-analys kan inkluderas.
    aiAnalysis:
      "Test AI-analys. Webbplatsen fungerar bra men har några identifierade problem.",
  });


  // Kontrollerar att PDF-filen faktiskt finns.
  expect(fs.existsSync(pdfPath)).toBe(true);


  // Kontrollerar att filen inte är tom.
  const fileStats = fs.statSync(pdfPath);

  expect(fileStats.size).toBeGreaterThan(0);


  // Skriver ut var PDF-filen skapades.
  console.log(`PDF skapad: ${pdfPath}`);
});