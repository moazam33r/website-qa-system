import { test, expect } from "@playwright/test";
import { scanWebsite } from "../src/website-scanner";

test("Website scanner", async ({ page }) => {
  const url = process.env.TARGET_URL || "https://example.com";

  const result = await scanWebsite(page, url);

  expect(result.status).toBe(200);
  expect(result.title).not.toBe("");
});