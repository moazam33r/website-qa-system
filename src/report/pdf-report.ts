// PDF-rapport för Website QA System.
//
// Den här filen skapar PDF-rapporter från QA-resultaten.
//
// Fokus:
// - Tydlig första sida med sammanfattning.
// - PASS / WARNING / FAIL visas tydligt.
// - Problem visas direkt i sammanfattningen.
// - QA-kontroller visas som separata kort.
// - Långa resultat flyttas automatiskt till nästa sida.
// - AI-analysen delas upp i tydliga sektioner.
// - CSV-rapporter behåller stöd för flera webbplatser.
// - Sidhuvud och sidfot används konsekvent.

import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import os from "os";
import { QACheckResult } from "./qa-report";

// ==========================================
// DATASTRUKTURER
// ==========================================

// Data som används när en vanlig PDF-rapport skapas.
export interface PDFReportData {
    // URL till webbplatsen som testades.
    websiteUrl: string;

    // Alla QA-resultat från skanningen.
    results: QACheckResult[];

    // Valfri AI-analys.
    aiAnalysis?: string;
}

// Data som används vid CSV-import.
export interface CSVPDFReportItem {
    // Visar om skanningen lyckades.
    success: boolean;

    // URL till webbplatsen.
    websiteUrl: string;

    // QA-resultat.
    results: QACheckResult[];

    // Felmeddelande om skanningen misslyckades.
    error?: string;

    // Valfri AI-analys.
    aiAnalysis?: string;
}

// ==========================================
// FÄRGER
// ==========================================

const COLORS = {
    dark: "#17202a",
    text: "#212529",
    secondaryText: "#6c757d",
    muted: "#495057",
    border: "#d9dee3",
    light: "#f7f9fb",
    white: "#ffffff",

    pass: "#198754",
    passBackground: "#eaf7ef",

    warning: "#d97706",
    warningBackground: "#fff4e5",

    fail: "#dc3545",
    failBackground: "#fdecec",
};

// ==========================================
// SIDLAYOUT
// ==========================================

const PAGE = {
    margin: 50,
    contentWidth: 512,

    // Nedersta delen av sidan reserveras för sidfoten.
    bottomMargin: 75,
};

// ==========================================
// HJÄLPFUNKTIONER
// ==========================================

// Räknar hur många PASS, WARNING och FAIL som finns.
function getResultCounts(results: QACheckResult[]) {
    return {
        pass: results.filter((result) => result.status === "PASS").length,
        warning: results.filter((result) => result.status === "WARNING").length,
        fail: results.filter((result) => result.status === "FAIL").length,
    };
}

// Bestämmer rapportens övergripande status.
function getOverallStatus(
    results: QACheckResult[]
): "PASS" | "WARNING" | "FAIL" {
    const counts = getResultCounts(results);

    // FAIL har högst prioritet.
    if (counts.fail > 0) {
        return "FAIL";
    }

    // Om inga FAIL finns men WARNING finns blir resultatet WARNING.
    if (counts.warning > 0) {
        return "WARNING";
    }

    // Om allt är PASS blir resultatet PASS.
    return "PASS";
}

// Hämtar färg för en status.
function getStatusColor(status: string): string {
    if (status === "PASS") {
        return COLORS.pass;
    }

    if (status === "WARNING") {
        return COLORS.warning;
    }

    return COLORS.fail;
}

// Hämtar bakgrundsfärg för en status.
function getStatusBackground(status: string): string {
    if (status === "PASS") {
        return COLORS.passBackground;
    }

    if (status === "WARNING") {
        return COLORS.warningBackground;
    }

    return COLORS.failBackground;
}

// Hämtar datum och tid på svenska.
function getReportDate(): string {
    return new Date().toLocaleString("sv-SE");
}

// ==========================================
// SIDFOT
// ==========================================

// Lägger till sidfot på varje sida.
function addFooter(
    document: PDFKit.PDFDocument,
    pageNumber: number
): void {
    const pageWidth = document.page.width;
    const footerY = document.page.height - 42;

    document.save();

    // Linje ovanför sidfoten.
    document
        .strokeColor(COLORS.border)
        .lineWidth(0.5)
        .moveTo(PAGE.margin, footerY - 9)
        .lineTo(pageWidth - PAGE.margin, footerY - 9)
        .stroke();

    // Projektnamn.
    document
        .fillColor(COLORS.secondaryText)
        .font("Helvetica")
        .fontSize(8)
        .text("Website QA System", PAGE.margin, footerY, {
            width: 220,
            height: 10,
            lineBreak: false,
        });

    // Sidnummer.
    document.text(`Sida ${pageNumber}`, pageWidth - 150, footerY, {
        width: 100,
        height: 10,
        lineBreak: false,
        align: "right",
    });

    document.restore();
}

