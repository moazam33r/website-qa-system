// ============================================================
// WEBSITE QA SYSTEM
// PDF-RAPPORT (ny design)
// ============================================================
//
// Förändringar jämfört med förra versionen:
//
// - Fynd grupperas per PROBLEM och får prioritet.
// - Förstasidan har sammanfattning + "Gör först".
// - Prestanda visas som staplar med målvärde 90.
// - "Det som fungerar" ersätter upprepade problemlistor.
// - AI-analysens dubblettavsnitt kan döljas.
// - Alla ursprungliga kontroller finns kvar i teknisk bilaga.
// - Textfel visas som separata fynd med:
//   - Felaktig text
//   - Förslag
//   - Sida
//   - Sammanhang
//
// Fortfarande INGEN bufferPages / switchToPage / pageAdded.
//
// ============================================================

import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import os from "os";

import { QACheckResult } from "./qa-report";

// ============================================================
// INSTÄLLNINGAR
// ============================================================

const HIDE_DUPLICATE_AI_SECTIONS = true;
const INCLUDE_TECHNICAL_APPENDIX = true;
const PERFORMANCE_TARGET = 90;

// ============================================================
// DATASTRUKTURER
// ============================================================

export interface PDFReportData {
    websiteUrl: string;
    results: QACheckResult[];
    aiAnalysis?: string;
}

export interface CSVPDFReportItem {
    success: boolean;
    websiteUrl: string;
    results: QACheckResult[];
    error?: string;
    aiAnalysis?: string;
}

type Priority = "Kritisk" | "Viktig" | "Liten";

interface Finding {
    priority: Priority;
    category: string;
    title: string;
    description?: string;
    pages: string[];
    scope?: string;
    action?: string;
    effort?: string;

    // Används framför allt för textfynd.
    matchedText?: string;
    suggestions?: string;
    context?: string;
}

// ============================================================
// FÄRGER
// ============================================================

const COLORS = {
    dark: "#0f2a26",
    text: "#0f2a26",
    secondaryText: "#3f5651",
    muted: "#3f5651",
    border: "#c5d3cf",
    light: "#eaf0ee",
    white: "#ffffff",

    // OK
    pass: "#0e7490",
    passBackground: "#ddf0f5",

    // Varning
    warning: "#8a5a00",
    warningBackground: "#fdf1c7",

    // Kritiskt
    fail: "#9d174d",
    failBackground: "#fce7f0",

    // Liten / information
    low: "#213b36",
    lowBackground: "#d9e4e1",
};

// ============================================================
// PDF-LAYOUT
// ============================================================

const PAGE = {
    margin: 50,
    contentWidth: 495,
    bottom: 782,
};

// ============================================================
// HJÄLPFUNKTIONER
// ============================================================

function getResultCounts(results: QACheckResult[]) {
    return {
        pass: results.filter((r) => r.status === "PASS").length,
        warning: results.filter((r) => r.status === "WARNING").length,
        fail: results.filter((r) => r.status === "FAIL").length,
    };
}

function getOverallStatus(
    results: QACheckResult[]
): "PASS" | "WARNING" | "FAIL" {
    const counts = getResultCounts(results);

    if (counts.fail > 0) return "FAIL";
    if (counts.warning > 0) return "WARNING";

    return "PASS";
}

function getStatusColor(status: string): string {
    if (status === "PASS") return COLORS.pass;
    if (status === "WARNING") return COLORS.warning;

    return COLORS.fail;
}

function getStatusBackground(status: string): string {
    if (status === "PASS") return COLORS.passBackground;
    if (status === "WARNING") return COLORS.warningBackground;

    return COLORS.failBackground;
}

function getOverallHeadline(
    status: "PASS" | "WARNING" | "FAIL"
): string {
    if (status === "FAIL") return "Behöver åtgärdas";
    if (status === "WARNING") return "Kan förbättras";

    return "Inga problem";
}

function getReportDate(): string {
    return new Date().toLocaleString("sv-SE");
}

function measure(
    document: PDFKit.PDFDocument,
    text: string,
    width: number,
    font: string,
    size: number,
    lineGap = 2
): number {
    document.font(font).fontSize(size);

    return document.heightOfString(text, {
        width,
        lineGap,
    });
}

// ============================================================
// TEXTRENSNING
// ============================================================

function cleanMessage(message: string): string {
    if (!message) return "";

    return message
        .replace(
            /Initial server response time was short \*\*Root document took 0 ms\*\*/gi,
            ""
        )
        .replace(/Root document took 0 ms/gi, "")
        .replace(/\s+/g, " ")
        .trim();
}

function shortenText(text: string, maxLength: number): string {
    const cleaned = cleanMessage(text);

    if (cleaned.length <= maxLength) {
        return cleaned;
    }

    return cleaned.substring(0, maxLength - 3) + "...";
}

function toPath(url: string): string {
    try {
        const parsed = new URL(url);
        return parsed.pathname || "/";
    } catch {
        return url;
    }
}

// ============================================================
// FYND: TOLKA QA-RESULTAT
// ============================================================

function getTotalPages(results: QACheckResult[]): number {
    const pageResult = results.find(
        (r) => /^sidor$/i.test(r.name.trim())
    );

    const match = pageResult?.message?.match(
        /(\d+)\s*\/\s*(\d+)/
    );

    return match ? Number(match[2]) : 0;
}

// ============================================================
// ÅTGÄRDSREGLER
// ============================================================

