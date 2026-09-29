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

/**
 * Lägger till sidfot på den aktuella PDF-sidan.
 *
 * Viktigt:
 * Sidfoten måste ligga innanför PDFKit:s bottom margin.
 *
 * Tidigare placerades sidfoten för långt ner på sidan.
 * Det gjorde att PDFKit försökte skapa nya sidor.
 *
 * Sidfoten placeras nu på en säker position
 * ovanför PDFKit:s nedersta marginal.
 */
function addFooter(
    document: PDFKit.PDFDocument,
    pageNumber: number
): void {

    // Hämtar sidans höjd.
    const pageHeight =
        document.page.height;

    // Hämtar sidans bredd.
    const pageWidth =
        document.page.width;

    // PDF-dokumentet använder margin: 50.
    // Vi placerar därför sidfoten 65 punkter
    // från sidans nederkant.
    //
    // Detta håller texten inom PDFKit:s tillåtna
    // textområde och förhindrar extra sidor.
    const footerY =
        pageHeight - 65;

    // Sparar PDF-dokumentets nuvarande inställningar.
    document.save();

    // Sparar den aktuella textpositionen.
    const savedX =
        document.x;

    const savedY =
        document.y;


    // ==========================================
    // LINJE OVANFÖR SIDFOTEN
    // ==========================================

    // Ställer in färg och tjocklek på linjen.
    document
        .strokeColor("#d9dee3")
        .lineWidth(0.5);

    // Ritar en tunn linje ovanför sidfoten.
    document
        .moveTo(
            50,
            footerY - 8
        )
        .lineTo(
            pageWidth - 50,
            footerY - 8
        )
        .stroke();


    // ==========================================
    // PROJEKTETS NAMN
    // ==========================================

    // Ställer in färg, font och storlek.
    document
        .fillColor("#6c757d")
        .font("Helvetica")
        .fontSize(8);

    // Skriver projektnamnet på en fast position.
    //
    // height begränsar textområdet.
    // lineBreak:false förhindrar att PDFKit
    // försöker skapa ytterligare rader.
    document.text(
        "Website QA System",
        50,
        footerY,
        {
            width: 250,
            height: 10,
            lineBreak: false,
            align: "left",
        }
    );


    // ==========================================
    // SIDNUMMER
    // ==========================================

    // Skriver sidnumret på höger sida.
    document.text(
        `Sida ${pageNumber}`,
        pageWidth - 150,
        footerY,
        {
            width: 100,
            height: 10,
            lineBreak: false,
            align: "right",
        }
    );


    // Återställer PDFKit:s tidigare textposition.
    document.x =
        savedX;

    document.y =
        savedY;

    // Återställer tidigare PDF-inställningar.
    document.restore();
}


// ==========================================
// RAPPORT HEADER
// ==========================================

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


// ==========================================
// SEKTIONSRUBRIK
// ==========================================

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


// ==========================================
// STATUSKORT
// ==========================================

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


// ==========================================
// ÖVERGRIPANDE STATUS
// ==========================================

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


// ==========================================
// WEBBPLATSINFORMATION
// ==========================================

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

