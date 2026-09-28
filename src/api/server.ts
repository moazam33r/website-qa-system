// Website QA System API-server.

// Express används för att skapa API-servern.
import express from "express";

// Chromium används för att köra Playwright-skanningarna.
import { chromium } from "@playwright/test";

// fs används för att kontrollera PDF-filer.
import fs from "fs";

// path används för säkra filsökvägar.
import path from "path";

// os används för att hitta operativsystemets temporära mapp.
import os from "os";

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


// =========================================================
// JSON
// =========================================================

// Tillåter JSON-data från extensionen.
app.use(express.json());


// =========================================================
// CORS
// =========================================================

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


// =========================================================
// HEALTH CHECK
// =========================================================

app.get(
    "/api/health",
    (_req, res) => {

        res.json({
            status: "ok",
            message: "Website QA System API fungerar.",
        });
    }
);


// =========================================================
// VANLIG WEBBPLATSSKANNING
// =========================================================

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


// =========================================================
// CSV-SKANNING
// =========================================================

// Den befintliga CSV-endpointen lämnas kvar.
//
// Detta är viktigt eftersom den redan fungerar.
// Vi ändrar därför inte denna endpoint när vi
// bygger den nya progresslösningen.

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


// =========================================================
// CSV-SKANNING MED RIKTIG PROGRESS
// =========================================================
//
// Detta är en NY endpoint.
//
// Den befintliga /api/scan-csv lämnas helt orörd.
//
// Den nya endpointen skickar progress till popupen
// medan CSV-skanningen pågår.
//
// Själva webbplatsskanningen använder 0–90%.
//
// De sista 10% används för PDF och slutförande.
//

