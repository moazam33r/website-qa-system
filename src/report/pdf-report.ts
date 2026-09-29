// PDF-rapport för Website QA System.
//
// Den här filen ansvarar för att skapa professionella PDF-rapporter
// baserat på resultaten från QA-systemet.

// PDFKit används för att skapa PDF-filer.
import PDFDocument from "pdfkit";

// fs används för att skapa och kontrollera filer.
import fs from "fs";

// path används för att skapa säkra filsökvägar.
import path from "path";

// os används för att hitta operativsystemets temporära mapp.
import os from "os";

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

// Räknar hur många PASS, WARNING och FAIL
// som finns i QA-resultaten.
function getResultCounts(
    results: QACheckResult[]
) {

    return {

        // Antal kontroller som klarade testet.
        pass: results.filter(
            (result) =>
                result.status === "PASS"
        ).length,

        // Antal kontroller med varning.
        warning: results.filter(
            (result) =>
                result.status === "WARNING"
        ).length,

        // Antal kontroller som misslyckades.
        fail: results.filter(
            (result) =>
                result.status === "FAIL"
        ).length,
    };
}


// Bestämmer den övergripande statusen
// för hela QA-rapporten.
function getOverallStatus(
    results: QACheckResult[]
): "PASS" | "WARNING" | "FAIL" {

    // Hämtar antalet resultat per status.
    const counts =
        getResultCounts(results);

    // Ett enda FAIL gör att rapporten blir FAIL.
    if (counts.fail > 0) {
        return "FAIL";
    }

    // Om inga FAIL finns men WARNING finns
    // blir rapportens status WARNING.
    if (counts.warning > 0) {
        return "WARNING";
    }

    // Om allt klarade sig blir resultatet PASS.
    return "PASS";
}


// ==========================================
// STATUSINSTÄLLNINGAR
// ==========================================

// Returnerar färg för aktuell status.
function getStatusColor(
    status: string
): string {

    // Grön används för PASS.
    if (status === "PASS") {
        return "#198754";
    }

    // Orange används för WARNING.
    if (status === "WARNING") {
        return "#d97706";
    }

    // Röd används för FAIL.
    return "#dc3545";
}


// Returnerar en ljus bakgrundsfärg
// för aktuell status.
function getStatusBackground(
    status: string
): string {

    // Ljusgrön bakgrund för PASS.
    if (status === "PASS") {
        return "#eaf7ef";
    }

    // Ljusorange bakgrund för WARNING.
    if (status === "WARNING") {
        return "#fff4e5";
    }

    // Ljus röd bakgrund för FAIL.
    return "#fdecec";
}


// ==========================================
// PDF-HJÄLPFUNKTIONER
// ==========================================

// Lägger till en sidfot med sidnummer.
function addFooter(
    document: PDFKit.PDFDocument,
    pageNumber: number
): void {

    // Beräknar positionen för sidfoten.
    const currentY =
        document.page.height - 35;

    // Skapar en tunn linje ovanför sidfoten.
    document
        .strokeColor("#d9dee3")
        .lineWidth(0.5)
        .moveTo(
            50,
            currentY - 8
        )
        .lineTo(
            document.page.width - 50,
            currentY - 8
        )
        .stroke();

    // Skriver projektets namn.
    document
        .fillColor("#6c757d")
        .fontSize(8)
        .text(
            "Website QA System",
            50,
            currentY,
            {
                width: 250,
                align: "left",
            }
        );

    // Skriver det aktuella sidnumret.
    document
        .fillColor("#6c757d")
        .fontSize(8)
        .text(
            `Sida ${pageNumber}`,
            document.page.width - 150,
            currentY,
            {
                width: 100,
                align: "right",
            }
        );

    // Återställer färgen till svart.
    document.fillColor("#212529");
}


// Lägger till en professionell header.
function addReportHeader(
    document: PDFKit.PDFDocument,
    websiteUrl: string,
    reportTitle: string
): void {

    // Skapar en mörk header högst upp på sidan.
    document
        .rect(
            0,
            0,
            document.page.width,
            95
        )
        .fill("#17202a");

    // Projektets namn.
    document
        .fillColor("#ffffff")
        .fontSize(20)
        .text(
            "Website QA System",
            50,
            28
        );

    // Typ av rapport.
    document
        .fillColor("#d9e2ec")
        .fontSize(10)
        .text(
            reportTitle,
            50,
            55
        );

    // Webbplatsens URL.
    document
        .fillColor("#d9e2ec")
        .fontSize(9)
        .text(
            websiteUrl,
            50,
            72,
            {
                width:
                    document.page.width - 100,
            }
        );

    // Återställer textfärgen.
    document.fillColor("#212529");

    // Börjar innehållet under headern.
    document.y = 120;
}


