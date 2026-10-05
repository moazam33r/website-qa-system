// ============================================================
// WEBSITE QA SYSTEM
// PDF-RAPPORT
// ============================================================
//
// Den här filen skapar PDF-rapporter från QA-resultaten.
//
// Viktigt:
// Den här versionen använder INTE:
// - bufferPages
// - switchToPage
// - bufferedPageRange
// - pageAdded
//
// Detta gör PDF-genereringen enklare och förhindrar
// rekursiva sidbyten som kan orsaka:
//
// RangeError: Maximum call stack size exceeded
//
// ============================================================

import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import os from "os";

import {
    QACheckResult,
} from "./qa-report";

// ============================================================
// DATASTRUKTURER
// ============================================================

// Data för en vanlig PDF-rapport.
export interface PDFReportData {

    // Webbplatsen som testades.
    websiteUrl: string;

    // Alla QA-resultat.
    results: QACheckResult[];

    // Valfri AI-analys.
    aiAnalysis?: string;
}

// Data för en CSV-rapport.
export interface CSVPDFReportItem {

    // Om skanningen lyckades.
    success: boolean;

    // Webbplatsens URL.
    websiteUrl: string;

    // QA-resultat.
    results: QACheckResult[];

    // Eventuellt fel.
    error?: string;

    // Valfri AI-analys.
    aiAnalysis?: string;
}

// ============================================================
// FÄRGER
// ============================================================

const COLORS = {

    // Mörk huvudfärg.
    dark: "#17202a",

    // Vanlig text.
    text: "#212529",

    // Sekundär text.
    secondaryText: "#6c757d",

    // Dämpad text.
    muted: "#495057",

    // Kantlinjer.
    border: "#d9dee3",

    // Ljus bakgrund.
    light: "#f7f9fb",

    // Vit.
    white: "#ffffff",

    // PASS.
    pass: "#198754",

    // PASS-bakgrund.
    passBackground: "#eaf7ef",

    // WARNING.
    warning: "#d97706",

    // WARNING-bakgrund.
    warningBackground: "#fff4e5",

    // FAIL.
    fail: "#dc3545",

    // FAIL-bakgrund.
    failBackground: "#fdecec",
};

// ============================================================
// PDF-LAYOUT
// ============================================================

const PAGE = {

    // Vänster/höger marginal.
    margin: 50,

    // A4-bredd minus marginaler.
    contentWidth: 495,
};

// ============================================================
// HJÄLPFUNKTIONER
// ============================================================

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