const ACTION_RULES: {
    test: RegExp;
    action: string;
    effort: string;
}[] = [
    {
        test: /platshållar/i,
        action:
            "Ersätt med det riktiga numret. Finns det i sidfot eller mall räcker en ändring.",
        effort: "5 min",
    },
    {
        test: /ogiltigt telefonnummer/i,
        action:
            "Rätta numret så att det följer svensk nummerplan.",
        effort: "5 min",
    },
    {
        test: /cookie|integritet|gdpr/i,
        action:
            "Skapa en integritetspolicy, länka den i sidfoten och vid formulären. Lägg till cookie-information om cookies används.",
        effort: "1–2 h",
    },
    {
        test: /prestanda/i,
        action:
            "Hitta största flaskhalsen (LCP, bilder, JavaScript) och åtgärda den. Mål: 90+.",
        effort: "[uppskattas efter analys]",
    },
    {
        test: /meta description/i,
        action:
            "Skriv en unik beskrivning på cirka 150 tecken per sida, med ort och tjänst.",
        effort: "30 min",
    },
    {
        test: /h1/i,
        action:
            "Behåll en H1 per sida och gör övriga till H2.",
        effort: "5 min",
    },
    {
        test: /validering|telefonfält/i,
        action:
            'Lägg till mönster- eller typkontroll (type="tel") och ett tydligt felmeddelande.',
        effort: "15 min",
    },
    {
        test: /stavning|textfel/i,
        action:
            "Rätta orden enligt förslaget och kontrollera sammanhanget på den angivna sidan.",
        effort: "15 min",
    },
    {
        test: /google business/i,
        action:
            "Länka företagsprofilen från kontaktsidan eller sidfoten, om en profil finns.",
        effort: "10 min",
    },
];

// ============================================================
// SEO-FYND
// ============================================================

function describeSeoIssue(issue: string): {
    title: string;
    description?: string;
    priority: Priority;
} {
    if (/meta description/i.test(issue)) {
        return {
            title: "Meta description saknas",
            description:
                "Googles söksnitt kan annars baseras på slumpmässig text från sidan.",
            priority: "Viktig",
        };
    }

    if (/multiple h1/i.test(issue)) {
        const count = issue.match(/\((\d+)\)/)?.[1];

        return {
            title: count
                ? `Flera H1-rubriker (${count})`
                : "Flera H1-rubriker",
            description: "Bör vara en H1 per sida.",
            priority: "Liten",
        };
    }

    if (/(missing|no).*h1|h1.*missing/i.test(issue)) {
        return {
            title: "H1-rubrik saknas",
            priority: "Viktig",
        };
    }

    if (/title.*missing|missing.*title/i.test(issue)) {
        return {
            title: "Sidtitel saknas",
            priority: "Viktig",
        };
    }

    return {
        title: issue,
        priority: "Viktig",
    };
}

function parseSeoFindings(result: QACheckResult): Finding[] {
    const parts = cleanMessage(result.message)
        .split(/\s+-\s+/)
        .map((part) => part.trim());

    const groups = new Map<string, string[]>();

    for (let i = 1; i < parts.length - 1; i++) {
        if (
            /^https?:\/\//i.test(parts[i]) &&
            !/^https?:\/\//i.test(parts[i + 1])
        ) {
            const issue = parts[i + 1];

            const list = groups.get(issue) ?? [];
            list.push(parts[i]);

            groups.set(issue, list);

            i++;
        }
    }

    const findings: Finding[] = [];

    for (const [issue, pages] of groups) {
        const described = describeSeoIssue(issue);

        findings.push({
            priority: described.priority,
            category: result.name,
            title: described.title,
            description: described.description,
            pages,
        });
    }

    return findings;
}

// ============================================================
// LÄNK-FYND
// ============================================================

function parseLinkFindings(result: QACheckResult): Finding[] {
    const message = cleanMessage(result.message);

    const startIndex = message.search(
        /Ogiltiga telefonnummer/i
    );

    if (startIndex === -1) {
        return [];
    }

    const counts = message.match(
        /Telefonlänkar:\s*(\d+)\s*hittade\s*(\d+)\s*giltiga\s*(\d+)\s*ogiltiga/i
    );

    const segments = message
        .slice(startIndex)
        .split(/Telefonnummer:/i)
        .slice(1);

    const findings: Finding[] = [];

    for (const segment of segments) {
        const number = segment
            .match(/^\s*([+\d][\d\s()+-]*?)\s+Fel:/)?.[1]
            ?.trim();

        if (!number) continue;

        const error = segment
            .match(/Fel:\s*(.+?)\s+Förekommer/)?.[1]
            ?.trim();

        const pages =
            segment.match(/https?:\/\/[^\s]+/g) ?? [];

        const isPlaceholder = /0{6,}/.test(number);

        const total = counts
            ? ` ${counts[3]} av ${counts[1]} telefonlänkar är ogiltiga.`
            : "";

        findings.push({
            priority: isPlaceholder ? "Kritisk" : "Viktig",
            category: result.name,
            title: isPlaceholder
                ? `Platshållarnummer ${number}`
                : `Ogiltigt telefonnummer ${number}`,
            description:
                (error ?? "Ogiltigt telefonnummer.") + total,
            pages,
        });
    }

    return findings;
}

// ============================================================
// TEXT-FYND
// ============================================================
//
// Exempel på textresultat:
//
// 5 möjliga textfel hittades - Felaktig text: "putsarbete"
// - Förslag: putsarbete
// - Sida: https://example.com/putsning/
// - Sammanhang: Vi utför putsarbete...
// - Förklaring: ...
//
// Varje textfel blir ett eget Finding.
//

