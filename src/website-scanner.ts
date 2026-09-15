import { Page } from "@playwright/test";

export async function scanWebsite(page: Page, url: string) {
  const response = await page.goto(url);

  const status = response?.status() ?? 0;
  const title = await page.title();

  const links = await page.locator("a[href]").evaluateAll((elements) =>
    elements
      .map((element) => (element as HTMLAnchorElement).href)
      .filter((href) => href.startsWith(window.location.origin))
  );

  const uniqueLinks = [...new Set(links)];

  console.log("Website:", url);
  console.log("Status:", status);
  console.log("Title:", title);
  console.log("Internal links:", uniqueLinks.length);
  console.log("\nPages found:");
  uniqueLinks.forEach((link) => {
  console.log("-", link);
});

  return {
    url,
    status,
    title,
    links: uniqueLinks,
  };
}