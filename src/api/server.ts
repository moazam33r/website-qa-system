// Website QA System API-server.

// Express används för att skapa API-servern.
import express from "express";

// Chromium används för att köra Playwright-skanningarna.
import { chromium } from "@playwright/test";

// fs används för att kontrollera PDF-filer.
import fs from "fs";

// path används för säkra filsökvägar.
import path from "path";

// Importerar själva QA-systemets scanner.
import { scanWebsite } from "../website-scanner";

// Importerar funktionerna som skapar PDF-rapporter.
import {
    createPDFReport,
    createCSVPDFReport,
    CSVPDFReportItem,
} from "../report/pdf-report";


const app = express();

const PORT = 3000;


// Tillåter JSON-data från extensionen.
app.use(express.json());


// Tillåter Chrome Extension att kommunicera med API-servern.
app.use((req, res, next) => {

    res.header(
        "Access-Control-Allow-Origin",
        "*"
    );

    res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, OPTIONS"
    );

    res.header(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );


    // Hanterar CORS preflight-anrop.
    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }


    next();
});


// ==========================================
// HEALTH CHECK
// ==========================================

app.get(
    "/api/health",
    (_req, res) => {

        res.json({
            status: "ok",
            message: "Website QA System API fungerar.",
        });
    }
);


// ==========================================
// VANLIG WEBBPLATSSKANNING
// ==========================================

app.post(
    "/api/scan",
    async (req, res) => {

        const { url } = req.body;


        // Kontrollerar att URL finns.
        if (
            !url ||
            typeof url !== "string"
        ) {

            return res.status(400).json({
                error: "En giltig URL måste anges.",
            });
        }


        const websiteUrl = url.trim();


        // Kontrollerar URL-formatet.
        if (!/^https?:\/\//i.test(websiteUrl)) {

            return res.status(400).json({
                error:
                    "URL måste börja med http:// eller https://",
            });
        }


        let browser;
        let page;


        try {

            console.log(
                `Startar QA-skanning: ${websiteUrl}`
            );


            // Startar Chromium.
            browser = await chromium.launch();


            // Skapar en ny sida.
            page = await browser.newPage();


            // Kör hela QA-systemet.
            const result = await scanWebsite(
                page,
                websiteUrl
            );


            // Skapar PDF för en enskild webbplats.
            const pdfPath = await createPDFReport({

                websiteUrl: result.url,

                results: result.results,

                aiAnalysis: result.aiAnalysis,
            });


            const pdfFilename =
                path.basename(pdfPath);


            const pdfUrl =
                `http://localhost:${PORT}/api/reports/` +
                `${encodeURIComponent(pdfFilename)}`;


            // Returnerar resultatet till extensionen.
            return res.status(200).json({

                ...result,

                pdfPath,

                pdfUrl,
            });


        } catch (error) {

            console.error(
                "QA-skanning misslyckades:",
                error
            );


            return res.status(500).json({

                error:
                    "QA-skanningen kunde inte genomföras.",

                message:
                    error instanceof Error
                        ? error.message
                        : String(error),
            });


        } finally {

            // Stänger sidan.
            if (page) {
                await page.close();
            }


            // Stänger browsern.
            if (browser) {
                await browser.close();
            }
        }
    }
);


// ==========================================
// CSV-SKANNING
// ==========================================

app.post(
    "/api/scan-csv",
    async (req, res) => {

        const { urls } = req.body;


        // Kontrollerar att urls är en array.
        if (!Array.isArray(urls)) {

            return res.status(400).json({
                error: "urls måste vara en array.",
            });
        }


        // Kontrollerar att CSV-filen innehåller URL:er.
        if (urls.length === 0) {

            return res.status(400).json({
                error:
                    "Minst en URL måste anges.",
            });
        }


        // Kontrollerar alla URL:er.
        const invalidUrls =
            urls.filter(
                (url) =>
                    typeof url !== "string" ||
                    !/^https?:\/\//i.test(
                        url.trim()
                    )
            );


        if (invalidUrls.length > 0) {

            return res.status(400).json({

                error:
                    "En eller flera URL:er är ogiltiga.",

                invalidUrls,
            });
        }


        // Här samlar vi resultaten från alla webbplatser.
        const results: CSVPDFReportItem[] = [];


        // Startar EN Chromium-browser för hela CSV-skanningen.
        const browser =
            await chromium.launch();


        try {

            // Skannar varje webbplats i CSV-filen.
            for (const url of urls) {

                const websiteUrl =
                    url.trim();


                console.log(
                    `CSV QA-skanning: ${websiteUrl}`
                );


                const page =
                    await browser.newPage();


                try {

                    // Kör QA-systemet.
                    const result =
                        await scanWebsite(
                            page,
                            websiteUrl
                        );


                    // Sparar resultatet.
                    // Ingen separat PDF skapas här.
                    results.push({

                        success: true,

                        websiteUrl:
                            result.url,

                        results:
                            result.results,

                        aiAnalysis:
                            result.aiAnalysis,
                    });


                } catch (error) {

                    // Sparar även misslyckade webbplatser.
                    results.push({

                        success: false,

                        websiteUrl,

                        results: [],

                        error:
                            error instanceof Error
                                ? error.message
                                : String(error),
                    });


                } finally {

                    // Stänger sidan efter varje webbplats.
                    await page.close();
                }
            }


            // ==========================================
            // EN GEMENSAM PDF
            // ==========================================

            // Alla resultat skickas till EN PDF.
            const pdfPath =
                await createCSVPDFReport(
                    results
                );


            const pdfFilename =
                path.basename(pdfPath);


            const pdfUrl =
                `http://localhost:${PORT}/api/reports/` +
                `${encodeURIComponent(pdfFilename)}`;


            const completed =
                results.filter(
                    (result) =>
                        result.success
                ).length;


            const failed =
                results.filter(
                    (result) =>
                        !result.success
                ).length;


            // Returnerar alla resultat + EN PDF.
            return res.status(200).json({

                total: urls.length,

                completed,

                failed,

                results,

                pdfPath,

                pdfUrl,
            });


        } catch (error) {

            console.error(
                "CSV-skanning misslyckades:",
                error
            );


            return res.status(500).json({

                error:
                    "CSV-skanningen kunde inte genomföras.",

                message:
                    error instanceof Error
                        ? error.message
                        : String(error),
            });


        } finally {

            // Stänger Chromium efter hela CSV-skanningen.
            await browser.close();
        }
    }
);


// ==========================================
// HÄMTA PDF
// ==========================================

app.get(
    "/api/reports/:filename",
    (req, res) => {

        const filename =
            req.params.filename;


        // Endast PDF-filer får hämtas.
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


        // Förhindrar ogiltiga sökvägar.
        if (
            path.basename(filename) !== filename
        ) {

            return res.status(400).json({
                error:
                    "Ogiltigt filnamn.",
            });
        }


        const reportsDirectory =
            path.join(
                process.cwd(),
                "reports"
            );


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


        // Skickar PDF-filen till extensionen.
        return res.sendFile(pdfPath);
    }
);


// ==========================================
// STARTA SERVERN
// ==========================================

app.listen(
    PORT,
    () => {

        console.log(
            `API-server körs på http://localhost:${PORT}`
        );

        console.log(
            `Health check: http://localhost:${PORT}/api/health`
        );

        console.log(
            `Scan endpoint: http://localhost:${PORT}/api/scan`
        );

        console.log(
            `CSV endpoint: http://localhost:${PORT}/api/scan-csv`
        );

        console.log(
            `PDF endpoint: http://localhost:${PORT}/api/reports/:filename`
        );
    }
);