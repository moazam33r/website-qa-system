import { test, expect } from "@playwright/test";
import { scanWebsite } from "../src/website-scanner";

test("Website scanner", async ({ page }) => {

  test.setTimeout(180000);

  const url = process.env.TARGET_URL;

  if (!url) {
    throw new Error("TARGET_URL måste anges");
  }

  const result = await scanWebsite(page, url);

  expect(result.status).toBe(200);
  expect(result.title).not.toBe("");
});