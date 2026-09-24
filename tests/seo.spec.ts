import { test, expect } from "@playwright/test";
import { checkSEO } from "../src/checks/seo";

test("SEO-kontroll", async ({ page }) => {

  const result = await checkSEO(
    page,
    ["https://digitalkontakt.se"]
  );

console.log("\nSEO TEST RESULTS");
console.log("Passed:", result.passed.length);
console.log("Errors:", result.failed.length);

  expect(result).toBeDefined();
});