// Lägger till en sektionsrubrik.
function addSectionTitle(
    document: PDFKit.PDFDocument,
    title: string
): void {

    // Kontrollerar om det finns tillräckligt med plats.
    if (
        document.y >
        document.page.height - 120
    ) {
        document.addPage();
    }

    // Skriver rubriken.
    document
        .fillColor("#17202a")
        .fontSize(15)
        .font("Helvetica-Bold")
        .text(title);

    // Skapar en linje under rubriken.
    const lineY =
        document.y + 5;

    document
        .strokeColor("#d9dee3")
        .lineWidth(1)
        .moveTo(
            50,
            lineY
        )
        .lineTo(
            document.page.width - 50,
            lineY
        )
        .stroke();

    // Lägger till mellanrum efter rubriken.
    document.moveDown(0.8);

    // Återställer fonten.
    document.font("Helvetica");
}


// Lägger till ett statuskort.
function addStatusCard(
    document: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    value: number,
    status: string
): void {

    // Hämtar färg för aktuell status.
    const color =
        getStatusColor(status);

    // Hämtar ljus bakgrund.
    const background =
        getStatusBackground(status);

    // Skapar kortets bakgrund.
    document
        .roundedRect(
            x,
            y,
            width,
            height,
            8
        )
        .fill(background);

    // Skapar färgad kant på vänster sida.
    document
        .roundedRect(
            x,
            y,
            6,
            height,
            3
        )
        .fill(color);

    // Skriver kortets label.
    document
        .fillColor("#6c757d")
        .fontSize(9)
        .font("Helvetica")
        .text(
            label,
            x + 18,
            y + 14
        );

    // Skriver antal.
    document
        .fillColor(color)
        .fontSize(22)
        .font("Helvetica-Bold")
        .text(
            String(value),
            x + 18,
            y + 31
        );

    // Återställer fonten.
    document.font("Helvetica");
}


// Lägger till en ruta för övergripande status.
function addOverallStatusCard(
    document: PDFKit.PDFDocument,
    status: string
): void {

    // Hämtar statusfärg.
    const color =
        getStatusColor(status);

    // Hämtar bakgrundsfärg.
    const background =
        getStatusBackground(status);

    // Sparar aktuell position.
    const startY =
        document.y;

    // Skapar statuskortet.
    document
        .roundedRect(
            50,
            startY,
            document.page.width - 100,
            58,
            8
        )
        .fill(background);

    // Statusetikett.
    document
        .fillColor("#6c757d")
        .fontSize(9)
        .font("Helvetica")
        .text(
            "ÖVERGRIPANDE RESULTAT",
            68,
            startY + 12
        );

    // Själva statusen.
    document
        .fillColor(color)
        .fontSize(19)
        .font("Helvetica-Bold")
        .text(
            status,
            68,
            startY + 28
        );

    // Återställer fonten.
    document.font("Helvetica");

    // Flyttar ner efter kortet.
    document.y =
        startY + 75;
}


// Lägger till information om webbplatsen.
function addWebsiteInformation(
    document: PDFKit.PDFDocument,
    websiteUrl: string
): void {

    // Hämtar aktuellt datum och tid.
    const date =
        new Date().toLocaleString(
            "sv-SE"
        );

    // Sparar aktuell position.
    const startY =
        document.y;

    // Skapar informationsruta.
    document
        .roundedRect(
            50,
            startY,
            document.page.width - 100,
            70,
            8
        )
        .fill("#f7f9fb");

    // Rubrik.
    document
        .fillColor("#495057")
        .fontSize(9)
        .font("Helvetica-Bold")
        .text(
            "TESTAD WEBBPLATS",
            65,
            startY + 13
        );

    // URL.
    document
        .fillColor("#212529")
        .fontSize(10)
        .font("Helvetica")
        .text(
            websiteUrl,
            65,
            startY + 28,
            {
                width:
                    document.page.width - 130,
            }
        );

    // Datum.
    document
        .fillColor("#6c757d")
        .fontSize(8)
        .text(
            `Rapport skapad: ${date}`,
            65,
            startY + 47
        );

    // Flyttar ner efter informationsrutan.
    document.y =
        startY + 90;
}