// ==========================================
// SIDHUVUD
// ==========================================

// Lägger till det mörka sidhuvudet.
function addReportHeader(
    document: PDFKit.PDFDocument,
    websiteUrl: string,
    reportTitle: string
): void {
    // Bakgrund för sidhuvudet.
    document
        .rect(0, 0, document.page.width, 96)
        .fill(COLORS.dark);

    // Projektnamn.
    document
        .fillColor(COLORS.white)
        .font("Helvetica-Bold")
        .fontSize(20)
        .text("Website QA System", 50, 24);

    // Rapporttyp.
    document
        .fillColor("#d9e2ec")
        .font("Helvetica")
        .fontSize(10)
        .text(reportTitle, 50, 52);

    // Testad webbplats.
    document
        .fillColor("#d9e2ec")
        .font("Helvetica")
        .fontSize(9)
        .text(websiteUrl, 50, 69, {
            width: document.page.width - 100,
        });

    // Nästa innehåll börjar under headern.
    document.y = 118;

    document.fillColor(COLORS.text);
    document.font("Helvetica");
}

// Header som används när en sektion fortsätter på nästa sida.
function addContinuationHeader(
    document: PDFKit.PDFDocument,
    title: string
): void {
    document
        .fillColor(COLORS.dark)
        .font("Helvetica-Bold")
        .fontSize(12)
        .text(title, PAGE.margin, 40);

    document
        .strokeColor(COLORS.border)
        .lineWidth(0.8)
        .moveTo(PAGE.margin, 61)
        .lineTo(document.page.width - PAGE.margin, 61)
        .stroke();

    document.y = 80;
    document.font("Helvetica");
}

// ==========================================
// SIDKONTROLL
// ==========================================

// Kontrollerar om ett block får plats på aktuell sida.
//
// Om det inte får plats skapas en ny sida.
function ensureSpace(
    document: PDFKit.PDFDocument,
    requiredHeight: number,
    continuationTitle?: string
): void {
    const bottomLimit =
        document.page.height - PAGE.bottomMargin;

    if (document.y + requiredHeight > bottomLimit) {
        document.addPage();

        if (continuationTitle) {
            addContinuationHeader(
                document,
                continuationTitle
            );
        }
    }
}

// ==========================================
// SEKTIONSRUBRIKER
// ==========================================

// Skapar en tydlig sektionsrubrik.
function addSectionTitle(
    document: PDFKit.PDFDocument,
    title: string,
    subtitle?: string
): void {
    // Reservar plats för rubriken.
    ensureSpace(
        document,
        subtitle ? 55 : 38
    );

    const startY = document.y;

    // Huvudrubrik.
    document
        .fillColor(COLORS.dark)
        .font("Helvetica-Bold")
        .fontSize(15)
        .text(title, PAGE.margin, startY);

    // Underrubrik.
    if (subtitle) {
        document
            .fillColor(COLORS.secondaryText)
            .font("Helvetica")
            .fontSize(8.5)
            .text(
                subtitle,
                PAGE.margin,
                startY + 21,
                {
                    width: PAGE.contentWidth,
                }
            );
    }

    // Linje under rubriken.
    const lineY = startY + (subtitle ? 39 : 25);

    document
        .strokeColor(COLORS.border)
        .lineWidth(0.8)
        .moveTo(PAGE.margin, lineY)
        .lineTo(
            document.page.width - PAGE.margin,
            lineY
        )
        .stroke();

    // Nästa innehåll börjar under linjen.
    document.y = lineY + 13;

    document
        .fillColor(COLORS.text)
        .font("Helvetica");
}

// ==========================================
// INFORMATION OM WEBBPLATSEN
// ==========================================

// Visar information om webbplatsen som testades.
function addWebsiteInformation(
    document: PDFKit.PDFDocument,
    websiteUrl: string
): void {
    const startY = document.y;
    const height = 74;

    document
        .roundedRect(
            PAGE.margin,
            startY,
            PAGE.contentWidth,
            height,
            8
        )
        .fill(COLORS.light);

    // Liten rubrik.
    document
        .fillColor(COLORS.secondaryText)
        .font("Helvetica-Bold")
        .fontSize(8)
        .text(
            "TESTAD WEBBPLATS",
            65,
            startY + 12
        );

    // URL.
    document
        .fillColor(COLORS.text)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(
            websiteUrl,
            65,
            startY + 28,
            {
                width: PAGE.contentWidth - 30,
            }
        );

    // Datum.
    document
        .fillColor(COLORS.secondaryText)
        .font("Helvetica")
        .fontSize(8)
        .text(
            `Rapport skapad: ${getReportDate()}`,
            65,
            startY + 49
        );

    document.y = startY + height + 16;
}

