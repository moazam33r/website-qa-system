import { test, expect } from "@playwright/test";
import { checkResponsive } from "../src/checks/responsive";

test("Responsive check", async ({ page }) => {

  test.setTimeout(180000);

  const url = process.env.TARGET_URL;

  if (!url) {
    throw new Error("TARGET_URL måste anges");
  }

  const pages = [url];

  const result = await checkResponsive(
    page,
    pages
  );

  expect(result.failed).toBe(0);
});