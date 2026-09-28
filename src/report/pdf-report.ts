// PDF-rapport för Website QA System.

// PDFKit används för att skapa PDF-filer.
import PDFDocument from "pdfkit";

// fs används för att skapa och kontrollera filer.
import fs from "fs";

// path används för att skapa säkra filsökvägar.
import path from "path";

// Importerar typen för QA-resultat.
import { QACheckResult } from "./qa-report";


// ==========================================
// DATA FÖR EN VANLIG PDF
// ==========================================

export interface PDFReportData {

    // URL till webbplatsen som testades.
    websiteUrl: string;

    // Alla QA-resultat från skanningen.
    results: QACheckResult[];

    // Valfri AI-analys.
    aiAnalysis?: string;
}


// ==========================================
// DATA FÖR EN CSV-WEBBPLATS
// ==========================================

export interface CSVPDFReportItem {

    // Visar om skanningen lyckades.
    success: boolean;

    // URL till webbplatsen.
    websiteUrl: string;

    // QA-resultat för webbplatsen.
    results: QACheckResult[];

    // Valfritt felmeddelande.
    error?: string;

    // Valfri AI-analys.
    aiAnalysis?: string;
}


// ==========================================
// HJÄLPFUNKTIONER
// ==========================================

// Räknar PASS, WARNING och FAIL.
function getResultCounts(
    results: QACheckResult[]
) {

    return {

        pass: results.filter(
            (result) =>
                result.status === "PASS"
        ).length,

        warning: results.filter(
            (result) =>
                result.status === "WARNING"
        ).length,

        fail: results.filter(
            (result) =>
                result.status === "FAIL"
        ).length,
    };
}


// Bestämmer den övergripande statusen.
function getOverallStatus(
    results: QACheckResult[]
): string {

    const counts =
        getResultCounts(results);


    if (counts.fail > 0) {
        return "FAIL";
    }


    if (counts.warning > 0) {
        return "WARNING";
    }


    return "PASS";
}


// ==========================================
// VANLIG PDF-RAPPORT
// ==========================================

export async function createPDFReport(
    data: PDFReportData
): Promise<string> {

    // Skapar reports-mappen om den inte finns.
    const reportsDirectory =
        path.join(
            process.cwd(),
            "reports"
        );


    if (!fs.existsSync(reportsDirectory)) {

        fs.mkdirSync(
            reportsDirectory,
            {
                recursive: true,
            }
        );
    }


    // Hämtar webbplatsens hostname.
    let hostname = "website";


    try {

        hostname =
            new URL(
                data.websiteUrl
            ).hostname;

    } catch {
        // Använder "website" om URL:en inte kan läsas.
    }


    // Skapar filnamnet.
    const filePath =
        path.join(
            reportsDirectory,
            `QA-Report-${hostname}.pdf`
        );


    // Skapar PDF-dokumentet.
    const document =
        new PDFDocument({
            margin: 50,
        });


    // Skapar filströmmen.
    const stream =
        fs.createWriteStream(
            filePath
        );


    // Kopplar PDF-dokumentet till filen.
    document.pipe(stream);


    // Titel.
    document
        .fontSize(20)
        .text(
            "Website QA System",
            {
                align: "center",
            }
        );


    document.moveDown();


    // Rapporttitel.
    document
        .fontSize(16)
        .text(
            "QA Report",
            {
                align: "center",
            }
        );


    document.moveDown(2);


    // Grundinformation.
    document
        .fontSize(11)
        .text(
            `URL: ${data.websiteUrl}`
        );


    document.text(
        `Datum: ${new Date().toLocaleString("sv-SE")}`
    );


    document.moveDown();


    // Räknar resultat.
    const counts =
        getResultCounts(
            data.results
        );


    const overallStatus =
        getOverallStatus(
            data.results
        );


    // Sammanfattning.
    document
        .fontSize(14)
        .text(
            "Sammanfattning"
        );


    document.moveDown(0.5);


    document
        .fontSize(11)
        .text(
            `Status: ${overallStatus}`
        );


    document.text(
        `PASS: ${counts.pass}`
    );


    document.text(
        `WARNING: ${counts.warning}`
    );


    document.text(
        `FAIL: ${counts.fail}`
    );


    document.moveDown();


    // Alla QA-resultat.
    document
        .fontSize(14)
        .text(
            "QA-kontroller"
        );


    document.moveDown();


    for (
        const result of data.results
    ) {

        document
            .fontSize(11)
            .text(
                `${result.status} - ${result.name}`
            );


        if (result.message) {

            document
                .fontSize(9)
                .text(
                    result.message,
                    {
                        indent: 15,
                    }
                );
        }


        document.moveDown(0.5);
    }


    // AI-analys om den finns.
    if (data.aiAnalysis) {

        document.addPage();


        document
            .fontSize(16)
            .text(
                "AI-analys"
            );


        document.moveDown();


        document
            .fontSize(10)
            .text(
                data.aiAnalysis
            );
    }


    // Avslutar PDF-filen.
    document.end();


    // Väntar tills PDF-filen är färdigskriven.
    await new Promise<void>(
        (
            resolve,
            reject
        ) => {

            stream.on(
                "finish",
                () => resolve()
            );


            stream.on(
                "error",
                (error) =>
                    reject(error)
            );
        }
    );


    // Returnerar sökvägen.
    return filePath;
}


// ==========================================
// SAMMANSTÄLLD CSV-PDF
// ==========================================

