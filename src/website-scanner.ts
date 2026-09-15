import { Page } from "@playwright/test";

export async function scanWebsite(page: Page, url: string) {
  const response = await page.goto(url);

  const status = response?.status() ?? 0;
  const title = await page.title();

  console.log("Website:", url);
  console.log("Status:", status);
  console.log("Title:", title);

  return {
    url,
    status,
    title,
  };
}