function parseTextFindings(result: QACheckResult): Finding[] {
    const message = cleanMessage(result.message);

    if (!message) {
        return [];
    }

    const sections = message
        .split(/\s+-\s+Felaktig text:/i)
        .slice(1);

    const findings: Finding[] = [];

    for (const section of sections) {
        const matchedMatch = section.match(
            /^"([^"]+)"/
        );

        const matchedText = matchedMatch?.[1]?.trim();

        if (!matchedText) {
            continue;
        }

        const suggestionMatch = section.match(
            /Förslag:\s*(.*?)\s+Sida:/i
        );

        const pageMatch = section.match(
            /Sida:\s*(https?:\/\/\S+)/i
        );

        const contextMatch = section.match(
            /Sammanhang:\s*(.*?)\s+Förklaring:/i
        );

        const suggestions =
            suggestionMatch?.[1]?.trim() ||
            "Inget förslag";

        const pageUrl =
            pageMatch?.[1]?.trim() || "";

        const context =
            contextMatch?.[1]?.trim() || "";

        findings.push({
            priority: "Viktig",
            category: result.name,
            title: `Möjligt textfel: "${matchedText}"`,
            description:
                suggestions === "Inget förslag"
                    ? "Ingen automatisk ersättning föreslogs."
                    : `Förslag: ${suggestions}`,
            pages: pageUrl ? [pageUrl] : [],
            matchedText,
            suggestions,
            context,
        });
    }

    return findings;
}

// ============================================================
// GENERELLT FYND
// ============================================================

function buildGenericFinding(
    result: QACheckResult
): Finding {
    const message = cleanMessage(result.message);

    if (/prestanda|performance/i.test(result.name)) {
        const desktop =
            message.match(/Desktop:\s*(\d+)/i)?.[1];

        const mobile =
            message.match(/(?:Mobile|Mobil):\s*(\d+)/i)?.[1];

        if (mobile) {
            return {
                priority:
                    result.status === "FAIL"
                        ? "Kritisk"
                        : "Viktig",
                category: result.name,
                title: `Mobilprestanda ${mobile}/100`,
                description: desktop
                    ? `Desktop är ${desktop}/100, så problemet gäller främst mobil.`
                    : undefined,
                pages: [],
            };
        }
    }

    const priority: Priority =
        result.status === "FAIL" ||
        /cookie|gdpr/i.test(result.name)
            ? "Kritisk"
            : /google business/i.test(result.name)
                ? "Liten"
                : "Viktig";

    return {
        priority,
        category: result.name,
        title:
            shortenText(message, 160) ||
            result.name,
        pages: [],
    };
}

// ============================================================
// SKAPA ALLA FYND
// ============================================================

function deriveFindings(
    results: QACheckResult[]
): Finding[] {
    const findings: Finding[] = [];

    for (const result of results) {
        if (result.status === "PASS") {
            continue;
        }

        let derived: Finding[] = [];

        if (/seo/i.test(result.name)) {
            derived = parseSeoFindings(result);
        } else if (/länk/i.test(result.name)) {
            derived = parseLinkFindings(result);
        } else if (/text|stavning/i.test(result.name)) {
            derived = parseTextFindings(result);
        }

        if (derived.length === 0) {
            derived = [buildGenericFinding(result)];
        }

        findings.push(...derived);
    }

    // Lägg till åtgärd och insats.
    for (const finding of findings) {
        const key =
            `${finding.category} ${finding.title}`;

        const rule = ACTION_RULES.find((r) =>
            r.test.test(key)
        );

        finding.action =
            rule?.action ??
            "Granska resultatet i den tekniska bilagan och åtgärda.";

        finding.effort =
            rule?.effort ?? "[uppskattas]";

        finding.scope =
            finding.pages.length === 0 &&
            /cookie|gdpr|google|prestanda/i.test(
                finding.category
            )
                ? "Hela webbplatsen"
                : finding.pages.length === 0
                    ? "Se teknisk bilaga"
                    : undefined;
    }

    const order: Record<Priority, number> = {
        Kritisk: 0,
        Viktig: 1,
        Liten: 2,
    };

    return findings
        .map((finding, index) => ({
            finding,
            index,
        }))
        .sort(
            (a, b) =>
                order[a.finding.priority] -
                    order[b.finding.priority] ||
                a.index - b.index
        )
        .map((entry) => entry.finding);
}

// ============================================================
// SIDOR
// ============================================================

function formatPages(
    finding: Finding,
    totalPages: number
): string {
    if (finding.pages.length === 0) {
        return finding.scope ?? "";
    }

    if (
        totalPages > 0 &&
        finding.pages.length >= totalPages
    ) {
        return `Alla ${totalPages} sidor`;
    }

    // Textfynd ska visa exakt URL.
    const isTextFinding =
        finding.category
            .toLowerCase()
            .includes("text") ||
        finding.category
            .toLowerCase()
            .includes("stavning");

    const shown = finding.pages
        .slice(0, 6)
        .map((page) =>
            isTextFinding ? page : toPath(page)
        )
        .join("  ·  ");

    const rest =
        finding.pages.length - 6;

    return rest > 0
        ? `${shown}  +${rest} till`
        : shown;
}

// ============================================================
// SIDHUVUD
// ============================================================

function addReportHeader(
    document: PDFKit.PDFDocument,
    websiteUrl: string,
    reportTitle: string
): void {
    document
        .rect(
            0,
            0,
            document.page.width,
            96
        )
        .fill(COLORS.dark);

    document
        .fillColor(COLORS.white)
        .font("Helvetica-Bold")
        .fontSize(20)
        .text(
            "Website QA System",
            50,
            25
        );

    document
        .fillColor("#d9e4e1")
        .font("Helvetica")
        .fontSize(10)
        .text(
            reportTitle,
            50,
            53
        );

    document
        .fillColor("#d9e4e1")
        .fontSize(9)
        .text(
            websiteUrl,
            50,
            70,
            {
                width:
                    document.page.width - 100,
            }
        );

    document.y = 118;

    document
        .fillColor(COLORS.text)
        .font("Helvetica");
}

function addContinuationHeader(
    document: PDFKit.PDFDocument,
    title: string
): void {
    document
        .fillColor(COLORS.dark)
        .font("Helvetica-Bold")
        .fontSize(12)
        .text(
            title,
            PAGE.margin,
            42
        );

    document
        .strokeColor(COLORS.border)
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

    document.font("Helvetica");
}

