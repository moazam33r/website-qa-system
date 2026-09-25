import { test, expect } from "@playwright/test";
import { checkPerformance } from "../src/checks/performance";

// Testar att PageSpeed-kontrollen returnerar ett korrekt resultat.
test("PageSpeed prestandatest", async () => {

  // Använder en enkel webbplats som testmål.
  const result = await checkPerformance(
    "https://example.com"
  );

  // Kontrollerar att ett resultat returneras.
  expect(result).toBeDefined();

  // Kontrollerar att desktop-resultatet finns.
  // Om PageSpeed API:t inte kan köras blir värdet null.
  if (result.desktop) {
    expect(result.desktop.score).toBeGreaterThanOrEqual(0);
    expect(result.desktop.score).toBeLessThanOrEqual(100);
  }

  // Kontrollerar att mobile-resultatet finns.
  // Om PageSpeed API:t inte kan köras blir värdet null.
  if (result.mobile) {
    expect(result.mobile.score).toBeGreaterThanOrEqual(0);
    expect(result.mobile.score).toBeLessThanOrEqual(100);
  }

  // Kontrollerar att totalstatusen är en giltig QA-status.
  expect([
    "PASS",
    "WARNING",
    "FAIL",
  ]).toContain(result.status);
});