// Skriver ut alla QA-resultat i PDF-rapporten.
//
// Funktionen hanterar både normala och långa resultat.
//
// Normala resultat får ett kompakt kort.
// Väldigt långa resultat får flöda naturligt
// mellan PDF-sidor.
function addQAResults(
    document: PDFKit.PDFDocument,
    results: QACheckResult[]
): void {

    // Går igenom alla QA-resultat ett i taget.
    for (
        const result of results
    ) {

        // Bredden på resultatkortet.
        const cardWidth =
            document.page.width - 100;

        // Vänster marginal för texten inne i kortet.
        const textX =
            125;

        // Höger marginal för texten.
        const textWidth =
            document.page.width - 190;

        // Standardhöjd för rubriken.
        const titleHeight =
            20;

        // Extra utrymme runt meddelandet.
        const messagePadding =
            result.message
                ? 18
                : 0;

        // Räknar ut hur hög själva meddelandet blir.
        let messageHeight =
            0;

        if (result.message) {

            // Använder samma font som vid utskrift.
            document
                .font("Helvetica")
                .fontSize(8);

            // Räknar ut faktisk texthöjd.
            messageHeight =
                document.heightOfString(
                    result.message,
                    {
                        width: textWidth,
                        lineGap: 2,
                    }
                );
        }

        // Räknar ut total höjd för kortet.
        const cardHeight =
            Math.max(
                35,
                titleHeight +
                messageHeight +
                messagePadding
            );

        // Maximal höjd för ett normalt kort.
        const maximumCardHeight =
            document.page.height - 120;


        // ==========================================
        // NORMALT RESULTAT
        // ==========================================

        if (
            cardHeight <=
            maximumCardHeight
        ) {

            // Om hela kortet inte får plats på aktuell sida
            // skapar vi en ny sida innan vi börjar.
            if (
                document.y +
                cardHeight >
                document.page.height - 60
            ) {

                document.addPage();

                // Visar att QA-resultaten fortsätter.
                document
                    .fillColor("#17202a")
                    .fontSize(11)
                    .font("Helvetica-Bold")
                    .text(
                        "QA-kontroller – fortsättning"
                    );

                document.moveDown();

                document.font("Helvetica");
            }

            // Sparar kortets startposition.
            const startY =
                document.y;

            // Hämtar statusfärg.
            const color =
                getStatusColor(
                    result.status
                );

            // Hämtar bakgrundsfärg.
            const background =
                getStatusBackground(
                    result.status
                );

            // Skapar bakgrunden för resultatkortet.
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
                    textX,
                    startY + 9,
                    {
                        width: textWidth,
                    }
                );

            // Skriver meddelandet.
            if (result.message) {

                document
                    .fillColor("#495057")
                    .fontSize(8)
                    .font("Helvetica")
                    .text(
                        result.message,
                        textX,
                        startY + titleHeight,
                        {
                            width: textWidth,
                            lineGap: 2,
                        }
                    );
            }

            // Flyttar ner efter kortet.
            document.y =
                startY +
                cardHeight +
                8;

            continue;
        }


        // ==========================================
        // MYCKET LÅNGT RESULTAT
        // ==========================================

        // Om ett meddelande är extremt långt ska vi
        // inte skapa ett enormt kort.
        //
        // I stället visar vi rubriken först och sedan
        // texten direkt i dokumentet.

        // Om vi inte har plats för rubriken på sidan
        // börjar vi på en ny sida.
        if (
            document.y + 45 >
            document.page.height - 60
        ) {

            document.addPage();

            document
                .fillColor("#17202a")
                .fontSize(11)
                .font("Helvetica-Bold")
                .text(
                    "QA-kontroller – fortsättning"
                );

            document.moveDown();
        }

        // Sparar startpositionen.
        const startY =
            document.y;

        // Hämtar statusfärg.
        const color =
            getStatusColor(
                result.status
            );

        // Skriver status.
        document
            .fillColor(color)
            .fontSize(8)
            .font("Helvetica-Bold")
            .text(
                result.status,
                65,
                startY + 2,
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
                textX,
                startY,
                {
                    width: textWidth,
                }
            );

        // Flyttar ner efter rubriken.
        document.y =
            startY +
            titleHeight +
            8;

        // Skriver den långa texten direkt.
        //
        // PDFKit får själv flytta texten till nästa sida
        // när sidan tar slut.
        if (result.message) {

            document
                .fillColor("#495057")
                .fontSize(8)
                .font("Helvetica")
                .text(
                    result.message,
                    65,
                    document.y,
                    {
                        width:
                            document.page.width - 130,
                        lineGap: 2,
                    }
                );
        }

        // Lite mellanrum innan nästa kontroll.
        document.moveDown(1);
    }

    // Återställer fonten efter alla resultat.
    document.font("Helvetica");
}


// ==========================================
// AI-ANALYS
// ==========================================

// Skriver ut AI-analysen i PDF-rapporten.
//
// Texten får flöda naturligt mellan sidor.
// Vi använder därför inte ett stort bakgrundskort.
function addAIAnalysis(
    document: PDFKit.PDFDocument,
    aiAnalysis: string
): void {

    // Skapar en ny sida för AI-analysen.
    document.addPage();

    // Skriver rubriken.
    addSectionTitle(
        document,
        "AI-analys"
    );

    // Skriver en kort förklaring under rubriken.
    document
        .fillColor("#6c757d")
        .fontSize(9)
        .font("Helvetica")
        .text(
            "Automatiserad analys av QA-resultaten " +
            "genererad av projektets lokala AI-modell."
        );

    // Lite mellanrum före själva analysen.
    document.moveDown();

    // Bredden som används för AI-texten.
    const textWidth =
        document.page.width - 130;

    // Skriver analysen med normal text.
    //
    // PDFKit får själv flytta texten till nästa sida
    // när det behövs.
    document
        .fillColor("#212529")
        .fontSize(9)
        .font("Helvetica")
        .text(
            aiAnalysis,
            65,
            document.y,
            {
                width: textWidth,
                lineGap: 4,
            }
        );

    // Lite extra mellanrum efter analysen.
    document.moveDown(1);

    // Återställer fonten.
    document.font("Helvetica");
}


// ==========================================
// VANLIG PDF-RAPPORT
// ==========================================

export async function createPDFReport(
    data: PDFReportData
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

    // Hämtar PDF-sidorna innan sidfötterna läggs till.
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

    // Kopplar PDF-dokumentet till filen.
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

    // Hämtar alla PDF-sidor innan sidfötterna läggs till.
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