// ============================================================
// NY SIDA
// ============================================================

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

function ensureSpace(
    document: PDFKit.PDFDocument,
    height: number,
    title: string
): void {
    if (
        document.y + height >
        PAGE.bottom
    ) {
        startNewPage(
            document,
            title
        );
    }
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
        .fillColor(COLORS.dark)
        .font("Helvetica-Bold")
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
            .font("Helvetica")
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
        .strokeColor(COLORS.border)
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

    document.font("Helvetica");
}

// ============================================================
// WEBBPLATSINFORMATION
// ============================================================

function addWebsiteInformation(
    document: PDFKit.PDFDocument,
    websiteUrl: string,
    totalPages: number,
    checkCount: number
): void {
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
        .fillColor(
            COLORS.secondaryText
        )
        .font("Helvetica-Bold")
        .fontSize(8)
        .text(
            "TESTAD WEBBPLATS",
            65,
            startY + 11
        );

    document
        .fillColor(COLORS.text)
        .font("Helvetica-Bold")
        .fontSize(11)
        .text(
            websiteUrl,
            65,
            startY + 25,
            {
                width:
                    PAGE.contentWidth -
                    30,
            }
        );

    const pagesText =
        totalPages > 0
            ? `${totalPages} sidor testade · `
            : "";

    document
        .fillColor(
            COLORS.secondaryText
        )
        .font("Helvetica")
        .fontSize(8)
        .text(
            `Skapad ${getReportDate()} · ${pagesText}${checkCount} kontroller`,
            65,
            startY + 42
        );

    document.y =
        startY + 76;
}

// ============================================================
// SAMMANFATTNING
// ============================================================

function addCountBox(
    document: PDFKit.PDFDocument,
    x: number,
    y: number,
    value: number,
    label: string,
    color: string
): void {
    document
        .roundedRect(
            x,
            y,
            84,
            60,
            6
        )
        .lineWidth(0.6)
        .fillAndStroke(
            COLORS.white,
            COLORS.border
        );

    document
        .fillColor(color)
        .font("Helvetica-Bold")
        .fontSize(22)
        .text(
            String(value),
            x + 12,
            y + 10,
            {
                width: 60,
                lineBreak: false,
            }
        );

    document
        .fillColor(
            COLORS.secondaryText
        )
        .font("Helvetica")
        .fontSize(8)
        .text(
            label,
            x + 12,
            y + 40,
            {
                width: 66,
                lineBreak: false,
            }
        );
}

function addSummaryCard(
    document: PDFKit.PDFDocument,
    results: QACheckResult[]
): void {
    const counts =
        getResultCounts(results);

    const status =
        getOverallStatus(results);

    const startY = document.y;

    document
        .roundedRect(
            PAGE.margin,
            startY,
            PAGE.contentWidth,
            96,
            8
        )
        .fill(
            getStatusBackground(
                status
            )
        );

    document
        .fillColor(
            COLORS.secondaryText
        )
        .font("Helvetica-Bold")
        .fontSize(8)
        .text(
            "ÖVERGRIPANDE RESULTAT",
            66,
            startY + 16
        );

    document
        .fillColor(
            getStatusColor(status)
        )
        .font("Helvetica-Bold")
        .fontSize(18)
        .text(
            getOverallHeadline(
                status
            ),
            66,
            startY + 32,
            {
                width: 190,
            }
        );

    document
        .fillColor(
            COLORS.secondaryText
        )
        .font("Helvetica")
        .fontSize(8.5)
        .text(
            `Status: ${status}`,
            66,
            startY + 62
        );

    const boxesX =
        PAGE.margin +
        PAGE.contentWidth -
        14 -
        268;

    const boxesY =
        startY + 18;

    addCountBox(
        document,
        boxesX,
        boxesY,
        counts.fail,
        "Misslyckade",
        COLORS.fail
    );

    addCountBox(
        document,
        boxesX + 92,
        boxesY,
        counts.warning,
        "Varningar",
        COLORS.warning
    );

    addCountBox(
        document,
        boxesX + 184,
        boxesY,
        counts.pass,
        "Godkända",
        COLORS.pass
    );

    document.y =
        startY + 114;

    document.font("Helvetica");
}

// ============================================================
// GÖR FÖRST
// ============================================================

function addDoFirst(
    document: PDFKit.PDFDocument,
    findings: Finding[]
): void {
    const top =
        findings.slice(0, 3);

    if (top.length === 0) {
        return;
    }

    const textX =
        PAGE.margin + 44;

    const textWidth =
        PAGE.contentWidth -
        44 -
        14;

    const items =
        top.map((finding) => {
            const sub =
                finding.description ??
                finding.category;

            const titleH =
                measure(
                    document,
                    finding.title,
                    textWidth,
                    "Helvetica-Bold",
                    9.5
                );

            const subH =
                measure(
                    document,
                    sub,
                    textWidth,
                    "Helvetica",
                    8.5
                );

            return {
                finding,
                sub,
                titleH,
                subH,
            };
        });

    const bodyHeight =
        items.reduce(
            (sum, item) =>
                sum +
                item.titleH +
                item.subH +
                14,
            0
        );

    const cardHeight =
        36 + bodyHeight;

    ensureSpace(
        document,
        cardHeight + 10,
        "Sammanfattning"
    );

    const startY =
        document.y;

    document
        .roundedRect(
            PAGE.margin,
            startY,
            PAGE.contentWidth,
            cardHeight,
            8
        )
        .lineWidth(0.6)
        .fillAndStroke(
            COLORS.white,
            COLORS.border
        );

    document
        .fillColor(
            COLORS.secondaryText
        )
        .font("Helvetica-Bold")
        .fontSize(8)
        .text(
            "GÖR FÖRST",
            PAGE.margin + 14,
            startY + 14
        );

    let y =
        startY + 34;

    items.forEach(
        (item, index) => {
            document
                .fillColor(
                    COLORS.dark
                )
                .font("Helvetica-Bold")
                .fontSize(18)
                .text(
                    String(index + 1),
                    PAGE.margin + 14,
                    y - 2,
                    {
                        width: 24,
                        lineBreak: false,
                    }
                );

            document
                .fillColor(
                    COLORS.text
                )
                .font("Helvetica-Bold")
                .fontSize(9.5)
                .text(
                    item.finding.title,
                    textX,
                    y,
                    {
                        width:
                            textWidth,
                        lineGap: 2,
                    }
                );

            document
                .fillColor(
                    COLORS.muted
                )
                .font("Helvetica")
                .fontSize(8.5)
                .text(
                    item.sub,
                    textX,
                    y +
                        item.titleH +
                        2,
                    {
                        width:
                            textWidth,
                        lineGap: 2,
                    }
                );

            y +=
                item.titleH +
                item.subH +
                14;
        }
    );

    document.y =
        startY +
        cardHeight +
        18;

    document.font("Helvetica");
}