// Bestämmer övergripande status.
function getOverallStatus(
    results: QACheckResult[]
): "PASS" | "WARNING" | "FAIL" {

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

// Hämtar färg baserat på status.
function getStatusColor(
    status: string
): string {

    if (status === "PASS") {
        return COLORS.pass;
    }

    if (status === "WARNING") {
        return COLORS.warning;
    }

    return COLORS.fail;
}

// Hämtar bakgrund baserat på status.
function getStatusBackground(
    status: string
): string {

    if (status === "PASS") {
        return COLORS.passBackground;
    }

    if (status === "WARNING") {
        return COLORS.warningBackground;
    }

    return COLORS.failBackground;
}

// Hämtar dagens datum/tid.
function getReportDate(): string {

    return new Date().toLocaleString(
        "sv-SE"
    );
}

// ============================================================
// TEXTRENSNING
// ============================================================

// Tar bort meddelanden som inte är användbara
// i den professionella PDF-rapporten.
function cleanMessage(
    message: string
): string {

    if (!message) {
        return "";
    }

    let cleaned =
        message
            .replace(
                /Initial server response time was short \(Root document took 0 ms\)/gi,
                ""
            )
            .replace(
                /Root document took 0 ms/gi,
                ""
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();

    return cleaned;
}

// Begränsar väldigt långa texter.
function shortenText(
    text: string,
    maxLength: number
): string {

    const cleaned =
        cleanMessage(text);

    if (
        cleaned.length <=
        maxLength
    ) {
        return cleaned;
    }

    return (
        cleaned.substring(
            0,
            maxLength - 3
        ) + "..."
    );
}

// ============================================================
// SIDHUVUD
// ============================================================

// Lägger ett sidhuvud på en sida.
function addReportHeader(
    document: PDFKit.PDFDocument,
    websiteUrl: string,
    reportTitle: string
): void {

    // Mörk header.
    document
        .rect(
            0,
            0,
            document.page.width,
            96
        )
        .fill(
            COLORS.dark
        );

    // Projektnamn.
    document
        .fillColor(
            COLORS.white
        )
        .font(
            "Helvetica-Bold"
        )
        .fontSize(20)
        .text(
            "Website QA System",
            50,
            25
        );

    // Rapporttyp.
    document
        .fillColor(
            "#d9e2ec"
        )
        .font(
            "Helvetica"
        )
        .fontSize(10)
        .text(
            reportTitle,
            50,
            53
        );

    // URL.
    document
        .fillColor(
            "#d9e2ec"
        )
        .fontSize(9)
        .text(
            websiteUrl,
            50,
            70,
            {
                width:
                    document.page.width -
                    100,
            }
        );

    // Börja innehållet under headern.
    document.y = 118;

    document
        .fillColor(
            COLORS.text
        )
        .font(
            "Helvetica"
        );
}

// Header för fortsättningssidor.
function addContinuationHeader(
    document: PDFKit.PDFDocument,
    title: string
): void {

    document
        .fillColor(
            COLORS.dark
        )
        .font(
            "Helvetica-Bold"
        )
        .fontSize(12)
        .text(
            title,
            PAGE.margin,
            42
        );

    document
        .strokeColor(
            COLORS.border
        )
        .lineWidth(0.8)
        .moveTo(
            PAGE.margin,
            62
        )
        .lineTo(
            document.page.width -
            PAGE.margin,
            62
        )
        .stroke();

    document.y = 82;

    document.font(
        "Helvetica"
    );
}

// ============================================================
// NY SIDA
// ============================================================

// Skapar en ny sida på ett kontrollerat sätt.
//
// Viktigt:
// Den här funktionen anropas endast direkt från kod.
// Den används aldrig från ett pageAdded-event.
function startNewPage(
    document: PDFKit.PDFDocument,
    title: string
): void {

    document.addPage();

    addContinuationHeader(
        document,
        title
    );
}

// ============================================================
// SEKTIONSTITEL
// ============================================================

function addSectionTitle(
    document: PDFKit.PDFDocument,
    title: string,
    subtitle?: string
): void {

    document
        .fillColor(
            COLORS.dark
        )
        .font(
            "Helvetica-Bold"
        )
        .fontSize(15)
        .text(
            title,
            PAGE.margin,
            document.y
        );

    if (subtitle) {

        document
            .fillColor(
                COLORS.secondaryText
            )
            .font(
                "Helvetica"
            )
            .fontSize(8.5)
            .text(
                subtitle,
                PAGE.margin,
                document.y + 4,
                {
                    width:
                        PAGE.contentWidth,
                }
            );
    }

    const lineY =
        document.y + 7;

    document
        .strokeColor(
            COLORS.border
        )
        .lineWidth(0.8)
        .moveTo(
            PAGE.margin,
            lineY
        )
        .lineTo(
            document.page.width -
            PAGE.margin,
            lineY
        )
        .stroke();

    document.y =
        lineY + 13;

    document.font(
        "Helvetica"
    );
}

// ============================================================
// WEBBPLATSINFORMATION
// ============================================================

function addWebsiteInformation(
    document: PDFKit.PDFDocument,
    websiteUrl: string
): void {

    const startY =
        document.y;

    document
        .roundedRect(
            PAGE.margin,
            startY,
            PAGE.contentWidth,
            70,
            8
        )
        .fill(
            COLORS.light
        );

    document
        .fillColor(
            COLORS.secondaryText
        )
        .font(
            "Helvetica-Bold"
        )
        .fontSize(8)
        .text(
            "TESTAD WEBBPLATS",
            65,
            startY + 12
        );

    document
        .fillColor(
            COLORS.text
        )
        .font(
            "Helvetica-Bold"
        )
        .fontSize(10)
        .text(
            websiteUrl,
            65,
            startY + 27,
            {
                width:
                    PAGE.contentWidth -
                    30,
            }
        );

    document
        .fillColor(
            COLORS.secondaryText
        )
        .font(
            "Helvetica"
        )
        .fontSize(8)
        .text(
            `Rapport skapad: ${getReportDate()}`,
            65,
            startY + 47
        );

    document.y =
        startY + 88;
}

// ============================================================
// ÖVERGRIPANDE STATUS
// ============================================================

function addOverallStatusCard(
    document: PDFKit.PDFDocument,
    status:
        | "PASS"
        | "WARNING"
        | "FAIL"
): void {

    const color =
        getStatusColor(
            status
        );

    const background =
        getStatusBackground(
            status
        );

    const startY =
        document.y;

    document
        .roundedRect(
            PAGE.margin,
            startY,
            PAGE.contentWidth,
            58,
            8
        )
        .fill(
            background
        );

    document
        .fillColor(
            COLORS.secondaryText
        )
        .font(
            "Helvetica-Bold"
        )
        .fontSize(8)
        .text(
            "ÖVERGRIPANDE RESULTAT",
            68,
            startY + 11
        );

    document
        .fillColor(
            color
        )
        .font(
            "Helvetica-Bold"
        )
        .fontSize(19)
        .text(
            status,
            68,
            startY + 26
        );

    document.y =
        startY + 73;

    document.font(
        "Helvetica"
    );
}

// ============================================================
// STATUSKORT
// ============================================================

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

    const color =
        getStatusColor(
            status
        );

    const background =
        getStatusBackground(
            status
        );

    document
        .roundedRect(
            x,
            y,
            width,
            height,
            8
        )
        .fill(
            background
        );

    document
        .rect(
            x,
            y,
            5,
            height
        )
        .fill(
            color
        );

    document
        .fillColor(
            COLORS.secondaryText
        )
        .font(
            "Helvetica-Bold"
        )
        .fontSize(8)
        .text(
            label,
            x + 16,
            y + 12
        );

    document
        .fillColor(
            color
        )
        .font(
            "Helvetica-Bold"
        )
        .fontSize(22)
        .text(
            String(value),
            x + 16,
            y + 28
        );

    document.font(
        "Helvetica"
    );
}

// Lägg tre statuskort.
function addSummaryCards(
    document: PDFKit.PDFDocument,
    counts: ReturnType<
        typeof getResultCounts
    >
): void {

    const gap = 12;

    const cardWidth =
        (
            PAGE.contentWidth -
            gap * 2
        ) / 3;

    const y =
        document.y;

    addStatusCard(
        document,
        50,
        y,
        cardWidth,
        64,
        "PASS",
        counts.pass,
        "PASS"
    );

    addStatusCard(
        document,
        50 +
            cardWidth +
            gap,
        y,
        cardWidth,
        64,
        "WARNING",
        counts.warning,
        "WARNING"
    );

    addStatusCard(
        document,
        50 +
            (cardWidth + gap) * 2,
        y,
        cardWidth,
        64,
        "FAIL",
        counts.fail,
        "FAIL"
    );

    document.y =
        y + 80;
}

// ============================================================
// RESULTATKORT
// ============================================================

// Skriver ett enskilt QA-resultat.
function addResultCard(
    document: PDFKit.PDFDocument,
    result: QACheckResult,
    continuationTitle =
        "QA-kontroller – fortsättning"
): void {

    const message =
        shortenText(
            result.message,
            700
        );

    const textX = 125;

    const textWidth =
        document.page.width -
        190;

    document
        .font(
            "Helvetica"
        )
        .fontSize(8.5);

    const messageHeight =
        message
            ? document.heightOfString(
                  message,
                  {
                      width:
                          textWidth,
                      lineGap: 2,
                  }
              )
            : 0;

    const cardHeight =
        Math.max(
            48,
            30 +
                messageHeight +
                12
        );

    // Om kortet inte får plats på sidan
    // börjar vi på nästa sida.
    if (
        document.y +
            cardHeight >
        document.page.height -
            70
    ) {

        startNewPage(
            document,
            continuationTitle
        );
    }

    const startY =
        document.y;

    const color =
        getStatusColor(
            result.status
        );

    const background =
        getStatusBackground(
            result.status
        );

    document
        .roundedRect(
            PAGE.margin,
            startY,
            PAGE.contentWidth,
            cardHeight,
            7
        )
        .fill(
            background
        );

    // Status.
    document
        .fillColor(
            color
        )
        .font(
            "Helvetica-Bold"
        )
        .fontSize(8)
        .text(
            result.status,
            65,
            startY + 10,
            {
                width: 52,
            }
        );

    // Kontrollnamn.
    document
        .fillColor(
            COLORS.text
        )
        .font(
            "Helvetica-Bold"
        )
        .fontSize(10)
        .text(
            result.name,
            textX,
            startY + 8,
            {
                width:
                    textWidth,
            }
        );

    // Meddelande.
    if (message) {

        document
            .fillColor(
                COLORS.muted
            )
            .font(
                "Helvetica"
            )
            .fontSize(8.5)
            .text(
                message,
                textX,
                startY + 25,
                {
                    width:
                        textWidth,
                    lineGap: 2,
                }
            );
    }

    document.y =
        startY +
        cardHeight +
        8;
}

// ============================================================
// PROBLEMÖVERSIKT
// ============================================================

function addProblemSummary(
    document: PDFKit.PDFDocument,
    results: QACheckResult[]
): void {

    const problems =
        results.filter(
            (result) =>
                result.status ===
                    "WARNING" ||
                result.status ===
                    "FAIL"
        );

    addSectionTitle(
        document,
        "Viktigaste problemen",
        "WARNING och FAIL visas först så att åtgärder blir enkla att prioritera."
    );

    // Inga problem.
    if (
        problems.length === 0
    ) {

        const startY =
            document.y;

        document
            .roundedRect(
                PAGE.margin,
                startY,
                PAGE.contentWidth,
                42,
                7
            )
            .fill(
                COLORS.passBackground
            );

        document
            .fillColor(
                COLORS.pass
            )
            .font(
                "Helvetica-Bold"
            )
            .fontSize(9)
            .text(
                "Inga problem identifierades.",
                65,
                startY + 14
            );

        document.y =
            startY + 55;

        return;
    }

    // Visa problem.
    for (
        const result of problems
    ) {

        addResultCard(
            document,
            result,
            "Viktigaste problemen – fortsättning"
        );
    }
}

// ============================================================
// ALLA QA-RESULTAT
// ============================================================

function addAllQAResults(
    document: PDFKit.PDFDocument,
    results: QACheckResult[]
): void {

    for (
        const result of results
    ) {

        addResultCard(
            document,
            result
        );
    }

    document.font(
        "Helvetica"
    );
}

// ============================================================
// AI-ANALYS
// ============================================================

// Delar AI-texten i sektioner.
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

    const lines =
        aiAnalysis
            .split(/\r?\n/)
            .map(
                (line) =>
                    line.trim()
            )
            .filter(
                (line) =>
                    line.length > 0
            );

    for (
        const line of lines
    ) {

        const heading =
            line.replace(
                /^\d+[.)]\s*/,
                ""
            );

        const isHeading =
            /^(Vad fungerar bra|Viktigaste problemen|Vad resultaten visar|Rekommendationer)$/i.test(
                heading
            );

        if (isHeading) {

            current = {

                title:
                    heading,

                body: [],
            };

            sections.push(
                current
            );

            continue;
        }

        if (!current) {

            current = {

                title:
                    "AI-analys",

                body: [],
            };

            sections.push(
                current
            );
        }

        current.body.push(
            line
        );
    }

    return sections;
}