// ==========================================
// ÖVERGRIPANDE STATUS
// ==========================================

// Visar exempelvis PASS, WARNING eller FAIL.
function addOverallStatusCard(
    document: PDFKit.PDFDocument,
    status: "PASS" | "WARNING" | "FAIL"
): void {
    ensureSpace(document, 72);

    const color = getStatusColor(status);
    const background =
        getStatusBackground(status);

    const startY = document.y;

    document
        .roundedRect(
            PAGE.margin,
            startY,
            PAGE.contentWidth,
            58,
            8
        )
        .fill(background);

    document
        .fillColor(COLORS.secondaryText)
        .font("Helvetica-Bold")
        .fontSize(8)
        .text(
            "ÖVERGRIPANDE RESULTAT",
            68,
            startY + 11
        );

    document
        .fillColor(color)
        .font("Helvetica-Bold")
        .fontSize(19)
        .text(
            status,
            68,
            startY + 26
        );

    document.y = startY + 73;

    document.font("Helvetica");
}

// ==========================================
// SAMMANFATTNINGSKORT
// ==========================================

// Skapar ett kort för PASS, WARNING eller FAIL.
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
    const color = getStatusColor(status);
    const background =
        getStatusBackground(status);

    document
        .roundedRect(
            x,
            y,
            width,
            height,
            8
        )
        .fill(background);

    // Färgad linje till vänster.
    document
        .rect(
            x,
            y,
            5,
            height
        )
        .fill(color);

    document
        .fillColor(COLORS.secondaryText)
        .font("Helvetica-Bold")
        .fontSize(8)
        .text(
            label,
            x + 16,
            y + 12
        );

    document
        .fillColor(color)
        .font("Helvetica-Bold")
        .fontSize(22)
        .text(
            String(value),
            x + 16,
            y + 28
        );

    document.font("Helvetica");
}

// Skapar de tre sammanfattningskorten.
function addSummaryCards(
    document: PDFKit.PDFDocument,
    counts: ReturnType<typeof getResultCounts>
): void {
    ensureSpace(document, 80);

    const gap = 12;

    const cardWidth =
        (PAGE.contentWidth - gap * 2) / 3;

    const y = document.y;

    addStatusCard(
        document,
        PAGE.margin,
        y,
        cardWidth,
        64,
        "PASS",
        counts.pass,
        "PASS"
    );

    addStatusCard(
        document,
        PAGE.margin + cardWidth + gap,
        y,
        cardWidth,
        64,
        "WARNING",
        counts.warning,
        "WARNING"
    );

    addStatusCard(
        document,
        PAGE.margin + (cardWidth + gap) * 2,
        y,
        cardWidth,
        64,
        "FAIL",
        counts.fail,
        "FAIL"
    );

    document.y = y + 80;
}

// ==========================================
// QA-RESULTAT
// ==========================================

// Skapar ett enskilt QA-kort.
//
// Exempel:
//
// WARNING   SEO
//           4 SEO-varningar hittades
function addResultCard(
    document: PDFKit.PDFDocument,
    result: QACheckResult,
    continuationTitle: string = "QA-kontroller – fortsättning"
): void {
    const textX = 125;

    const textWidth =
        document.page.width - 190;

    // Beräkna hur mycket plats meddelandet behöver.
    let messageHeight = 0;

    if (result.message) {
        document
            .font("Helvetica")
            .fontSize(8.5);

        messageHeight =
            document.heightOfString(
                result.message,
                {
                    width: textWidth,
                    lineGap: 2,
                }
            );
    }

    // Minsta höjd är 48.
    const cardHeight = Math.max(
        48,
        29 + messageHeight + 14
    );

    // Om kortet inte får plats flyttas hela kortet.
    if (
        document.y + cardHeight >
        document.page.height - PAGE.bottomMargin
    ) {
        document.addPage();

        addContinuationHeader(
            document,
            continuationTitle
        );
    }

    const startY = document.y;

    const color =
        getStatusColor(result.status);

    const background =
        getStatusBackground(result.status);

    // Kortets bakgrund.
    document
        .roundedRect(
            PAGE.margin,
            startY,
            PAGE.contentWidth,
            cardHeight,
            7
        )
        .fill(background);

    // Status.
    document
        .fillColor(color)
        .font("Helvetica-Bold")
        .fontSize(8)
        .text(
            result.status,
            65,
            startY + 10,
            {
                width: 52,
            }
        );

    // Namnet på kontrollen.
    document
        .fillColor(COLORS.text)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(
            result.name,
            textX,
            startY + 8,
            {
                width: textWidth,
            }
        );

    // Resultatets meddelande.
    if (result.message) {
        document
            .fillColor(COLORS.muted)
            .font("Helvetica")
            .fontSize(8.5)
            .text(
                result.message,
                textX,
                startY + 25,
                {
                    width: textWidth,
                    lineGap: 2,
                }
            );
    }

    // Nästa kort börjar under det aktuella.
    document.y =
        startY + cardHeight + 8;
}