export async function createCSVPDFReport(
    reports: CSVPDFReportItem[]
): Promise<string> {

    // Skapar reports-mappen om den saknas.
    const reportsDirectory =
        path.join(
            process.cwd(),
            "reports"
        );


    if (!fs.existsSync(reportsDirectory)) {

        fs.mkdirSync(
            reportsDirectory,
            {
                recursive: true,
            }
        );
    }


    // Skapar en unik fil för CSV-rapporten.
    const timestamp =
        new Date()
            .toISOString()
            .replace(
                /[:.]/g,
                "-"
            );


    const filePath =
        path.join(
            reportsDirectory,
            `QA-Report-CSV-${timestamp}.pdf`
        );


    // Skapar PDF-dokumentet.
    const document =
        new PDFDocument({
            margin: 50,
        });


    // Skapar filströmmen.
    const stream =
        fs.createWriteStream(
            filePath
        );


    document.pipe(stream);


    // ==========================================
    // TITEL
    // ==========================================

    document
        .fontSize(22)
        .text(
            "Website QA System",
            {
                align: "center",
            }
        );


    document.moveDown();


    document
        .fontSize(18)
        .text(
            "Sammanställd CSV QA-rapport",
            {
                align: "center",
            }
        );


    document.moveDown(2);


    // ==========================================
    // ÖVERSIKT
    // ==========================================

    const completed =
        reports.filter(
            (report) =>
                report.success
        ).length;


    const failed =
        reports.filter(
            (report) =>
                !report.success
        ).length;


    document
        .fontSize(14)
        .text(
            "Översikt"
        );


    document.moveDown(0.5);


    document
        .fontSize(11)
        .text(
            `Antal webbplatser: ${reports.length}`
        );


    document.text(
        `Klara: ${completed}`
    );


    document.text(
        `Misslyckade: ${failed}`
    );


    document.text(
        `Datum: ${new Date().toLocaleString("sv-SE")}`
    );


    document.moveDown(2);


    // ==========================================
    // SAMMANFATTNING PER WEBBPLATS
    // ==========================================

    document
        .fontSize(14)
        .text(
            "Resultat per webbplats"
        );


    document.moveDown();


    for (
        const report of reports
    ) {

        if (!report.success) {

            document
                .fontSize(10)
                .text(
                    `${report.websiteUrl} - FAIL`
                );


            document
                .fontSize(9)
                .text(
                    `Fel: ${report.error ?? "Okänt fel"}`,
                    {
                        indent: 15,
                    }
                );


            document.moveDown();


            continue;
        }


        const counts =
            getResultCounts(
                report.results
            );


        const overallStatus =
            getOverallStatus(
                report.results
            );


        document
            .fontSize(11)
            .text(
                report.websiteUrl
            );


        document
            .fontSize(10)
            .text(
                `Status: ${overallStatus}`,
                {
                    indent: 15,
                }
            );


        document.text(
            `PASS: ${counts.pass}`,
            {
                indent: 15,
            }
        );


        document.text(
            `WARNING: ${counts.warning}`,
            {
                indent: 15,
            }
        );


        document.text(
            `FAIL: ${counts.fail}`,
            {
                indent: 15,
            }
        );


        document.moveDown();
    }


    // ==========================================
    // DETALJERAD RAPPORT
    // ==========================================

    for (
        const report of reports
    ) {

        // Varje webbplats får en egen sida.
        document.addPage();


        document
            .fontSize(18)
            .text(
                "Detaljerad QA-rapport"
            );


        document.moveDown();


        document
            .fontSize(12)
            .text(
                `URL: ${report.websiteUrl}`
            );


        document.moveDown();


        // Om webbplatsen misslyckades.
        if (!report.success) {

            document
                .fontSize(12)
                .text(
                    "Skanningen misslyckades."
                );


            document.moveDown();


            document
                .fontSize(10)
                .text(
                    `Fel: ${report.error ?? "Okänt fel"}`
                );


            continue;
        }


        const counts =
            getResultCounts(
                report.results
            );


        const overallStatus =
            getOverallStatus(
                report.results
            );


        document
            .fontSize(12)
            .text(
                `Övergripande status: ${overallStatus}`
            );


        document.moveDown();


        document
            .fontSize(11)
            .text(
                "Sammanfattning"
            );


        document.text(
            `PASS: ${counts.pass}`
        );


        document.text(
            `WARNING: ${counts.warning}`
        );


        document.text(
            `FAIL: ${counts.fail}`
        );


        document.moveDown();


        // Alla QA-kontroller.
        document
            .fontSize(11)
            .text(
                "QA-kontroller"
            );


        document.moveDown(0.5);


        for (
            const result of report.results
        ) {

            document
                .fontSize(10)
                .text(
                    `${result.status} - ${result.name}`
                );


            if (result.message) {

                document
                    .fontSize(9)
                    .text(
                        result.message,
                        {
                            indent: 15,
                        }
                    );
            }


            document.moveDown(0.4);
        }


        // AI-analys.
        if (report.aiAnalysis) {

            document.moveDown();


            document
                .fontSize(12)
                .text(
                    "AI-analys"
                );


            document.moveDown(0.5);


            document
                .fontSize(9)
                .text(
                    report.aiAnalysis
                );
        }
    }


    // Avslutar PDF-filen.
    document.end();


    // Väntar tills PDF-filen är färdigskriven.
    await new Promise<void>(
        (
            resolve,
            reject
        ) => {

            stream.on(
                "finish",
                () => resolve()
            );


            stream.on(
                "error",
                (error) =>
                    reject(error)
            );
        }
    );


    // Returnerar sökvägen till EN gemensam PDF.
    return filePath;
}