// ==========================================
// QA-KONTROLLER
// ==========================================

// Skriver ut alla QA-resultat på ett tydligt sätt.
//
// Viktig ändring:
// Kortets höjd räknas nu automatiskt utifrån textens
// faktiska höjd. Det gör att långa WARNING/FAIL-meddelanden
// får en större ruta istället för att texten klipps.
function addQAResults(
    document: PDFKit.PDFDocument,
    results: QACheckResult[]
): void {

    // Går igenom alla QA-kontroller.
    for (
        const result of results
    ) {

        // Bredden på hela resultatkortet.
        const cardWidth =
            document.page.width - 100;

        // Bredden som används för meddelandet.
        const messageWidth =
            document.page.width - 190;

        // Bestämmer textens höjd innan vi ritar rutan.
        let messageHeight = 0;

        if (result.message) {

            // Samma font och storlek som används
            // när meddelandet faktiskt skrivs.
            document
                .font("Helvetica")
                .fontSize(8);

            // Räknar ut hur hög texten kommer att bli.
            messageHeight =
                document.heightOfString(
                    result.message,
                    {
                        width: messageWidth,
                        lineGap: 2,
                    }
                );
        }

        // Grundhöjd för rubriken.
        const titleHeight =
            20;

        // Extra marginal runt meddelandet.
        const messagePadding =
            result.message
                ? 18
                : 0;

        // Minsta höjd för ett resultatkort.
        const cardHeight =
            Math.max(
                result.message
                    ? titleHeight +
                      messageHeight +
                      messagePadding
                    : 35,
                35
            );

        // Kontrollerar om hela kortet får plats
        // innan vi börjar rita det.
        if (
            document.y +
            cardHeight >
            document.page.height - 60
        ) {

            // Skapar en ny sida om det behövs.
            document.addPage();

            // Skriver en liten fortsättningsrubrik.
            document
                .fillColor("#17202a")
                .fontSize(11)
                .font("Helvetica-Bold")
                .text(
                    "QA-kontroller – fortsättning"
                );

            // Lägger lite luft under rubriken.
            document.moveDown();

            // Återställer fonten innan nästa beräkning.
            document.font("Helvetica");
        }

        // Sparar aktuell Y-position efter eventuell ny sida.
        const startY =
            document.y;

        // Hämtar färg för status.
        const color =
            getStatusColor(
                result.status
            );

        // Hämtar bakgrund för status.
        const background =
            getStatusBackground(
                result.status
            );

        // Skapar resultatkortets bakgrund.
        document
            .roundedRect(
                50,
                startY,
                cardWidth,
                cardHeight,
                6
            )
            .fill(background);

        // Skriver status.
        document
            .fillColor(color)
            .fontSize(8)
            .font("Helvetica-Bold")
            .text(
                result.status,
                65,
                startY + 10,
                {
                    width: 65,
                }
            );

        // Skriver kontrollens namn.
        document
            .fillColor("#212529")
            .fontSize(10)
            .font("Helvetica-Bold")
            .text(
                result.name,
                125,
                startY + 9,
                {
                    width:
                        document.page.width - 190,
                }
            );

        // Skriver meddelandet om det finns.
        if (result.message) {

            document
                .fillColor("#495057")
                .fontSize(8)
                .font("Helvetica")
                .text(
                    result.message,
                    125,
                    startY + titleHeight,
                    {
                        width:
                            messageWidth,
                        lineGap: 2,
                    }
                );
        }

        // Flyttar ner efter resultatkortet.
        document.y =
            startY +
            cardHeight +
            8;
    }
}


// ==========================================
// AI-ANALYS
// ==========================================