// Lägger till alla QA-resultat.
function addAllQAResults(
    document: PDFKit.PDFDocument,
    results: QACheckResult[]
): void {
    for (const result of results) {
        addResultCard(document, result);
    }

    document.font("Helvetica");
}

// ==========================================
// PROBLEMÖVERSIKT
// ==========================================

// Visar endast WARNING och FAIL på första sidan.
function addProblemSummary(
    document: PDFKit.PDFDocument,
    results: QACheckResult[]
): void {
    const problems = results.filter(
        (result) =>
            result.status === "WARNING" ||
            result.status === "FAIL"
    );

    // Om inga problem finns visas ett positivt meddelande.
    if (problems.length === 0) {
        ensureSpace(document, 55);

        const startY = document.y;

        document
            .roundedRect(
                PAGE.margin,
                startY,
                PAGE.contentWidth,
                42,
                7
            )
            .fill(COLORS.passBackground);

        document
            .fillColor(COLORS.pass)
            .font("Helvetica-Bold")
            .fontSize(9)
            .text(
                "Inga problem identifierades",
                65,
                startY + 14
            );

        document.y = startY + 55;

        return;
    }

    addSectionTitle(
        document,
        "Identifierade problem",
        "WARNING och FAIL visas här för att göra de viktigaste problemen enkla att hitta."
    );

    for (const result of problems) {
        addResultCard(
            document,
            result,
            "Identifierade problem – fortsättning"
        );
    }
}

// ==========================================
// AI-ANALYS
// ==========================================

// Försöker dela upp AI-texten i sektioner.
function parseAIAnalysis(
    aiAnalysis: string
): {
    title: string;
    body: string[];
}[] {
    const sections: {
        title: string;
        body: string[];
    }[] = [];

    let current:
        | {
              title: string;
              body: string[];
          }
        | null = null;

    const lines = aiAnalysis
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    for (const line of lines) {
        // Tar bort exempelvis "1. " från rubriker.
        const cleanedHeading =
            line.replace(
                /^\d+[.)]\s*/,
                ""
            ).trim();

        // Känner igen de rubriker som används av AI-prompten.
        const isKnownHeading =
            /^(?:Vad fungerar bra)$/i.test(
                cleanedHeading
            ) ||
            /^(?:Viktigaste problemen)$/i.test(
                cleanedHeading
            ) ||
            /^(?:Vad resultaten visar)$/i.test(
                cleanedHeading
            ) ||
            /^(?:Rekommendationer)$/i.test(
                cleanedHeading
            );

        if (isKnownHeading) {
            current = {
                title: cleanedHeading,
                body: [],
            };

            sections.push(current);

            continue;
        }

        // Om AI:n inte skickar någon rubrik
        // läggs texten under "AI-analys".
        if (!current) {
            current = {
                title: "AI-analys",
                body: [],
            };

            sections.push(current);
        }

        current.body.push(line);
    }

    return sections;
}

// Returnerar om en AI-rad är en punktlista.
function isBulletLine(line: string): boolean {
    return /^[-*•]\s*/.test(line);
}

// Tar bort bullet-tecknet från AI-raden.
function cleanBullet(line: string): string {
    return line.replace(/^[-*•]\s*/, "").trim();
}

// ==========================================
// AI-SEKTION
// ==========================================