// ============================================================
// FYNDKORT
// ============================================================

function getPriorityColors(
    priority: Priority
): {
    background: string;
    text: string;
} {
    if (priority === "Kritisk") {
        return {
            background: COLORS.fail,
            text: COLORS.white,
        };
    }

    if (priority === "Viktig") {
        return {
            background: "#fde9a8",
            text: "#6b3a05",
        };
    }

    return {
        background:
            COLORS.lowBackground,
        text: COLORS.low,
    };
}

function addFindingCard(
    document: PDFKit.PDFDocument,
    finding: Finding,
    totalPages: number
): void {
    const cardX =
        PAGE.margin;

    const contentX =
        cardX + 14 + 78;

    const contentWidth =
        cardX +
        PAGE.contentWidth -
        14 -
        contentX;

    const pagesText =
        formatPages(
            finding,
            totalPages
        );

    const effortText =
        finding.effort ?? "";

    const isTextFinding =
        finding.category
            .toLowerCase()
            .includes("text") ||
        finding.category
            .toLowerCase()
            .includes("stavning");

    // --------------------------------------------------------
    // MÄTNING
    // --------------------------------------------------------

    const titleH =
        measure(
            document,
            finding.title,
            contentWidth,
            "Helvetica-Bold",
            9.5
        );

    const descH =
        finding.description
            ? measure(
                document,
                finding.description,
                contentWidth,
                "Helvetica",
                8.5
            )
            : 0;

    const pagesH =
        pagesText
            ? measure(
                document,
                `Berörda sidor: ${pagesText}`,
                contentWidth,
                isTextFinding
                    ? "Helvetica"
                    : "Courier",
                8
            ) + 2
            : 0;

    const contextH =
        isTextFinding &&
        finding.context
            ? measure(
                document,
                `Sammanhang: ${finding.context}`,
                contentWidth,
                "Helvetica",
                8
            ) + 3
            : 0;

    const actionH =
        finding.action
            ? measure(
                document,
                `Åtgärd: ${finding.action}`,
                contentWidth,
                "Helvetica",
                8.5
            ) + 2
            : 0;

    const effortH =
        effortText ? 12 : 0;

    const cardHeight =
        Math.max(
            62,
            14 +
                titleH +
                (descH
                    ? descH + 3
                    : 0) +
                contextH +
                8 +
                pagesH +
                actionH +
                effortH +
                12
        );

    ensureSpace(
        document,
        cardHeight + 8,
        "Fynd efter prioritet"
    );

    const startY =
        document.y;

    // --------------------------------------------------------
    // KORT
    // --------------------------------------------------------

    document
        .roundedRect(
            cardX,
            startY,
            PAGE.contentWidth,
            cardHeight,
            7
        )
        .lineWidth(0.6)
        .fillAndStroke(
            COLORS.white,
            COLORS.border
        );

    // --------------------------------------------------------
    // PRIORITET
    // --------------------------------------------------------

    const colors =
        getPriorityColors(
            finding.priority
        );

    document
        .roundedRect(
            cardX + 14,
            startY + 14,
            62,
            16,
            8
        )
        .fill(
            colors.background
        );

    document
        .fillColor(colors.text)
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .text(
            finding.priority,
            cardX + 14,
            startY + 19.5,
            {
                width: 62,
                align: "center",
                lineBreak: false,
            }
        );

    document
        .fillColor(
            COLORS.secondaryText
        )
        .font("Helvetica-Bold")
        .fontSize(7)
        .text(
            finding.category.toUpperCase(),
            cardX + 14,
            startY + 38,
            {
                width: 72,
            }
        );

    // --------------------------------------------------------
    // INNEHÅLL
    // --------------------------------------------------------

    let y =
        startY + 14;

    document
        .fillColor(COLORS.text)
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .text(
            finding.title,
            contentX,
            y,
            {
                width:
                    contentWidth,
                lineGap: 2,
            }
        );

    y +=
        titleH + 3;

    // --------------------------------------------------------
    // BESKRIVNING / FÖRSLAG
    // --------------------------------------------------------

    if (finding.description) {
        document
            .fillColor(
                COLORS.muted
            )
            .font("Helvetica")
            .fontSize(8.5)
            .text(
                finding.description,
                contentX,
                y,
                {
                    width:
                        contentWidth,
                    lineGap: 2,
                }
            );

        y +=
            descH + 3;
    }

    // --------------------------------------------------------
    // SAMMANHANG
    // --------------------------------------------------------

    if (
        isTextFinding &&
        finding.context
    ) {
        document
            .fillColor(
                COLORS.secondaryText
            )
            .font("Helvetica-Bold")
            .fontSize(8)
            .text(
                "Sammanhang: ",
                contentX,
                y,
                {
                    width:
                        contentWidth,
                    continued: true,
                    lineGap: 2,
                }
            )
            .font("Helvetica")
            .fillColor(
                COLORS.muted
            )
            .text(
                finding.context
            );

        y +=
            contextH;
    }

    y += 8;

    // --------------------------------------------------------
    // SIDA
    // --------------------------------------------------------

    if (pagesText) {
        document
            .fillColor(
                COLORS.secondaryText
            )
            .font("Helvetica-Bold")
            .fontSize(8)
            .text(
                "Berörd sida: ",
                contentX,
                y,
                {
                    width:
                        contentWidth,
                    continued: true,
                    lineGap: 2,
                }
            )
            .font(
                isTextFinding
                    ? "Helvetica"
                    : "Courier"
            )
            .fillColor(
                COLORS.text
            )
            .text(
                pagesText
            );

        y +=
            pagesH;
    }

    // --------------------------------------------------------
    // ÅTGÄRD
    // --------------------------------------------------------

    if (finding.action) {
        document
            .fillColor(
                COLORS.secondaryText
            )
            .font("Helvetica-Bold")
            .fontSize(8.5)
            .text(
                "Åtgärd: ",
                contentX,
                y,
                {
                    width:
                        contentWidth,
                    continued: true,
                    lineGap: 2,
                }
            )
            .font("Helvetica")
            .fillColor(
                COLORS.text
            )
            .text(
                finding.action
            );

        y +=
            actionH;
    }

    // --------------------------------------------------------
    // INSATS
    // --------------------------------------------------------

    if (effortText) {
        document
            .fillColor(
                COLORS.secondaryText
            )
            .font("Helvetica-Bold")
            .fontSize(8)
            .text(
                "Uppskattad insats: ",
                contentX,
                y,
                {
                    width:
                        contentWidth,
                    continued: true,
                }
            )
            .font("Helvetica")
            .fillColor(
                COLORS.text
            )
            .text(
                effortText
            );
    }

    document.y =
        startY +
        cardHeight +
        8;

    document.font("Helvetica");
}

