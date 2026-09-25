import { test, expect } from "@playwright/test";
import { checkSecurity } from "../src/checks/security";

// Testar att HTTPS kontrolleras korrekt.
test("HTTPS security kontroll", async () => {

  // Testar en URL som använder HTTPS.
  const httpsResult = await checkSecurity(
    "https://example.com"
  );

  // HTTPS ska ge PASS.
  expect(httpsResult.https).toBe(true);
  expect(httpsResult.status).toBe("PASS");
  expect(httpsResult.message).toBe(
    "Webbplatsen använder HTTPS"
  );

  // Testar en URL som använder HTTP.
  const httpResult = await checkSecurity(
    "http://example.com"
  );

  // HTTP ska ge FAIL.
  expect(httpResult.https).toBe(false);
  expect(httpResult.status).toBe("FAIL");
  expect(httpResult.message).toBe(
    "Webbplatsen använder inte HTTPS"
  );
});