// Lägger till en AI-sektion.
//
// Viktig skillnad mot tidigare:
// Texten delas upp rad för rad och sidan kontrolleras
// under tiden. Det minskar risken för att text hamnar
// utanför PDF-sidan.
function addAISection(
    document: PDFKit.PDFDocument,
    title: string,
    lines: string[]
): void {
    // Om sektionen inte har någon text skapas ändå ett litet kort.
    if (lines.length === 0) {
        ensureSpace(document, 70);

        const startY = document.y;

        document
            .roundedRect(
                PAGE.margin,
                startY,
                PAGE.contentWidth,
                58,
                8
            )
            .fill(COLORS.light);

        document
            .fillColor(COLORS.dark)
            .font("Helvetica-Bold")
            .fontSize(10.5)
            .text(
                title,
                66,
                startY + 13
            );

        document.y = startY + 70;

        return;
    }

    // Bestämmer färg beroende på sektion.
    const isProblemSection =
        /problem|rekommend/i.test(title);

    const color = isProblemSection
        ? COLORS.warning
        : COLORS.dark;

    const background = isProblemSection
        ? COLORS.warningBackground
        : COLORS.light;

    // Beräkna textens höjd.
    document
        .font("Helvetica")
        .fontSize(8.5);

    let estimatedHeight = 48;

    for (const rawLine of lines) {
        const line = cleanBullet(rawLine);

        estimatedHeight +=
            document.heightOfString(
                line,
                {
                    width:
                        PAGE.contentWidth - 48,
                    lineGap: 3,
                }
            ) + 5;
    }

    // Begränsar höjden på ett enskilt kort.
    const maxCardHeight = 650;

    // Om hela sektionen inte får plats börjar vi på ny sida.
    if (
        document.y + Math.min(
            estimatedHeight,
            120
        ) >
        document.page.height -
            PAGE.bottomMargin
    ) {
        document.addPage();

        addContinuationHeader(
            document,
            "AI-analys – fortsättning"
        );
    }

    let startY = document.y;

    // Om sektionen är längre än en sida
    // skapar vi flera mindre kort.
    let currentCardHeight = 0;

    const startSectionCard = () => {
        startY = document.y;

        currentCardHeight = 45;

        // Bakgrunden börjar med en tillfällig höjd.
        // Höjden justeras inte dynamiskt eftersom PDFKit
        // inte behöver veta hela kortets höjd i förväg.
        document
            .roundedRect(
                PAGE.margin,
                startY,
                PAGE.contentWidth,
                maxCardHeight,
                8
            )
            .fill(background);

        document
            .fillColor(color)
            .font("Helvetica-Bold")
            .fontSize(10.5)
            .text(
                title,
                66,
                startY + 13,
                {
                    width:
                        PAGE.contentWidth - 32,
                }
            );

        document.y = startY + 36;
    };

    startSectionCard();

    for (const rawLine of lines) {
        const bullet = isBulletLine(rawLine);
        const line = cleanBullet(rawLine);

        document
            .font("Helvetica")
            .fontSize(8.5);

        const lineWidth = bullet
            ? PAGE.contentWidth - 48
            : PAGE.contentWidth - 32;

        const lineHeight =
            document.heightOfString(
                line,
                {
                    width: lineWidth,
                    lineGap: 3,
                }
            );

        // Kontrollera om nästa rad får plats.
        if (
            currentCardHeight +
                lineHeight +
                10 >
            maxCardHeight - 20
        ) {
            document.y =
                startY +
                currentCardHeight +
                18;

            document.addPage();

            addContinuationHeader(
                document,
                "AI-analys – fortsättning"
            );

            startSectionCard();
        }

        const textY = document.y;

        if (bullet) {
            // Bullet.
            document
                .fillColor(color)
                .font("Helvetica-Bold")
                .fontSize(8.5)
                .text(
                    "•",
                    68,
                    textY,
                    {
                        width: 8,
                        lineBreak: false,
                    }
                );

            // Text.
            document
                .fillColor(COLORS.muted)
                .font("Helvetica")
                .fontSize(8.5)
                .text(
                    line,
                    82,
                    textY,
                    {
                        width:
                            PAGE.contentWidth - 48,
                        lineGap: 3,
                    }
                );
        } else {
            document
                .fillColor(COLORS.muted)
                .font("Helvetica")
                .fontSize(8.5)
                .text(
                    line,
                    66,
                    textY,
                    {
                        width:
                            PAGE.contentWidth - 32,
                        lineGap: 3,
                    }
                );
        }

        currentCardHeight +=
            lineHeight + 8;

        document.y += 5;
    }

    document.y =
        startY +
        Math.min(
            currentCardHeight + 15,
            maxCardHeight + 20
        );
}

// ==========================================
// AI-ANALYS
// ==========================================

function addAIAnalysis(
    document: PDFKit.PDFDocument,
    aiAnalysis: string
): void {
    // AI-analysen börjar på en egen sida.
    document.addPage();

    addContinuationHeader(
        document,
        "AI-analys"
    );

    document
        .fillColor(COLORS.secondaryText)
        .font("Helvetica")
        .fontSize(8.5)
        .text(
            "Automatiserad analys av QA-resultaten genererad av projektets lokala AI-modell.",
            PAGE.margin,
            document.y,
            {
                width: PAGE.contentWidth,
            }
        );

    document.y += 25;

    const sections =
        parseAIAnalysis(aiAnalysis);

    for (const section of sections) {
        addAISection(
            document,
            section.title,
            section.body
        );

        document.y += 8;
    }
}

