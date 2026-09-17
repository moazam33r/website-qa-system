// Skapar en tydlig QA-rapport från testresultaten

export type QAStatus = "PASS" | "WARNING" | "FAIL";

export interface QACheckResult {
  name: string;
  status: QAStatus;
  message: string;
}

// Skriver ut en komplett QA-rapport
export function printQAReport(
  url: string,
  results: QACheckResult[]
) {

  // Räknar antal resultat per status
  const passed = results.filter(
    (result) => result.status === "PASS"
  ).length;

  const warnings = results.filter(
    (result) => result.status === "WARNING"
  ).length;

  const failed = results.filter(
    (result) => result.status === "FAIL"
  ).length;

  console.log("\n");
  console.log("========================================");
  console.log("           WEBSITE QA REPORT");
  console.log("========================================");

  // Visar vilken webbplats som testades
  console.log("\n🌐 WEBBPLATS");
  console.log(`URL: ${url}`);

  console.log("\n----------------------------------------");
  console.log("RESULTAT");
  console.log("----------------------------------------");

  // Skriver ut varje QA-kontroll
  for (const result of results) {

    let symbol = "✓";

    if (result.status === "WARNING") {
      symbol = "⚠";
    }

    if (result.status === "FAIL") {
      symbol = "✗";
    }

    console.log(
      `${symbol} ${result.name}: ${result.message}`
    );
  }

  console.log("\n----------------------------------------");
  console.log("SAMMANFATTNING");
  console.log("----------------------------------------");

  console.log(`✓ PASS: ${passed}`);
  console.log(`⚠ WARNING: ${warnings}`);
  console.log(`✗ FAIL: ${failed}`);

  console.log("\n----------------------------------------");

  // Bestämmer det övergripande resultatet
  if (failed > 0) {

    console.log("RESULTAT: FAIL");

  } else if (warnings > 0) {

    console.log("RESULTAT: WARNING");

  } else {

    console.log("RESULTAT: PASS");
  }

  console.log("----------------------------------------");
  console.log("QA-skanning klar.");
  console.log("========================================\n");
}