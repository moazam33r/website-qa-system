// Importerar Express för att skapa vårt API.
import express from "express";

// Importerar Chromium från Playwright.
import { chromium } from "@playwright/test";

// Importerar Node.js filsystem.
// Används för att kontrollera att PDF-filer finns.
import fs from "fs";

// Importerar path för att skapa säkra och korrekta
// sökvägar till våra PDF-rapporter.
import path from "path";

// Importerar vår befintliga QA-motor.
// Denna funktion genomför hela webbplatsgranskningen.
import { scanWebsite } from "../website-scanner";

// Importerar PDF-generatorn.
// Den skapar PDF-rapporten från QA-resultaten.
import { createPDFReport } from "../report/pdf-report";


// --------------------------------------------------
// EXPRESS
// --------------------------------------------------

// Skapar Express-applikationen.
const app = express();


// Anger vilken port API-servern ska använda.
const PORT = 3000;


// --------------------------------------------------
// JSON
// --------------------------------------------------

// Gör så att API:t kan ta emot JSON-data.
app.use(express.json());


// --------------------------------------------------
// CORS
// --------------------------------------------------

// Tillåter Chrome Extension att kommunicera med API:t.
app.use((req, res, next) => {

  // Tillåter anrop från andra origins.
  res.header(
    "Access-Control-Allow-Origin",
    "*"
  );

  // Tillåter de HTTP-metoder som API:t använder.
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );

  // Tillåter Content-Type i API-anrop.
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  // Chrome kan skicka ett OPTIONS-anrop
  // innan själva POST-anropet.
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  // Fortsätter till nästa middleware
  // eller endpoint.
  next();
});


// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

// Endpoint som används för att kontrollera
// att API-servern fungerar.
//
// GET /api/health

app.get("/api/health", (_req, res) => {

  // Skickar tillbaka ett enkelt JSON-svar.
  res.json({
    status: "ok",
    message: "Website QA System API fungerar.",
  });
});


// --------------------------------------------------
// EN WEBBPLATS
// --------------------------------------------------