// ============================================================
// ALLA FYND
// ============================================================

function addFindings(
    document: PDFKit.PDFDocument,
    findings: Finding[],
    totalPages: number
): void {
    ensureSpace(
        document,
        140,
        "Fynd efter prioritet"
    );

    addSectionTitle(
        document,
        "Fynd efter prioritet",
        findings.length > 0
            ? `${findings.length} fynd, grupperade per problem och inte per sida.`
            : undefined
    );

    if (findings.length === 0) {
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
            .fillColor(COLORS.pass)
            .font("Helvetica-Bold")
            .fontSize(9)
            .text(
                "Inga problem identifierades.",
                65,
                startY + 14
            );

        document.y =
            startY + 58;

        return;
    }

    for (const finding of findings) {
        addFindingCard(
            document,
            finding,
            totalPages
        );
    }
}

// ============================================================
// PRESTANDA
// ============================================================

function addPerformanceBar(
    document: PDFKit.PDFDocument,
    y: number,
    label: string,
    score: number,
    color: string
): void {
    const trackX =
        PAGE.margin + 70;

    const trackWidth =
        PAGE.contentWidth -
        70 -
        50;

    document
        .fillColor(COLORS.text)
        .font("Helvetica")
        .fontSize(9)
        .text(
            label,
            PAGE.margin,
            y + 5,
            {
                width: 66,
                lineBreak: false,
            }
        );

    document
        .roundedRect(
            trackX,
            y,
            trackWidth,
            20,
            5
        )
        .fill(
            COLORS.lowBackground
        );

    document
        .roundedRect(
            trackX,
            y,
            Math.max(
                8,
                (trackWidth *
                    Math.min(
                        score,
                        100
                    )) /
                    100
            ),
            20,
            5
        )
        .fill(color);

    const targetX =
        trackX +
        (trackWidth *
            PERFORMANCE_TARGET) /
            100;

    document
        .rect(
            targetX - 1,
            y - 4,
            2,
            28
        )
        .fill(COLORS.dark);

    document
        .fillColor(COLORS.text)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(
            String(score),
            trackX +
                trackWidth +
                8,
            y + 5,
            {
                width: 36,
                lineBreak: false,
            }
        );
}

function addPerformance(
    document: PDFKit.PDFDocument,
    results: QACheckResult[]
): void {
    const result =
        results.find((r) =>
            /prestanda|performance/i.test(
                r.name
            )
        );

    if (!result) return;

    const message =
        cleanMessage(
            result.message
        );

    const desktop = Number(
        message.match(
            /Desktop:\s*(\d+)/i
        )?.[1]
    );

    const mobile = Number(
        message.match(
            /(?:Mobile|Mobil):\s*(\d+)/i
        )?.[1]
    );

    if (!desktop && !mobile) {
        return;
    }

    ensureSpace(
        document,
        150,
        "Prestanda"
    );

    addSectionTitle(
        document,
        "Prestanda"
    );

    const failColor =
        result.status === "PASS"
            ? COLORS.warning
            : getStatusColor(
                result.status
            );

    const y =
        document.y + 6;

    if (desktop) {
        addPerformanceBar(
            document,
            y,
            "Desktop",
            desktop,
            desktop >=
                PERFORMANCE_TARGET
                ? COLORS.pass
                : failColor
        );
    }

    if (mobile) {
        addPerformanceBar(
            document,
            y + 36,
            "Mobil",
            mobile,
            mobile >=
                PERFORMANCE_TARGET
                ? COLORS.pass
                : failColor
        );
    }

    document
        .fillColor(
            COLORS.secondaryText
        )
        .font("Helvetica")
        .fontSize(8)
        .text(
            `Den svarta linjen markerar målet ${PERFORMANCE_TARGET}. LCP, CLS och TBT: [lägg till från mätningen].`,
            PAGE.margin,
            y + 76,
            {
                width:
                    PAGE.contentWidth,
            }
        );

    document.y =
        y + 100;
}