// Lägger till AI-analysen i PDF-rapporten.
//
// Även AI-rutan anpassas automatiskt efter textens höjd.
function addAIAnalysis(
    document: PDFKit.PDFDocument,
    aiAnalysis: string
): void {

    // AI-analysen får en egen sida.
    document.addPage();

    // Skriver rubriken.
    addSectionTitle(
        document,
        "AI-analys"
    );

    // Förklarar vad AI-analysen är.
    document
        .fillColor("#6c757d")
        .fontSize(9)
        .font("Helvetica")
        .text(
            "Automatiserad analys av QA-resultaten "
            + "genererad av projektets lokala AI-modell."
        );

    document.moveDown();

    // Bredden som används för AI-texten.
    const textWidth =
        document.page.width - 130;

    // Använder samma fontinställningar
    // som när AI-texten skrivs.
    document
        .font("Helvetica")
        .fontSize(9);

    // Räknar ut AI-textens faktiska höjd.
    const textHeight =
        document.heightOfString(
            aiAnalysis,
            {
                width: textWidth,
                lineGap: 4,
            }
        );

    // Skapar extra luft runt texten.
    const paddingTop =
        12;

    const paddingBottom =
        16;

    // Räknar ut exakt höjd för AI-rutan.
    const boxHeight =
        textHeight +
        paddingTop +
        paddingBottom;

    // Sparar aktuell position.
    const startY =
        document.y;

    // Skapar bakgrund för AI-analysen.
    document
        .roundedRect(
            50,
            startY,
            document.page.width - 100,
            boxHeight,
            8
        )
        .fill("#f7f9fb");

    // Skriver AI-analysen.
    document
        .fillColor("#212529")
        .fontSize(9)
        .font("Helvetica")
        .text(
            aiAnalysis,
            65,
            startY + paddingTop,
            {
                width: textWidth,
                lineGap: 4,
            }
        );

    // Flyttar dokumentets position efter AI-rutan.
    document.y =
        startY +
        boxHeight +
        15;
}


// ==========================================
// VANLIG PDF-RAPPORT
// ==========================================

export async function createPDFReport(
    data: PDFReportData
): Promise<string> {

    // Använder operativsystemets temporära mapp.
    // API:t använder redan denna sökväg.
    const reportsDirectory =
        path.join(
            os.tmpdir(),
            "website-qa-system"
        );

    // Skapar mappen om den inte finns.
    if (!fs.existsSync(reportsDirectory)) {

        fs.mkdirSync(
            reportsDirectory,
            {
                recursive: true,
            }
        );
    }

    // Standardnamn om hostname inte kan läsas.
    let hostname =
        "website";

    try {

        // Hämtar hostname från URL:en.
        hostname =
            new URL(
                data.websiteUrl
            ).hostname;

    } catch {
        // Behåller standardnamnet.
    }

    // Skapar PDF-filens sökväg.
    const filePath =
        path.join(
            reportsDirectory,
            `QA-Report-${hostname}.pdf`
        );

    // Skapar PDF-dokumentet.
    const document =
        new PDFDocument({
            margin: 50,

            // Gör sidorna tillgängliga
            // när sidfötterna ska läggas till.
            bufferPages: true,
        });

    // Skapar filströmmen.
    const stream =
        fs.createWriteStream(
            filePath
        );

    // Kopplar PDF-dokumentet till filen.
    document.pipe(stream);


    // ==========================================
    // FÖRSTASIDA
    // ==========================================

    // Lägger till rapportens header.
    addReportHeader(
        document,
        data.websiteUrl,
        "Automatiserad QA-rapport"
    );

    // Lägger till webbplatsinformation.
    addWebsiteInformation(
        document,
        data.websiteUrl
    );


    // Hämtar statistik.
    const counts =
        getResultCounts(
            data.results
        );

    // Hämtar övergripande status.
    const overallStatus =
        getOverallStatus(
            data.results
        );


    // Sammanfattningssektion.
    addSectionTitle(
        document,
        "Sammanfattning"
    );

    // Övergripande status.
    addOverallStatusCard(
        document,
        overallStatus
    );


    // Bredd på statuskorten.
    const cardWidth =
        150;

    // Avstånd mellan statuskorten.
    const cardGap =
        17;

    // Y-position för korten.
    const cardsY =
        document.y;


    // PASS-kort.
    addStatusCard(
        document,
        50,
        cardsY,
        cardWidth,
        70,
        "PASS",
        counts.pass,
        "PASS"
    );

    // WARNING-kort.
    addStatusCard(
        document,
        50 +
            cardWidth +
            cardGap,
        cardsY,
        cardWidth,
        70,
        "WARNING",
        counts.warning,
        "WARNING"
    );

    // FAIL-kort.
    addStatusCard(
        document,
        50 +
            (cardWidth + cardGap) * 2,
        cardsY,
        cardWidth,
        70,
        "FAIL",
        counts.fail,
        "FAIL"
    );

    // Flyttar ner efter korten.
    document.y =
        cardsY + 90;


    // QA-kontroller.
    addSectionTitle(
        document,
        "QA-kontroller"
    );

    // Skriver ut alla QA-resultat.
    addQAResults(
        document,
        data.results
    );


    // AI-analys om den finns.
    if (data.aiAnalysis) {

        addAIAnalysis(
            document,
            data.aiAnalysis
        );
    }


    // ==========================================
    // SIDFÖTTER
    // ==========================================

    // Hämtar PDF-sidorna.
    const pages =
        document.bufferedPageRange();

    // Går igenom alla sidor.
    for (
        let index = 0;
        index < pages.count;
        index++
    ) {

        // Hoppar till aktuell sida.
        document.switchToPage(
            pages.start + index
        );

        // Lägger till sidfot.
        addFooter(
            document,
            index + 1
        );
    }


    // Avslutar PDF-dokumentet.
    document.end();


    // Väntar tills PDF-filen är färdigskriven.
    await new Promise<void>(
        (
            resolve,
            reject
        ) => {

            // Körs när filen är färdig.
            stream.on(
                "finish",
                () => resolve()
            );

            // Hanterar skrivfel.
            stream.on(
                "error",
                (error) =>
                    reject(error)
            );
        }
    );


    // Returnerar sökvägen till PDF-filen.
    return filePath;
}