// Endpoint för att skanna en webbplats.
//
// POST /api/scan
//
// Body:
//
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


  // Tar bort eventuella mellanslag
  // runt URL:en.
  const websiteUrl = url.trim();


  // Kontrollerar att URL:en börjar med
  // http:// eller https://.
  if (!/^https?:\/\//i.test(websiteUrl)) {

    return res.status(400).json({
      error:
        "URL måste börja med http:// eller https://",
    });
  }


  // Variabler för browser och page.
  //
  // De används även i finally-blocket
  // för att alltid stänga Playwright korrekt.
  let browser;
  let page;


  try {

    // Skriver information till serverns terminal.
    console.log("\n========================================");

    console.log(
      "          API QA SCANNING"
    );

    console.log("========================================");

    console.log(
      `\nTestar: ${websiteUrl}`
    );


    // Startar Chromium.
    browser = await chromium.launch();


    // Skapar en ny Playwright-sida.
    page = await browser.newPage();


    // Kör vårt befintliga QA-system.
    //
    // Här genomförs alla kontroller:
    // SEO, länkar, bilder, formulär,
    // responsivitet, prestanda, Google,
    // sociala medier, AI-analys osv.
    const result = await scanWebsite(
      page,
      websiteUrl
    );


    // Skapar PDF-rapporten från samma resultat
    // som används av QA-systemet.
    const pdfPath = await createPDFReport({

      // Webbplatsen som testades.
      websiteUrl: result.url,

      // Alla QA-resultat.
      results: result.results,

      // AI-analysen.
      aiAnalysis: result.aiAnalysis,
    });


    // Skriver information om PDF-filen
    // till serverns terminal.
    console.log(
      `\nPDF-rapport skapad: ${pdfPath}`
    );


    // Hämtar endast filnamnet från sökvägen.
    //
    // Exempel:
    //
    // C:\...\reports\QA-Report-digitalkontakt.se.pdf
    //
    // blir:
    //
    // QA-Report-digitalkontakt.se.pdf
    const pdfFilename =
      path.basename(pdfPath);


    // Skapar URL:en som Chrome Extension
    // senare kommer att använda för att
    // öppna PDF-rapporten.
    const pdfUrl =
      `http://localhost:${PORT}/api/reports/${encodeURIComponent(pdfFilename)}`;


    // Returnerar hela QA-resultatet tillsammans
    // med PDF-informationen.
    return res.status(200).json({

      // Behåller alla resultat från scanWebsite().
      ...result,

      // Behåller sökvägen på servern.
      pdfPath,

      // URL som klienten kan använda
      // för att öppna PDF-rapporten.
      pdfUrl,
    });


  } catch (error) {

    // Skriver ut felet i serverns terminal.
    console.error(
      `\nQA-skanningen misslyckades för ${websiteUrl}`
    );

    console.error(error);


    // Returnerar ett tydligt fel till klienten.
    return res.status(500).json({

      error:
        "QA-skanningen kunde inte genomföras.",

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


// --------------------------------------------------
// CSV / FLERA WEBBPLATSER
// --------------------------------------------------

// Endpoint för att skanna flera webbplatser.
//
// POST /api/scan-csv
//
// Body:
//
// {
//   "urls": [
//     "https://digitalkontakt.se",
//     "https://kallsvvs.se",
//     "https://abctakplat.se"
//   ]
// }

app.post("/api/scan-csv", async (req, res) => {

  // Hämtar URL-listan från requesten.
  const { urls } = req.body;


  // Kontrollerar att urls finns
  // och faktiskt är en array.
  if (!Array.isArray(urls)) {

    return res.status(400).json({
      error: "urls måste vara en array.",
    });
  }


  // Kontrollerar att minst en URL skickades.
  if (urls.length === 0) {

    return res.status(400).json({
      error: "Minst en URL måste anges.",
    });
  }


  // Kontrollerar att alla URL:er är strängar
  // och börjar med http:// eller https://.
  const invalidUrls = urls.filter(
    (url) =>
      typeof url !== "string" ||
      !/^https?:\/\//i.test(url.trim())
  );


  // Om någon URL är ogiltig
  // avbryter vi requesten.
  if (invalidUrls.length > 0) {

    return res.status(400).json({
      error: "En eller flera URL:er är ogiltiga.",
      invalidUrls,
    });
  }


  // Array där vi sparar resultaten
  // för alla webbplatser.
  const results = [];


  // Startar en gemensam Chromium-browser.
  //
  // Vi använder samma browser för alla webbplatser,
  // men skapar en ny page för varje webbplats.
  const browser = await chromium.launch();


  try {

    // Går igenom webbplatserna en efter en.
    for (const url of urls) {

      // Tar bort eventuella mellanslag.
      const websiteUrl = url.trim();


      // Skriver information till terminalen.
      console.log(
        "\n========================================"
      );

      console.log(
        `TESTAR VIA CSV API: ${websiteUrl}`
      );

      console.log(
        "========================================"
      );


      // Skapar en ny Playwright-sida.
      const page = await browser.newPage();


      try {

        // Kör samma QA-motor som används
        // av /api/scan.
        const result = await scanWebsite(
          page,
          websiteUrl
        );


        // Skapar PDF för webbplatsen.
        const pdfPath = await createPDFReport({

          // Webbplatsens URL.
          websiteUrl: result.url,

          // Alla QA-resultat.
          results: result.results,

          // AI-analysen.
          aiAnalysis: result.aiAnalysis,
        });


        // Hämtar endast PDF-filens namn.
        const pdfFilename =
          path.basename(pdfPath);


        // Skapar URL som kan användas
        // för att öppna PDF-filen.
        const pdfUrl =
          `http://localhost:${PORT}/api/reports/${encodeURIComponent(pdfFilename)}`;


        // Sparar resultatet för webbplatsen.
        results.push({

          // Visar att skanningen lyckades.
          success: true,

          // Alla resultat från QA-systemet.
          ...result,

          // Sökvägen till PDF-filen.
          pdfPath,

          // URL till PDF-filen.
          pdfUrl,
        });


      } catch (error) {

        // Om en webbplats misslyckas
        // fortsätter vi med nästa webbplats.
        results.push({

          // Visar att just denna skanning misslyckades.
          success: false,

          // URL:en som misslyckades.
          url: websiteUrl,

          // Felmeddelandet.
          error:
            error instanceof Error
              ? error.message
              : String(error),
        });


      } finally {

        // Stänger sidan innan nästa
        // webbplats testas.
        await page.close();
      }
    }


    // Returnerar alla resultat när
    // alla webbplatser är klara.
    return res.status(200).json({

      // Antal webbplatser som skickades in.
      total: urls.length,

      // Alla QA-resultat.
      results,
    });


  } catch (error) {

    // Hanterar fel som påverkar
    // hela CSV-skanningen.
    console.error(
      "\nCSV API-skanningen misslyckades."
    );

    console.error(error);


    return res.status(500).json({

      error:
        "CSV-skanningen kunde inte genomföras.",

      message:
        error instanceof Error
          ? error.message
          : String(error),
    });


  } finally {

    // Stänger Chromium när alla webbplatser
    // har behandlats.
    await browser.close();
  }
});


// --------------------------------------------------
// PDF-RAPPORT
// --------------------------------------------------

// Endpoint som låter Chrome Extension
// öppna en skapad PDF-rapport.
//
// Exempel:
//
// GET /api/reports/QA-Report-digitalkontakt.se.pdf

app.get(
  "/api/reports/:filename",
  (req, res) => {

    // Hämtar filnamnet från URL:en.
    const filename = req.params.filename;


    // Tillåter endast PDF-filer.
    if (
      !filename
        .toLowerCase()
        .endsWith(".pdf")
    ) {

      return res.status(400).json({
        error:
          "Endast PDF-filer kan hämtas.",
      });
    }


    // Säkerhetskontroll:
    //
    // Vi tillåter endast själva filnamnet.
    // Detta förhindrar att någon försöker
    // använda ../ för att komma åt andra filer.
    if (
      path.basename(filename) !== filename
    ) {

      return res.status(400).json({
        error:
          "Ogiltigt filnamn.",
      });
    }


    // Skapar sökvägen till vår PDF-mapp.
    const reportsDirectory =
      path.join(
        process.cwd(),
        "reports"
      );


    // Skapar den fullständiga sökvägen
    // till PDF-filen.
    const pdfPath =
      path.join(
        reportsDirectory,
        filename
      );


    // Kontrollerar att PDF-filen finns.
    if (!fs.existsSync(pdfPath)) {

      return res.status(404).json({
        error:
          "PDF-rapporten kunde inte hittas.",
      });
    }


    // Skickar PDF-filen till webbläsaren.
    return res.sendFile(pdfPath);
  }
);


// --------------------------------------------------
// STARTA API-SERVERN
// --------------------------------------------------

// Startar API-servern.
app.listen(PORT, () => {

  console.log(
    "\n========================================"
  );

  console.log(
    "       WEBSITE QA SYSTEM API"
  );

  console.log(
    "========================================"
  );

  console.log(
    `\nAPI-server körs på http://localhost:${PORT}`
  );

  console.log(
    `Health check: http://localhost:${PORT}/api/health`
  );

  console.log(
    `Scan endpoint: POST http://localhost:${PORT}/api/scan`
  );

  console.log(
    `CSV endpoint: POST http://localhost:${PORT}/api/scan-csv`
  );

  console.log(
    `PDF endpoint: GET http://localhost:${PORT}/api/reports/:filename`
  );
});