// ============================================================
// DET SOM FUNGERAR
// ============================================================

function addWhatWorks(
    document: PDFKit.PDFDocument,
    results: QACheckResult[]
): void {
    const passed =
        results.filter(
            (r) => r.status === "PASS"
        );

    if (passed.length === 0) {
        return;
    }

    ensureSpace(
        document,
        90,
        "Det som fungerar"
    );

    addSectionTitle(
        document,
        "Det som fungerar"
    );

    const nameWidth = 110;

    const messageX =
        PAGE.margin +
        14 +
        nameWidth +
        8;

    const messageWidth =
        PAGE.contentWidth -
        14 -
        nameWidth -
        8;

    for (const result of passed) {
        const message =
            shortenText(
                result.message,
                160
            );

        const rowHeight =
            Math.max(
                16,
                measure(
                    document,
                    message,
                    messageWidth,
                    "Helvetica",
                    8.5
                ) + 6
            );

        ensureSpace(
            document,
            rowHeight,
            "Det som fungerar"
        );

        const y =
            document.y;

        const isInfo =
            /^0\s/.test(message);

        document
            .circle(
                PAGE.margin + 4,
                y + 5,
                3
            )
            .fill(
                isInfo
                    ? COLORS.secondaryText
                    : COLORS.pass
            );

        document
            .fillColor(COLORS.text)
            .font("Helvetica-Bold")
            .fontSize(8.5)
            .text(
                result.name,
                PAGE.margin + 14,
                y,
                {
                    width:
                        nameWidth,
                }
            );

        document
            .fillColor(COLORS.muted)
            .font("Helvetica")
            .fontSize(8.5)
            .text(
                isInfo
                    ? `Information: ${message}`
                    : message,
                messageX,
                y,
                {
                    width:
                        messageWidth,
                    lineGap: 2,
                }
            );

        document.y =
            y + rowHeight;
    }

    document.y += 6;

    document.font("Helvetica");
}

// ============================================================
// TEKNISK BILAGA
// ============================================================

function addResultCard(
    document: PDFKit.PDFDocument,
    result: QACheckResult,
    continuationTitle = "Teknisk bilaga"
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

    const messageHeight =
        message
            ? measure(
                document,
                message,
                textWidth,
                "Helvetica",
                8.5
            )
            : 0;

    const cardHeight =
        Math.max(
            48,
            30 +
                messageHeight +
                12
        );

    ensureSpace(
        document,
        cardHeight + 8,
        continuationTitle
    );

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
            getStatusBackground(
                result.status
            )
        );

    document
        .fillColor(
            getStatusColor(
                result.status
            )
        )
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

    document
        .fillColor(COLORS.text)
        .font("Helvetica-Bold")
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

    if (message) {
        document
            .fillColor(COLORS.muted)
            .font("Helvetica")
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

function addTechnicalAppendix(
    document: PDFKit.PDFDocument,
    results: QACheckResult[]
): void {
    startNewPage(
        document,
        "Teknisk bilaga"
    );

    addSectionTitle(
        document,
        "Teknisk bilaga",
        `${results.length} automatiserade kontroller med originaltext från verktyget.`
    );

    for (const result of results) {
        addResultCard(
            document,
            result
        );
    }

    document.font("Helvetica");
}

// ============================================================
// AI-ANALYS
// ============================================================

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
            .map((line) =>
                line.trim()
            )
            .filter(
                (line) =>
                    line.length > 0
            );

    for (const line of lines) {
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
                title: heading,
                body: [],
            };

            sections.push(
                current
            );

            continue;
        }

        if (!current) {
            current = {
                title: "AI-analys",
                body: [],
            };

            sections.push(
                current
            );
        }

        current.body.push(line);
    }

    return sections;
}