// Skriver en AI-sektion.
function addAISection(
    document: PDFKit.PDFDocument,
    title: string,
    lines: string[]
): void {

    const safeLines =
        lines
            .slice(0, 12)
            .map(
                (line) =>
                    shortenText(
                        line,
                        260
                    )
            );

    // Om det inte finns plats
    // börjar vi en ny sida.
    if (
        document.y >
        document.page.height -
            230
    ) {

        startNewPage(
            document,
            "AI-analys – fortsättning"
        );
    }

    const startY =
        document.y;

    const color =
        /problem|rekommend/i.test(
            title
        )
            ? COLORS.warning
            : COLORS.dark;

    const background =
        /problem|rekommend/i.test(
            title
        )
            ? COLORS.warningBackground
            : COLORS.light;

    // Rubrik.
    document
        .fillColor(
            color
        )
        .font(
            "Helvetica-Bold"
        )
        .fontSize(11)
        .text(
            title,
            PAGE.margin,
            startY
        );

    document.y += 20;

    // AI-rader.
    for (
        const rawLine of safeLines
    ) {

        const isBullet =
            /^[-*•]/.test(
                rawLine
            );

        const line =
            rawLine.replace(
                /^[-*•]\s*/,
                ""
            );

        // Beräkna ungefärlig höjd.
        document
            .font(
                "Helvetica"
            )
            .fontSize(8.5);

        const lineHeight =
            document.heightOfString(
                line,
                {
                    width:
                        PAGE.contentWidth -
                        25,
                    lineGap: 2,
                }
            );

        // Om raden inte får plats,
        // fortsätt på ny sida.
        if (
            document.y +
                lineHeight +
                10 >
            document.page.height -
                70
        ) {

            startNewPage(
                document,
                "AI-analys – fortsättning"
            );
        }

        if (isBullet) {

            document
                .fillColor(
                    color
                )
                .font(
                    "Helvetica-Bold"
                )
                .fontSize(8.5)
                .text(
                    "•",
                    PAGE.margin,
                    document.y,
                    {
                        width: 10,
                        lineBreak: false,
                    }
                );

            document
                .fillColor(
                    COLORS.muted
                )
                .font(
                    "Helvetica"
                )
                .fontSize(8.5)
                .text(
                    line,
                    PAGE.margin + 15,
                    document.y,
                    {
                        width:
                            PAGE.contentWidth -
                            15,
                        lineGap: 2,
                    }
                );

        } else {

            document
                .fillColor(
                    COLORS.muted
                )
                .font(
                    "Helvetica"
                )
                .fontSize(8.5)
                .text(
                    line,
                    PAGE.margin,
                    document.y,
                    {
                        width:
                            PAGE.contentWidth,
                        lineGap: 2,
                    }
                );
        }

        document.y += 5;
    }

    // Diskret bakgrundslinje under sektionen.
    document
        .strokeColor(
            COLORS.border
        )
        .lineWidth(0.5)
        .moveTo(
            PAGE.margin,
            document.y + 3
        )
        .lineTo(
            document.page.width -
                PAGE.margin,
            document.y + 3
        )
        .stroke();

    document.y += 15;

    // Säkerställer att variabeln används
    // utan att skapa extra PDF-element.
    void background;
}

