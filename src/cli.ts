import readline from "readline";
import { chromium } from "@playwright/test";

import { scanWebsite } from "./website-scanner";
import { importWebsitesFromCSV } from "./checks/csv-import";

const csvFile = process.argv[2];

async function runQA() {

  // Om en CSV-fil anges
  if (csvFile) {

    console.log("\n========================================");
    console.log("          WEBSITE QA SYSTEM");
    console.log("========================================");

    console.log(`\nCSV-fil: ${csvFile}`);

    try {

      const websites =
        importWebsitesFromCSV(csvFile);

      if (websites.length === 0) {
        console.log("\nIngen webbplats hittades i CSV-filen.");
        return;
      }

      const browser =
        await chromium.launch();

      for (const website of websites) {

        console.log("\n========================================");
        console.log(`TESTAR: ${website}`);
        console.log("========================================");

        const page =
          await browser.newPage();

        try {

          await scanWebsite(
            page,
            website
          );

        } catch (error) {

          console.error(
            `\nQA-test misslyckades för ${website}`
          );

          console.error(error);

        } finally {

          await page.close();
        }
      }

      await browser.close();

    } catch (error) {

      console.error(
        "\nCSV-skanningen kunde inte genomföras."
      );

      console.error(error);
    }

    return;
  }

  // Om ingen CSV-fil anges
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("\n========================================");
  console.log("          WEBSITE QA SYSTEM");
  console.log("========================================\n");

  rl.question(
    "Ange webbplats:\n> ",
    async (url) => {

      const websiteUrl =
        url.trim();

      if (!websiteUrl) {

        console.log(
          "\nIngen URL angavs."
        );

        rl.close();
        return;
      }

      console.log(
        "\n----------------------------------------"
      );

      console.log(
        "Startar QA-skanning..."
      );

      console.log(
        "----------------------------------------\n"
      );

      try {

        const browser =
          await chromium.launch();

        const page =
          await browser.newPage();

        await scanWebsite(
          page,
          websiteUrl
        );

        await browser.close();

      } catch (error) {

        console.error(
          "\nQA-skanningen kunde inte genomföras."
        );

        console.error(error);

      } finally {

        rl.close();
      }
    }
  );
}

runQA();