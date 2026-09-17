import readline from "readline";
import { chromium } from "@playwright/test";
import { scanWebsite } from "./website-scanner";

// Skapar terminalen där användaren skriver in URL
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Visar programmets start
console.log("\n========================================");
console.log("          WEBSITE QA SYSTEM");
console.log("========================================\n");

// Frågar efter webbplatsens URL
rl.question("Ange webbplats:\n> ", async (url) => {

  // Tar bort mellanslag
  const websiteUrl = url.trim();

  // Kontrollerar att en URL angavs
  if (!websiteUrl) {
    console.log("\nIngen URL angavs.");
    rl.close();
    return;
  }

  console.log("\n----------------------------------------");
  console.log("Startar QA-skanning...");
  console.log("----------------------------------------\n");

  try {

    // Startar webbläsaren
    const browser = await chromium.launch();

    // Skapar en ny sida
    const page = await browser.newPage();

    // Kör hela QA-systemet
    await scanWebsite(
      page,
      websiteUrl
    );

    // Stänger webbläsaren
    await browser.close();

  } catch (error) {

    // Visar fel om något går fel
    console.error("\nQA-skanningen kunde inte genomföras.");

    console.error(error);

  } finally {

    // Stänger terminalen
    rl.close();
  }
});