function addAISection(
    document: PDFKit.PDFDocument,
    title: string,
    lines: string[]
): void {
    const safeLines =
        lines
            .slice(0, 12)
            .map((line) =>
                shortenText(
                    line,
                    260
                )
            );

    ensureSpace(
        document,
        90,
        "AI-analys"
    );

    const color =
        /problem|rekommend/i.test(
            title
        )
            ? COLORS.warning
            : COLORS.dark;

    document
        .fillColor(color)
        .font("Helvetica-Bold")
        .fontSize(11)
        .text(
            title,
            PAGE.margin,
            document.y
        );

    document.y += 20;

    for (const rawLine of safeLines) {
        const isBullet =
            /^[-*•]/.test(
                rawLine
            );

        const line =
            rawLine.replace(
                /^[-*•]\s*/,
                ""
            );

        const lineHeight =
            measure(
                document,
                line,
                PAGE.contentWidth -
                    25,
                "Helvetica",
                8.5
            );

        ensureSpace(
            document,
            lineHeight + 10,
            "AI-analys"
        );

        if (isBullet) {
            document
                .fillColor(color)
                .font("Helvetica-Bold")
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
                .font("Helvetica")
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
                .font("Helvetica")
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
}

function addAIAnalysis(
    document: PDFKit.PDFDocument,
    aiAnalysis: string
): void {
    const sections =
        parseAIAnalysis(
            aiAnalysis
        ).filter(
            (section) =>
                !(
                    HIDE_DUPLICATE_AI_SECTIONS &&
                    /^(Vad fungerar bra|Viktigaste problemen|Vad resultaten visar)$/i.test(
                        section.title
                    )
                )
        );

    if (sections.length === 0) {
        return;
    }

    startNewPage(
        document,
        "AI-analys"
    );

    document
        .fillColor(
            COLORS.secondaryText
        )
        .font("Helvetica")
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

    for (const section of sections) {
        addAISection(
            document,
            section.title,
            section.body
        );
    }
}

// ============================================================
// GEMENSAM RAPPORTDEL
// ============================================================

function addReportBody(
    document: PDFKit.PDFDocument,
    results: QACheckResult[],
    aiAnalysis?: string
): void {
    const totalPages =
        getTotalPages(results);

    const findings =
        deriveFindings(results);

    addSummaryCard(
        document,
        results
    );

    addDoFirst(
        document,
        findings
    );

    addFindings(
        document,
        findings,
        totalPages
    );

    addPerformance(
        document,
        results
    );

    addWhatWorks(
        document,
        results
    );

    if (
        aiAnalysis &&
        aiAnalysis.trim()
    ) {
        addAIAnalysis(
            document,
            aiAnalysis
        );
    }

    if (
        INCLUDE_TECHNICAL_APPENDIX
    ) {
        addTechnicalAppendix(
            document,
            results
        );
    }
}

// ============================================================
// PDF-SKRIVNING
// ============================================================

async function finishPDF(
    document: PDFKit.PDFDocument,
    stream: fs.WriteStream
): Promise<void> {
    await new Promise<void>(
        (resolve, reject) => {
            stream.once(
                "finish",
                () => resolve()
            );

            stream.once(
                "error",
                (error) =>
                    reject(error)
            );

            document.end();
        }
    );
}

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

    const document =
        new PDFDocument({
            size: "A4",
            margin: PAGE.margin,
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

    document.pipe(stream);

    addReportHeader(
        document,
        data.websiteUrl,
        "Automatiserad QA-rapport"
    );

    addWebsiteInformation(
        document,
        data.websiteUrl,
        getTotalPages(
            data.results
        ),
        data.results.length
    );

    addReportBody(
        document,
        data.results,
        data.aiAnalysis
    );

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

    const document =
        new PDFDocument({
            size: "A4",
            margin: PAGE.margin,
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

    // --------------------------------------------------------
    // ÖVERSIKT
    // --------------------------------------------------------

    addReportHeader(
        document,
        "CSV-import",
        "Sammanställd QA-rapport"
    );

    const completed =
        reports.filter(
            (r) => r.success
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
        .fill(COLORS.light);

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
        .fillColor(COLORS.dark)
        .fontSize(20)
        .text(
            String(reports.length),
            70,
            overviewY + 31
        );

    document
        .fillColor(COLORS.pass)
        .fontSize(8)
        .text(
            "KLARA",
            225,
            overviewY + 15
        );

    document
        .fontSize(18)
        .text(
            String(completed),
            225,
            overviewY + 31
        );

    document
        .fillColor(COLORS.fail)
        .fontSize(8)
        .text(
            "MISSLYCKADE",
            350,
            overviewY + 15
        );

    document
        .fontSize(18)
        .text(
            String(failed),
            350,
            overviewY + 31
        );

    document
        .fillColor(
            COLORS.secondaryText
        )
        .font("Helvetica")
        .fontSize(8)
        .text(
            `Rapport skapad: ${getReportDate()}`,
            70,
            overviewY + 68
        );

    document.y =
        overviewY + 110;

    // --------------------------------------------------------
    // RESULTAT PER WEBBPLATS
    // --------------------------------------------------------

    addSectionTitle(
        document,
        "Resultat per webbplats",
        "Översikt över status och antal kontroller för varje webbplats."
    );

    for (const report of reports) {
        if (!report.success) {
            const errorText =
                shortenText(
                    report.error ??
                        "Okänt fel",
                    500
                );

            const errorHeight =
                Math.max(
                    65,
                    measure(
                        document,
                        errorText,
                        PAGE.contentWidth -
                            125,
                        "Helvetica",
                        8
                    ) + 42
                );

            ensureSpace(
                document,
                errorHeight + 10,
                "Resultat per webbplats"
            );

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
                .fillColor(COLORS.fail)
                .font("Helvetica-Bold")
                .fontSize(9)
                .text(
                    "FAIL",
                    65,
                    startY + 12
                );

            document
                .fillColor(COLORS.text)
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

        const counts =
            getResultCounts(
                report.results
            );

        const overallStatus =
            getOverallStatus(
                report.results
            );

        const cardHeight = 82;

        ensureSpace(
            document,
            cardHeight + 10,
            "Resultat per webbplats"
        );

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
                getStatusBackground(
                    overallStatus
                )
            );

        document
            .fillColor(
                getStatusColor(
                    overallStatus
                )
            )
            .font("Helvetica-Bold")
            .fontSize(9)
            .text(
                overallStatus,
                65,
                startY + 12
            );

        document
            .fillColor(COLORS.text)
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
            .fillColor(COLORS.pass)
            .font("Helvetica")
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
            .fillColor(COLORS.fail)
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

    // --------------------------------------------------------
    // DETALJER PER WEBBPLATS
    // --------------------------------------------------------

    for (const report of reports) {
        startNewPage(
            document,
            "Detaljerad QA-rapport"
        );

        document
            .fillColor(
                COLORS.secondaryText
            )
            .font("Helvetica")
            .fontSize(8.5)
            .text(
                report.websiteUrl,
                PAGE.margin,
                document.y
            );

        document.y += 22;

        if (!report.success) {
            addSectionTitle(
                document,
                "Skanningen misslyckades"
            );

            document
                .fillColor(COLORS.fail)
                .font("Helvetica-Bold")
                .fontSize(12)
                .text(
                    "FAIL",
                    PAGE.margin,
                    document.y
                );

            document.y += 22;

            document
                .fillColor(COLORS.muted)
                .font("Helvetica")
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

        addReportBody(
            document,
            report.results,
            report.aiAnalysis
        );
    }

    await finishPDF(
        document,
        stream
    );

    return filePath;
}