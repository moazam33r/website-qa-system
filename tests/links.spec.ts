import { test, expect } from "@playwright/test";

import { checkPages } from "../src/checks/pages";
import { checkLinks } from "../src/checks/links";

test("Links check", async ({ page }) => {

  // Webbplatsen vi testar
  const url = "https://digitalkontakt.se/";

  // Hittar automatiskt webbplatsens interna sidor
  const pageResult = await checkPages(
    page,
    url
  );

  // Hämtar sidorna som hittades
  const pages = pageResult.links;

  // Kör länkkontrollen och sparar resultatet
  const result = await checkLinks(
    page,
    url,
    pages
  );

  // =======================================================
  // VANLIGA LÄNKRESULTAT
  // =======================================================

  // Kontrollerar att alla vanliga resultat finns
  expect(result).toHaveProperty("internalPassed");
  expect(result).toHaveProperty("internalFailed");
  expect(result).toHaveProperty("externalPassed");
  expect(result).toHaveProperty("externalFailed");

  // Kontrollerar att alla räknare är nummer
  expect(typeof result.internalPassed).toBe("number");
  expect(typeof result.internalFailed).toBe("number");
  expect(typeof result.externalPassed).toBe("number");
  expect(typeof result.externalFailed).toBe("number");

  // Kontrollerar att inga räknare kan vara negativa
  expect(result.internalPassed).toBeGreaterThanOrEqual(0);
  expect(result.internalFailed).toBeGreaterThanOrEqual(0);
  expect(result.externalPassed).toBeGreaterThanOrEqual(0);
  expect(result.externalFailed).toBeGreaterThanOrEqual(0);


  // =======================================================
  // LINK INTENT RESULTAT
  // =======================================================

  // Kontrollerar att den nya Link Intent-kontrollen
  // returnerar rätt resultat.
  expect(result).toHaveProperty("intentFailures");
  expect(result).toHaveProperty("intentFailed");

  // intentFailures ska vara en array.
  expect(
    Array.isArray(result.intentFailures)
  ).toBe(true);

  // intentFailed ska vara ett nummer.
  expect(
    typeof result.intentFailed
  ).toBe("number");

  // Antalet intent-fel ska aldrig vara negativt.
  expect(
    result.intentFailed
  ).toBeGreaterThanOrEqual(0);

  // Antalet rapporterade intent-fel ska stämma
  // överens med längden på arrayen.
  expect(
    result.intentFailed
  ).toBe(
    result.intentFailures.length
  );


  // =======================================================
  // TOTALA LÄNKAR
  // =======================================================

  // Räknar totalt antal länkar som kontrollerades.
  const totalLinks =
    result.internalPassed +
    result.internalFailed +
    result.externalPassed +
    result.externalFailed;

  // Minst en länk ska ha kontrollerats.
  expect(totalLinks).toBeGreaterThan(0);


  // =======================================================
  // LOGGAR LINK INTENT RESULTATET
  // =======================================================

  // Visar en tydlig sammanfattning i testresultatet.
  console.log(
    `\nLink Intent: ${result.intentFailed} möjliga felaktiga destinationer hittades.`
  );

  // Visar detaljer om någon länk verkar leda till fel sida.
  for (const failure of result.intentFailures) {

    console.log(
      `\n⚠ Link Intent Problem`
    );

    console.log(
      `Länktext: ${failure.linkText}`
    );

    console.log(
      `Förväntat: ${failure.expected}`
    );

    console.log(
      `Destination: ${failure.targetUrl}`
    );

    console.log(
      `Title: ${failure.targetTitle || "saknas"}`
    );

    console.log(
      `H1: ${failure.targetHeading || "saknas"}`
    );
  }
});