app.post(
    "/api/scan-csv-progress",
    async (req, res) => {

        const { urls } = req.body;


        // Kontrollerar att urls är en array.
        if (!Array.isArray(urls)) {

            return res.status(400).json({
                error: "urls måste vara en array.",
            });
        }


        // Kontrollerar att minst en URL finns.
        if (urls.length === 0) {

            return res.status(400).json({
                error:
                    "Minst en URL måste anges.",
            });
        }


        // Kontrollerar alla URL:er innan skanningen börjar.
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


        // -------------------------------------------------
        // STREAMING-SVAR
        // -------------------------------------------------
        //
        // Popupen kan läsa dessa meddelanden
        // direkt medan backend arbetar.
        //
        // Vi använder text/event-stream eftersom servern
        // kan skicka flera uppdateringar under samma request.
        //

        res.status(200);

        res.setHeader(
            "Content-Type",
            "text/event-stream"
        );

        res.setHeader(
            "Cache-Control",
            "no-cache"
        );

        res.setHeader(
            "Connection",
            "keep-alive"
        );

        // Tvingar ut headers direkt.
        res.flushHeaders();


        // Hjälpfunktion för att skicka progress
        // när en webbplats är färdig.
        const sendProgress = (
            completed: number,
            total: number,
            websiteUrl: string
        ) => {

            // Räknar progress baserat på färdiga webbplatser.
            //
            // Vi använder maximalt 90% för själva
            // webbplatsskanningen.
            //
            // Exempel med 50 webbplatser:
            //
            // 1/50  = 2%
            // 25/50 = 45%
            // 50/50 = 90%

            const percentage =
                Math.round(
                    (completed / total) * 90
                );


            // Skickar progress som ett event.
            res.write(
                `event: progress\n` +
                `data: ${JSON.stringify({
                    completed,
                    total,
                    percentage,
                    websiteUrl,
                })}\n\n`
            );
        };


        // -------------------------------------------------
        // NY FUNKTION: WEBBPLATS STARTAR
        // -------------------------------------------------
        //
        // Denna funktion skickar ett event direkt när
        // en ny webbplats börjar analyseras.
        //
        // Detta gör att extensionen inte behöver vänta
        // tills hela webbplatsen är färdig för att visa
        // att analysen faktiskt har startat.
        //

        const sendWebsiteStart = (
            completed: number,
            total: number,
            websiteUrl: string
        ) => {

            // Räknar ut en startprogress.
            //
            // Första webbplatsen får 2% så att popupen
            // inte står kvar på 0% medan analysen pågår.
            //
            // För senare webbplatser används den progress
            // som motsvarar antalet redan färdiga webbplatser.

            const percentage =
                completed === 0
                    ? 2
                    : Math.round(
                        (completed / total) * 90
                    );


            // Skickar information till extensionen.
            res.write(
                `event: website-start\n` +
                `data: ${JSON.stringify({
                    completed,
                    total,
                    percentage,
                    websiteUrl,
                })}\n\n`
            );
        };


        // Hjälpfunktion för att skicka slutresultatet.
        const sendComplete = (
            data: unknown
        ) => {

            res.write(
                `event: complete\n` +
                `data: ${JSON.stringify(data)}\n\n`
            );

            // Avslutar streamen.
            res.end();
        };


        // Samlar resultaten från alla webbplatser.
        const results: CSVPDFReportItem[] = [];


        // Startar EN Chromium-browser för hela CSV-skanningen.
        const browser =
            await chromium.launch();


        try {

            // Meddelar popupen att analysen börjar.
            res.write(
                `event: started\n` +
                `data: ${JSON.stringify({
                    total: urls.length,
                })}\n\n`
            );


            // Räknare för färdiga webbplatser.
            let completedCount = 0;


            // Skannar webbplatserna en efter en.
            for (const url of urls) {

                const websiteUrl =
                    url.trim();


                console.log(
                    `CSV QA-skanning med progress: ${websiteUrl}`
                );


                // -------------------------------------------------
                // NYTT: MEDDELA ATT WEBBPLATSEN STARTAR
                // -------------------------------------------------
                //
                // Detta skickas innan scanWebsite körs.
                //
                // Popupen kan därför direkt visa:
                //
                // ⟳ 1 digitalkontakt.se Analyserar...
                //
                // istället för att stå på 0%.
                //

                sendWebsiteStart(
                    completedCount,
                    urls.length,
                    websiteUrl
                );


                const page =
                    await browser.newPage();


                try {

                    // Kör hela QA-systemet.
                    const result =
                        await scanWebsite(
                            page,
                            websiteUrl
                        );


                    // Sparar lyckat resultat.
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

                    // Stänger sidan efter webbplatsen.
                    await page.close();


                    // Ökar antalet färdiga webbplatser.
                    completedCount++;


                    // Skickar den riktiga progressen
                    // när webbplatsen faktiskt är klar.
                    sendProgress(
                        completedCount,
                        urls.length,
                        websiteUrl
                    );
                }
            }


            // ==========================================
            // EN GEMENSAM PDF
            // ==========================================

            // När alla webbplatser är färdiga
            // skapas den gemensamma PDF-rapporten.

            const pdfPath =
                await createCSVPDFReport(
                    results
                );


            // PDF-rapporten är nu skapad.
            //
            // 95% betyder att alla webbplatser är färdiga
            // och PDF-filen är skapad.
            //
            // Popupen visar 100% först när complete-eventet
            // kommer.

            res.write(
                `event: pdf\n` +
                `data: ${JSON.stringify({
                    percentage: 95,
                    message:
                        "PDF-rapporten är skapad..."
                })}\n\n`
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


            // Skickar slutresultatet till popupen.
            sendComplete({

                total: urls.length,

                completed,

                failed,

                results,

                pdfPath,

                pdfUrl,
            });


        } catch (error) {

            console.error(
                "CSV progress-skanning misslyckades:",
                error
            );


            // Skickar ett riktigt fel till popupen.
            res.write(
                `event: error\n` +
                `data: ${JSON.stringify({
                    error:
                        "CSV-skanningen kunde inte genomföras.",
                    message:
                        error instanceof Error
                            ? error.message
                            : String(error),
                })}\n\n`
            );


            // Avslutar streamen.
            res.end();


        } finally {

            // Stänger Chromium efter hela CSV-skanningen.
            await browser.close();
        }
    }
);


// =========================================================
// HÄMTA PDF
// =========================================================

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


        // PDF-filerna hämtas från operativsystemets
        // temporära mapp.

        const reportsDirectory =
            path.join(
                os.tmpdir(),
                "website-qa-system"
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


// =========================================================
// STARTA SERVERN
// =========================================================

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
            `CSV progress endpoint: http://localhost:${PORT}/api/scan-csv-progress`
        );

        console.log(
            `PDF endpoint: http://localhost:${PORT}/api/reports/:filename`
        );
    }
);