// ==========================================
// SAMMANSTÄLLD CSV-PDF
// ==========================================

export async function createCSVPDFReport(
    reports: CSVPDFReportItem[]
): Promise<string> {

    // Använder operativsystemets temporära mapp.
    const reportsDirectory =
        path.join(
            os.tmpdir(),
            "website-qa-system"
        );

    // Skapar mappen om den inte finns.
    if (!fs.existsSync(reportsDirectory)) {

        fs.mkdirSync(
            reportsDirectory,
            {
                recursive: true,
            }
        );
    }

    // Skapar en unik tidsstämpel.
    const timestamp =
        new Date()
            .toISOString()
            .replace(
                /[:.]/g,
                "-"
            );

    // Skapar sökvägen till CSV-PDF:en.
    const filePath =
        path.join(
            reportsDirectory,
            `QA-Report-CSV-${timestamp}.pdf`
        );

    // Skapar PDF-dokumentet.
    const document =
        new PDFDocument({
            margin: 50,
            bufferPages: true,
        });

    // Skapar filströmmen.
    const stream =
        fs.createWriteStream(
            filePath
        );

    // Kopplar dokumentet till filen.
    document.pipe(stream);


    // ==========================================
    // FÖRSTASIDA
    // ==========================================

    // Header för CSV-rapporten.
    addReportHeader(
        document,
        "CSV-import",
        "Sammanställd QA-rapport"
    );


    // Räknar lyckade webbplatser.
    const completed =
        reports.filter(
            (report) =>
                report.success
        ).length;

    // Räknar misslyckade webbplatser.
    const failed =
        reports.filter(
            (report) =>
                !report.success
        ).length;


    // Översiktssektion.
    addSectionTitle(
        document,
        "Översikt"
    );


    // Sparar positionen för översiktsrutan.
    const overviewY =
        document.y;

    // Skapar översiktsruta.
    document
        .roundedRect(
            50,
            overviewY,
            document.page.width - 100,
            90,
            8
        )
        .fill("#f7f9fb");


    // Antal webbplatser.
    document
        .fillColor("#212529")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text(
            "Antal webbplatser",
            70,
            overviewY + 17
        );

    document
        .fillColor("#17202a")
        .fontSize(20)
        .text(
            String(reports.length),
            70,
            overviewY + 34
        );


    // Antal klara.
    document
        .fillColor("#198754")
        .fontSize(9)
        .font("Helvetica-Bold")
        .text(
            "Klara",
            230,
            overviewY + 17
        );

    document
        .fontSize(18)
        .text(
            String(completed),
            230,
            overviewY + 34
        );


    // Antal misslyckade.
    document
        .fillColor("#dc3545")
        .fontSize(9)
        .text(
            "Misslyckade",
            350,
            overviewY + 17
        );

    document
        .fontSize(18)
        .text(
            String(failed),
            350,
            overviewY + 34
        );


    // Datum.
    document
        .fillColor("#6c757d")
        .fontSize(8)
        .font("Helvetica")
        .text(
            `Rapport skapad: ${
                new Date().toLocaleString(
                    "sv-SE"
                )
            }`,
            70,
            overviewY + 65
        );


    // Flyttar ner efter översiktsrutan.
    document.y =
        overviewY + 110;


    // ==========================================
    // RESULTAT PER WEBBPLATS
    // ==========================================

    addSectionTitle(
        document,
        "Resultat per webbplats"
    );


    // Går igenom alla webbplatser.
    for (
        const report of reports
    ) {

        // Hanterar misslyckad skanning.
        if (!report.success) {

            // Texten som ska visas i felrutan.
            const errorText =
                `Fel: ${
                    report.error ??
                    "Okänt fel"
                }`;

            // Räknar ut höjden på feltexten.
            document
                .font("Helvetica")
                .fontSize(8);

            const errorTextHeight =
                document.heightOfString(
                    errorText,
                    {
                        width:
                            document.page.width - 175,
                    }
                );

            // Dynamisk höjd för felrutan.
            const errorCardHeight =
                Math.max(
                    60,
                    errorTextHeight + 42
                );

            // Kontrollerar om rutan får plats.
            if (
                document.y +
                errorCardHeight >
                document.page.height - 60
            ) {
                document.addPage();

                addSectionTitle(
                    document,
                    "Resultat per webbplats – fortsättning"
                );
            }

            // Sparar positionen.
            const startY =
                document.y;

            // Skapar FAIL-kort.
            document
                .roundedRect(
                    50,
                    startY,
                    document.page.width - 100,
                    errorCardHeight,
                    7
                )
                .fill("#fdecec");

            // Skriver FAIL-status.
            document
                .fillColor("#dc3545")
                .fontSize(10)
                .font("Helvetica-Bold")
                .text(
                    "FAIL",
                    65,
                    startY + 12
                );

            // Skriver URL.
            document
                .fillColor("#212529")
                .fontSize(9)
                .font("Helvetica")
                .text(
                    report.websiteUrl,
                    110,
                    startY + 12,
                    {
                        width:
                            document.page.width - 175,
                    }
                );

            // Skriver felmeddelande.
            document
                .fillColor("#6c757d")
                .fontSize(8)
                .text(
                    errorText,
                    110,
                    startY + 29,
                    {
                        width:
                            document.page.width - 175,
                    }
                );

            // Flyttar ner efter den dynamiska rutan.
            document.y =
                startY +
                errorCardHeight +
                10;

            continue;
        }


        // Hämtar statistik.
        const counts =
            getResultCounts(
                report.results
            );

        // Hämtar övergripande status.
        const overallStatus =
            getOverallStatus(
                report.results
            );


        // Hämtar statusfärg.
        const statusColor =
            getStatusColor(
                overallStatus
            );

        // Hämtar statusbakgrund.
        const statusBackground =
            getStatusBackground(
                overallStatus
            );


        // Sparar positionen för webbplatskortet.
        const startY =
            document.y;

        // Skapar webbplatskort.
        document
            .roundedRect(
                50,
                startY,
                document.page.width - 100,
                82,
                7
            )
            .fill(statusBackground);


        // Skriver status.
        document
            .fillColor(statusColor)
            .fontSize(9)
            .font("Helvetica-Bold")
            .text(
                overallStatus,
                65,
                startY + 13
            );


        // Skriver URL.
        document
            .fillColor("#212529")
            .fontSize(10)
            .font("Helvetica-Bold")
            .text(
                report.websiteUrl,
                135,
                startY + 12,
                {
                    width:
                        document.page.width - 200,
                }
            );


        // PASS-resultat.
        document
            .fillColor("#198754")
            .fontSize(8)
            .font("Helvetica")
            .text(
                `PASS: ${counts.pass}`,
                135,
                startY + 32
            );


        // WARNING-resultat.
        document
            .fillColor("#d97706")
            .text(
                `WARNING: ${counts.warning}`,
                220,
                startY + 32
            );


        // FAIL-resultat.
        document
            .fillColor("#dc3545")
            .text(
                `FAIL: ${counts.fail}`,
                330,
                startY + 32
            );


        // Antal kontroller.
        document
            .fillColor("#6c757d")
            .fontSize(8)
            .text(
                `Antal kontroller: ${
                    report.results.length
                }`,
                135,
                startY + 51
            );


        // Flyttar ner efter webbplatskortet.
        document.y =
            startY + 92;
    }


    // ==========================================
    // DETALJERAD RAPPORT PER WEBBPLATS
    // ==========================================

    for (
        const report of reports
    ) {

        // Varje webbplats får en egen sida.
        document.addPage();


        // Lägger till header.
        addReportHeader(
            document,
            report.websiteUrl,
            "Detaljerad QA-rapport"
        );


        // Hanterar misslyckad skanning.
        if (!report.success) {

            addSectionTitle(
                document,
                "Skanningen misslyckades"
            );

            // Texten som ska visas.
            const errorText =
                report.error ??
                "Okänt fel";

            // Räknar ut textens höjd.
            document
                .font("Helvetica")
                .fontSize(9);

            const errorTextHeight =
                document.heightOfString(
                    errorText,
                    {
                        width:
                            document.page.width - 136,
                    }
                );

            // Dynamisk höjd för felrutan.
            const errorBoxHeight =
                Math.max(
                    75,
                    errorTextHeight + 55
                );

            // Sparar positionen.
            const startY =
                document.y;

            // Skapar felruta.
            document
                .roundedRect(
                    50,
                    startY,
                    document.page.width - 100,
                    errorBoxHeight,
                    8
                )
                .fill("#fdecec");

            // Skriver FAIL.
            document
                .fillColor("#dc3545")
                .fontSize(12)
                .font("Helvetica-Bold")
                .text(
                    "FAIL",
                    68,
                    startY + 15
                );

            // Skriver felmeddelandet.
            document
                .fillColor("#495057")
                .fontSize(9)
                .font("Helvetica")
                .text(
                    errorText,
                    68,
                    startY + 35,
                    {
                        width:
                            document.page.width - 136,
                    }
                );

            continue;
        }


        // Hämtar statistik.
        const counts =
            getResultCounts(
                report.results
            );

        // Hämtar övergripande status.
        const overallStatus =
            getOverallStatus(
                report.results
            );


        // Sammanfattning.
        addSectionTitle(
            document,
            "Sammanfattning"
        );

        // Övergripande status.
        addOverallStatusCard(
            document,
            overallStatus
        );


        // Position för statuskorten.
        const detailCardsY =
            document.y;


        // PASS.
        addStatusCard(
            document,
            50,
            detailCardsY,
            150,
            70,
            "PASS",
            counts.pass,
            "PASS"
        );


        // WARNING.
        addStatusCard(
            document,
            217,
            detailCardsY,
            150,
            70,
            "WARNING",
            counts.warning,
            "WARNING"
        );


        // FAIL.
        addStatusCard(
            document,
            384,
            detailCardsY,
            150,
            70,
            "FAIL",
            counts.fail,
            "FAIL"
        );


        // Flyttar ner efter korten.
        document.y =
            detailCardsY + 90;


        // QA-kontroller.
        addSectionTitle(
            document,
            "QA-kontroller"
        );

        // Skriver alla QA-resultat.
        addQAResults(
            document,
            report.results
        );


        // AI-analys.
        if (report.aiAnalysis) {

            addAIAnalysis(
                document,
                report.aiAnalysis
            );
        }
    }


    // ==========================================
    // SIDFÖTTER
    // ==========================================

    // Hämtar alla PDF-sidor.
    const pages =
        document.bufferedPageRange();

    // Lägger till sidfot på alla sidor.
    for (
        let index = 0;
        index < pages.count;
        index++
    ) {

        // Hoppar till aktuell sida.
        document.switchToPage(
            pages.start + index
        );

        // Lägger till professionell sidfot.
        addFooter(
            document,
            index + 1
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

            // Lyckad skrivning.
            stream.on(
                "finish",
                () => resolve()
            );

            // Fel under skrivningen.
            stream.on(
                "error",
                (error) =>
                    reject(error)
            );
        }
    );


    // Returnerar PDF-filens sökväg.
    return filePath;
}