// ==========================================
// PDF-SKRIVNING
// ==========================================

// Avslutar PDF-dokumentet och lägger till sidnummer.
async function finishPDF(
    document: PDFKit.PDFDocument,
    stream: fs.WriteStream
): Promise<void> {
    // Hämtar alla sidor innan dokumentet avslutas.
    const pages =
        document.bufferedPageRange();

    // Lägger till sidfot på varje sida.
    for (
        let index = 0;
        index < pages.count;
        index++
    ) {
        document.switchToPage(
            pages.start + index
        );

        addFooter(
            document,
            index + 1
        );
    }

    // Avslutar PDF-filen.
    document.end();

    // Väntar tills filen faktiskt har skrivits klart.
    await new Promise<void>(
        (resolve, reject) => {
            stream.on(
                "finish",
                () => resolve()
            );

            stream.on(
                "error",
                (error) => reject(error)
            );
        }
    );
}

// ==========================================
// REPORTS-MAPP
// ==========================================

// Skapar mappen där PDF-rapporter sparas.
function createReportsDirectory(): string {
    const reportsDirectory =
        path.join(
            os.tmpdir(),
            "website-qa-system"
        );

    if (
        !fs.existsSync(
            reportsDirectory
        )
    ) {
        fs.mkdirSync(
            reportsDirectory,
            {
                recursive: true,
            }
        );
    }

    return reportsDirectory;
}

// ==========================================
// VANLIG PDF-RAPPORT
// ==========================================

export async function createPDFReport(
    data: PDFReportData
): Promise<string> {
    const reportsDirectory =
        createReportsDirectory();

    // Försöker hämta hostname från URL:en.
    let hostname = "website";

    try {
        hostname =
            new URL(
                data.websiteUrl
            ).hostname;
    } catch {
        // Standardnamnet används om URL:en inte kan tolkas.
    }

    const filePath =
        path.join(
            reportsDirectory,
            `QA-Report-${hostname}.pdf`
        );

    // Skapar själva PDF-dokumentet.
    const document =
        new PDFDocument({
            margin: PAGE.margin,
            bufferPages: true,
            size: "A4",

            info: {
                Title:
                    `Website QA Report - ${hostname}`,
                Author:
                    "Website QA System",
                Subject:
                    "Automatiserad QA-rapport",
            },
        });

    // Skapar filströmmen.
    const stream =
        fs.createWriteStream(
            filePath
        );

    document.pipe(stream);

    // ==========================================
    // FÖRSTASIDA
    // ==========================================

    addReportHeader(
        document,
        data.websiteUrl,
        "Automatiserad QA-rapport"
    );

    addWebsiteInformation(
        document,
        data.websiteUrl
    );

    // Räknar resultaten.
    const counts =
        getResultCounts(
            data.results
        );

    // Hämtar övergripande status.
    const overallStatus =
        getOverallStatus(
            data.results
        );

    // Sammanfattning.
    addSectionTitle(
        document,
        "Sammanfattning",
        "En snabb översikt av resultatet från samtliga QA-kontroller."
    );

    // Övergripande status.
    addOverallStatusCard(
        document,
        overallStatus
    );

    // PASS / WARNING / FAIL.
    addSummaryCards(
        document,
        counts
    );

    // Problem visas direkt på första sidan.
    addProblemSummary(
        document,
        data.results
    );

    // ==========================================
    // QA-KONTROLLER
    // ==========================================

    document.addPage();

    addContinuationHeader(
        document,
        "QA-kontroller"
    );

    addSectionTitle(
        document,
        "QA-kontroller",
        `${data.results.length} automatiserade kontroller genomfördes.`
    );

    addAllQAResults(
        document,
        data.results
    );

    // ==========================================
    // AI-ANALYS
    // ==========================================

    if (
        data.aiAnalysis &&
        data.aiAnalysis.trim().length > 0
    ) {
        addAIAnalysis(
            document,
            data.aiAnalysis
        );
    }

    // Avsluta PDF.
    await finishPDF(
        document,
        stream
    );

    return filePath;
}

// ==========================================
// CSV-PDF
// ==========================================