// Lägg AI-analysen.
function addAIAnalysis(
    document: PDFKit.PDFDocument,
    aiAnalysis: string
): void {

    startNewPage(
        document,
        "AI-analys"
    );

    document
        .fillColor(
            COLORS.secondaryText
        )
        .font(
            "Helvetica"
        )
        .fontSize(8.5)
        .text(
            "Automatiserad analys av QA-resultaten genererad av projektets lokala AI-modell.",
            PAGE.margin,
            document.y,
            {
                width:
                    PAGE.contentWidth,
            }
        );

    document.y += 25;

    const sections =
        parseAIAnalysis(
            aiAnalysis
        );

    for (
        const section of sections
    ) {

        addAISection(
            document,
            section.title,
            section.body
        );
    }
}

// ============================================================
// PDF-SKRIVNING
// ============================================================

// Avslutar PDF-dokumentet.
//
// Viktigt:
// Ingen switchToPage.
// Ingen bufferedPageRange.
// Ingen footer-loop.
// Ingen pageAdded-event.
async function finishPDF(
    document: PDFKit.PDFDocument,
    stream: fs.WriteStream
): Promise<void> {

    await new Promise<void>(
        (
            resolve,
            reject
        ) => {

            stream.once(
                "finish",
                () => {
                    resolve();
                }
            );

            stream.once(
                "error",
                (error) => {
                    reject(error);
                }
            );

            // Avslutar PDF:en.
            document.end();
        }
    );
}

