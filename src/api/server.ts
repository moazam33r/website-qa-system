// Importerar Express för att skapa vårt API.
import express from "express";

// Importerar Chromium från Playwright.
import { chromium } from "@playwright/test";

// Importerar vår befintliga QA-motor.
// Denna funktion gör själva webbplatsgranskningen.
import { scanWebsite } from "../website-scanner";


// Skapar Express-applikationen.
const app = express();


// Anger vilken port API-servern ska använda.
const PORT = 3000;


// Gör så att API:t kan ta emot JSON-data.
app.use(express.json());


// Test-endpoint.
// Används för att kontrollera att API-servern fungerar.
app.get("/api/health", (_req, res) => {

  // Skickar tillbaka ett enkelt svar.
  res.json({
    status: "ok",
    message: "Website QA System API fungerar.",
  });
});


// Endpoint för att skanna en webbplats.
//
// Exempel:
// POST /api/scan
//
// Body:
// {
//   "url": "https://digitalkontakt.se"
// }
app.post("/api/scan", async (req, res) => {

  // Hämtar URL från requestens JSON-body.
  const { url } = req.body;


  // Kontrollerar att en URL skickades.
  if (!url || typeof url !== "string") {

    return res.status(400).json({
      error: "En giltig URL måste anges.",
    });
  }


  // Tar bort eventuella mellanslag runt URL:en.
  const websiteUrl = url.trim();


  // Kontrollerar att URL:en börjar med http eller https.
  if (!/^https?:\/\//i.test(websiteUrl)) {

    return res.status(400).json({
      error: "URL måste börja med http:// eller https://",
    });
  }


  // Variabler för browser och page.
  // De stängs senare även om något går fel.
  let browser;
  let page;


  try {

    console.log("\n========================================");
    console.log("          API QA SCANNING");
    console.log("========================================");

    console.log(`\nTestar: ${websiteUrl}`);


    // Startar Chromium.
    browser = await chromium.launch();


    // Skapar en ny Playwright-sida.
    page = await browser.newPage();


    // Kör vårt befintliga QA-system.
    //
    // Alla kontroller och AI-analys sker fortfarande
    // inne i scanWebsite().
    const result = await scanWebsite(
      page,
      websiteUrl
    );


    // Returnerar resultatet som JSON.
    return res.status(200).json(result);


  } catch (error) {

    // Skriver ut felet i serverns terminal.
    console.error(
      `\nQA-skanningen misslyckades för ${websiteUrl}`
    );

    console.error(error);


    // Returnerar ett tydligt fel till klienten.
    return res.status(500).json({
      error: "QA-skanningen kunde inte genomföras.",
      message:
        error instanceof Error
          ? error.message
          : String(error),
    });


  } finally {

    // Stänger sidan om den skapades.
    if (page) {
      await page.close();
    }


    // Stänger browsern om den startades.
    if (browser) {
      await browser.close();
    }

  }
});


// Startar API-servern.
app.listen(PORT, () => {

  console.log("\n========================================");
  console.log("       WEBSITE QA SYSTEM API");
  console.log("========================================");

  console.log(
    `\nAPI-server körs på http://localhost:${PORT}`
  );

  console.log(
    `Health check: http://localhost:${PORT}/api/health`
  );

  console.log(
    `Scan endpoint: POST http://localhost:${PORT}/api/scan`
  );

});