export async function createCSVPDFReport(
    reports: CSVPDFReportItem[]
): Promise<string> {
    const reportsDirectory =
        createReportsDirectory();

    // Skapar unik timestamp.
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

    // Skapar PDF.
    const document =
        new PDFDocument({
            margin: PAGE.margin,
            bufferPages: true,
            size: "A4",

            info: {
                Title:
                    "Website QA System - CSV-rapport",
                Author:
                    "Website QA System",
                Subject:
                    "Sammanställd QA-rapport",
            },
        });

    const stream =
        fs.createWriteStream(
            filePath
        );

    document.pipe(stream);

    // ==========================================
    // CSV-ÖVERSIKT
    // ==========================================

    addReportHeader(
        document,
        "CSV-import",
        "Sammanställd QA-rapport"
    );

    // Räknar lyckade och misslyckade webbplatser.
    const completed =
        reports.filter(
            (report) =>
                report.success
        ).length;

    const failed =
        reports.length -
        completed;

    addSectionTitle(
        document,
        "Översikt",
        "Sammanställning av webbplatser som analyserats via CSV-import."
    );

    ensureSpace(
        document,
        120
    );

    const overviewY =
        document.y;

    const overviewHeight =
        88;

    // Översiktskort.
    document
        .roundedRect(
            PAGE.margin,
            overviewY,
            PAGE.contentWidth,
            overviewHeight,
            8
        )
        .fill(COLORS.light);

    // Totalt antal.
    document
        .fillColor(
            COLORS.secondaryText
        )
        .font("Helvetica-Bold")
        .fontSize(8)
        .text(
            "WEBBPLATSER",
            70,
            overviewY + 15
        );

    document
        .fillColor(
            COLORS.dark
        )
        .font("Helvetica-Bold")
        .fontSize(20)
        .text(
            String(
                reports.length
            ),
            70,
            overviewY + 31
        );

    // Klara.
    document
        .fillColor(
            COLORS.pass
        )
        .font("Helvetica-Bold")
        .fontSize(8)
        .text(
            "KLARA",
            225,
            overviewY + 15
        );

    document
        .fontSize(18)
        .text(
            String(
                completed
            ),
            225,
            overviewY + 31
        );

    // Misslyckade.
    document
        .fillColor(
            COLORS.fail
        )
        .fontSize(8)
        .text(
            "MISSLYCKADE",
            350,
            overviewY + 15
        );

    document
        .fontSize(18)
        .text(
            String(
                failed
            ),
            350,
            overviewY + 31
        );

    // Datum.
    document
        .fillColor(
            COLORS.secondaryText
        )
        .font("Helvetica")
        .fontSize(8)
        .text(
            `Rapport skapad: ${getReportDate()}`,
            70,
            overviewY + 66
        );

    document.y =
        overviewY +
        overviewHeight +
        20;

    // ==========================================
    // RESULTAT PER WEBBPLATS
    // ==========================================

    addSectionTitle(
        document,
        "Resultat per webbplats",
        "Översikt över status och antal kontroller för varje webbplats."
    );

    for (
        const report of reports
    ) {
        // --------------------------------------
        // MISSLYCKAD SKANNING
        // --------------------------------------

        if (!report.success) {
            const errorText =
                `Fel: ${
                    report.error ??
                    "Okänt fel"
                }`;

            document
                .font("Helvetica")
                .fontSize(8.5);

            const errorHeight =
                Math.max(
                    58,
                    document.heightOfString(
                        errorText,
                        {
                            width:
                                PAGE.contentWidth -
                                32,
                        }
                    ) + 40
                );

            if (
                document.y +
                    errorHeight >
                document.page.height -
                    PAGE.bottomMargin
            ) {
                document.addPage();

                addContinuationHeader(
                    document,
                    "Resultat per webbplats – fortsättning"
                );
            }

            const startY =
                document.y;

            document
                .roundedRect(
                    PAGE.margin,
                    startY,
                    PAGE.contentWidth,
                    errorHeight,
                    7
                )
                .fill(
                    COLORS.failBackground
                );

            document
                .fillColor(
                    COLORS.fail
                )
                .font("Helvetica-Bold")
                .fontSize(9)
                .text(
                    "FAIL",
                    65,
                    startY + 12
                );

            document
                .fillColor(
                    COLORS.text
                )
                .font("Helvetica-Bold")
                .fontSize(9)
                .text(
                    report.websiteUrl,
                    110,
                    startY + 11,
                    {
                        width:
                            PAGE.contentWidth -
                            125,
                    }
                );

            document
                .fillColor(
                    COLORS.muted
                )
                .font("Helvetica")
                .fontSize(8)
                .text(
                    errorText,
                    110,
                    startY + 29,
                    {
                        width:
                            PAGE.contentWidth -
                            125,
                        lineGap: 2,
                    }
                );

            document.y =
                startY +
                errorHeight +
                10;

            continue;
        }

        // --------------------------------------
        // LYCKAD SKANNING
        // --------------------------------------

        const counts =
            getResultCounts(
                report.results
            );

        const overallStatus =
            getOverallStatus(
                report.results
            );

        const color =
            getStatusColor(
                overallStatus
            );

        const background =
            getStatusBackground(
                overallStatus
            );

        const cardHeight =
            82;

        if (
            document.y +
                cardHeight >
            document.page.height -
                PAGE.bottomMargin
        ) {
            document.addPage();

            addContinuationHeader(
                document,
                "Resultat per webbplats – fortsättning"
            );
        }

        const startY =
            document.y;

        document
            .roundedRect(
                PAGE.margin,
                startY,
                PAGE.contentWidth,
                cardHeight,
                7
            )
            .fill(background);

        // Status.
        document
            .fillColor(color)
            .font("Helvetica-Bold")
            .fontSize(9)
            .text(
                overallStatus,
                65,
                startY + 12
            );

        // URL.
        document
            .fillColor(
                COLORS.text
            )
            .font("Helvetica-Bold")
            .fontSize(9.5)
            .text(
                report.websiteUrl,
                135,
                startY + 11,
                {
                    width:
                        PAGE.contentWidth -
                        150,
                }
            );

        // PASS.
        document
            .fillColor(
                COLORS.pass
            )
            .font("Helvetica")
            .fontSize(8)
            .text(
                `PASS: ${counts.pass}`,
                135,
                startY + 34
            );

        // WARNING.
        document
            .fillColor(
                COLORS.warning
            )
            .text(
                `WARNING: ${counts.warning}`,
                220,
                startY + 34
            );

        // FAIL.
        document
            .fillColor(
                COLORS.fail
            )
            .text(
                `FAIL: ${counts.fail}`,
                335,
                startY + 34
            );

        // Antal kontroller.
        document
            .fillColor(
                COLORS.secondaryText
            )
            .text(
                `Antal kontroller: ${report.results.length}`,
                135,
                startY + 55
            );

        document.y =
            startY +
            cardHeight +
            10;
    }

    // ==========================================
    // DETALJER PER WEBBPLATS
    // ==========================================

    for (
        const report of reports
    ) {
        document.addPage();

        addReportHeader(
            document,
            report.websiteUrl,
            "Detaljerad QA-rapport"
        );

        // --------------------------------------
        // MISSLYCKAD SKANNING
        // --------------------------------------

        if (!report.success) {
            addSectionTitle(
                document,
                "Skanningen misslyckades"
            );

            const errorText =
                report.error ??
                "Okänt fel";

            const errorHeight =
                Math.max(
                    75,
                    document.heightOfString(
                        errorText,
                        {
                            width:
                                PAGE.contentWidth -
                                36,
                        }
                    ) + 55
                );

            const startY =
                document.y;

            document
                .roundedRect(
                    PAGE.margin,
                    startY,
                    PAGE.contentWidth,
                    errorHeight,
                    8
                )
                .fill(
                    COLORS.failBackground
                );

            document
                .fillColor(
                    COLORS.fail
                )
                .font("Helvetica-Bold")
                .fontSize(12)
                .text(
                    "FAIL",
                    68,
                    startY + 14
                );

            document
                .fillColor(
                    COLORS.muted
                )
                .font("Helvetica")
                .fontSize(9)
                .text(
                    errorText,
                    68,
                    startY + 36,
                    {
                        width:
                            PAGE.contentWidth -
                            36,
                        lineGap: 3,
                    }
                );

            continue;
        }

        // --------------------------------------
        // SAMMANFATTNING
        // --------------------------------------

        const counts =
            getResultCounts(
                report.results
            );

        const overallStatus =
            getOverallStatus(
                report.results
            );

        addSectionTitle(
            document,
            "Sammanfattning",
            `${report.results.length} automatiserade kontroller genomfördes.`
        );

        addOverallStatusCard(
            document,
            overallStatus
        );

        addSummaryCards(
            document,
            counts
        );

        addProblemSummary(
            document,
            report.results
        );

        // --------------------------------------
        // QA-KONTROLLER
        // --------------------------------------

        document.addPage();

        addReportHeader(
            document,
            report.websiteUrl,
            "QA-kontroller"
        );

        addSectionTitle(
            document,
            "QA-kontroller"
        );

        addAllQAResults(
            document,
            report.results
        );

        // --------------------------------------
        // AI-ANALYS
        // --------------------------------------

        if (
            report.aiAnalysis &&
            report.aiAnalysis.trim()
                .length > 0
        ) {
            addAIAnalysis(
                document,
                report.aiAnalysis
            );
        }
    }

    // Avsluta PDF.
    await finishPDF(
        document,
        stream
    );

    return filePath;
}