// ============================================================
// RAPPORTSMAPP
// ============================================================

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

// ============================================================
// VANLIG PDF-RAPPORT
// ============================================================

export async function createPDFReport(
    data: PDFReportData
): Promise<string> {

    const reportsDirectory =
        createReportsDirectory();

    let hostname =
        "website";

    try {

        hostname =
            new URL(
                data.websiteUrl
            ).hostname;

    } catch {

        // Standardnamn används.
    }

    // Tar bort eventuella tecken
    // som inte passar i filnamn.
    hostname =
        hostname.replace(
            /[^a-zA-Z0-9.-]/g,
            "-"
        );

    const filePath =
        path.join(
            reportsDirectory,
            `QA-Report-${hostname}.pdf`
        );

    // Skapar PDF-dokumentet.
    //
    // OBS:
    // bufferPages används INTE.
    const document =
        new PDFDocument({

            size: "A4",

            margin:
                PAGE.margin,

            info: {

                Title:
                    `Website QA Report - ${hostname}`,

                Author:
                    "Website QA System",

                Subject:
                    "Automatiserad QA-rapport",
            },
        });

    const stream =
        fs.createWriteStream(
            filePath
        );

    // Kopplar PDF till filen.
    document.pipe(
        stream
    );

    // ========================================================
    // FÖRSTASIDA
    // ========================================================

    addReportHeader(
        document,
        data.websiteUrl,
        "Automatiserad QA-rapport"
    );

    addWebsiteInformation(
        document,
        data.websiteUrl
    );

    const counts =
        getResultCounts(
            data.results
        );

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

    // PASS/WARNING/FAIL.
    addSummaryCards(
        document,
        counts
    );

    // Problem.
    addProblemSummary(
        document,
        data.results
    );

    // ========================================================
    // QA-KONTROLLER
    // ========================================================

    startNewPage(
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

    // ========================================================
    // AI
    // ========================================================

    if (
        data.aiAnalysis &&
        data.aiAnalysis.trim()
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

// ============================================================
// CSV-PDF
// ============================================================

export async function createCSVPDFReport(
    reports: CSVPDFReportItem[]
): Promise<string> {

    const reportsDirectory =
        createReportsDirectory();

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
    //
    // Ingen bufferPages.
    const document =
        new PDFDocument({

            size: "A4",

            margin:
                PAGE.margin,

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

    document.pipe(
        stream
    );

    // ========================================================
    // CSV-ÖVERSIKT
    // ========================================================

    addReportHeader(
        document,
        "CSV-import",
        "Sammanställd QA-rapport"
    );

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

    const overviewY =
        document.y;

    document
        .roundedRect(
            PAGE.margin,
            overviewY,
            PAGE.contentWidth,
            90,
            8
        )
        .fill(
            COLORS.light
        );

    // Totalt.
    document
        .fillColor(
            COLORS.secondaryText
        )
        .font(
            "Helvetica-Bold"
        )
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
        .font(
            "Helvetica-Bold"
        )
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
        .font(
            "Helvetica-Bold"
        )
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

    document
        .fillColor(
            COLORS.secondaryText
        )
        .font(
            "Helvetica"
        )
        .fontSize(8)
        .text(
            `Rapport skapad: ${getReportDate()}`,
            70,
            overviewY + 68
        );

    document.y =
        overviewY + 110;

    // ========================================================
    // RESULTAT PER WEBBPLATS
    // ========================================================

    addSectionTitle(
        document,
        "Resultat per webbplats",
        "Översikt över status och antal kontroller för varje webbplats."
    );

    for (
        const report of reports
    ) {

        // Om skanningen misslyckades.
        if (
            !report.success
        ) {

            const errorText =
                shortenText(
                    report.error ??
                        "Okänt fel",
                    500
                );

            const errorHeight =
                Math.max(
                    65,
                    document.heightOfString(
                        errorText,
                        {
                            width:
                                PAGE.contentWidth -
                                100,
                        }
                    ) + 42
                );

            if (
                document.y +
                    errorHeight >
                document.page.height -
                    70
            ) {

                startNewPage(
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
                .font(
                    "Helvetica-Bold"
                )
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
                .font(
                    "Helvetica-Bold"
                )
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
                .font(
                    "Helvetica"
                )
                .fontSize(8)
                .text(
                    errorText,
                    110,
                    startY + 30,
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

        // Räkna resultat.
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
                70
        ) {

            startNewPage(
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
            .fill(
                background
            );

        document
            .fillColor(
                color
            )
            .font(
                "Helvetica-Bold"
            )
            .fontSize(9)
            .text(
                overallStatus,
                65,
                startY + 12
            );

        document
            .fillColor(
                COLORS.text
            )
            .font(
                "Helvetica-Bold"
            )
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

        document
            .fillColor(
                COLORS.pass
            )
            .font(
                "Helvetica"
            )
            .fontSize(8)
            .text(
                `PASS: ${counts.pass}`,
                135,
                startY + 34
            );

        document
            .fillColor(
                COLORS.warning
            )
            .text(
                `WARNING: ${counts.warning}`,
                220,
                startY + 34
            );

        document
            .fillColor(
                COLORS.fail
            )
            .text(
                `FAIL: ${counts.fail}`,
                335,
                startY + 34
            );

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

    // ========================================================
    // DETALJER PER WEBBPLATS
    // ========================================================

    for (
        const report of reports
    ) {

        startNewPage(
            document,
            "Detaljerad QA-rapport"
        );

        // URL.
        document
            .fillColor(
                COLORS.secondaryText
            )
            .font(
                "Helvetica"
            )
            .fontSize(8.5)
            .text(
                report.websiteUrl,
                PAGE.margin,
                document.y
            );

        document.y += 22;

        // Misslyckad skanning.
        if (
            !report.success
        ) {

            addSectionTitle(
                document,
                "Skanningen misslyckades"
            );

            document
                .fillColor(
                    COLORS.fail
                )
                .font(
                    "Helvetica-Bold"
                )
                .fontSize(12)
                .text(
                    "FAIL",
                    PAGE.margin,
                    document.y
                );

            document.y += 22;

            document
                .fillColor(
                    COLORS.muted
                )
                .font(
                    "Helvetica"
                )
                .fontSize(9)
                .text(
                    shortenText(
                        report.error ??
                            "Okänt fel",
                        800
                    ),
                    PAGE.margin,
                    document.y,
                    {
                        width:
                            PAGE.contentWidth,
                        lineGap: 3,
                    }
                );

            continue;
        }

        // Sammanfattning.
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

        // QA-kontroller.
        startNewPage(
            document,
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

        // AI.
        if (
            report.aiAnalysis &&
            report.aiAnalysis.trim()
        ) {

            addAIAnalysis(
                document,
                report.aiAnalysis
            );
        }
    }

    // Avsluta CSV-PDF.
    await finishPDF(
        document,
        stream
    );

    return filePath;
}