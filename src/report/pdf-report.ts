// Skapar PDF-rapporter från Website QA System.

// PDFKit används för att skapa själva PDF-filen.
import PDFDocument from "pdfkit";

// Node.js filsystem används för att spara PDF-filen.
import fs from "fs";

// Path används för att skapa korrekta sökvägar.
import path from "path";

// Importerar den befintliga QA-resultattypen.
// På så sätt använder PDF-rapporten samma struktur
// som resten av QA-systemet.
import {
  QACheckResult,
} from "./qa-report";


// Data som behövs för att skapa PDF-rapporten.
export interface PDFReportData {

  // URL:en som har testats.
  websiteUrl: string;

  // Alla QA-resultat från skanningen.
  results: QACheckResult[];

  // AI-analysen är valfri.
  aiAnalysis?: string;
}


// Skapar en PDF-rapport från ett QA-resultat.
export async function createPDFReport(
  data: PDFReportData
): Promise<string> {

  // Mappen där PDF-rapporterna ska sparas.
  const outputDirectory = path.join(
    process.cwd(),
    "reports"
  );

  // Skapar mappen om den inte redan finns.
  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, {
      recursive: true,
    });
  }


  // Hämtar webbplatsens hostname.
  // Exempel:
  // https://digitalkontakt.se
  // blir:
  // digitalkontakt.se
  const hostname = new URL(data.websiteUrl).hostname
    .replace(/^www\./, "")
    .replace(/[^a-zA-Z0-9.-]/g, "-");


  // Skapar namnet på PDF-filen.
  const filePath = path.join(
    outputDirectory,
    `QA-Report-${hostname}.pdf`
  );


  // Skapar PDF-dokumentet.
  const document = new PDFDocument({
    margin: 50,
  });


  // Skapar en stream som skriver PDF-filen till disk.
  const stream = fs.createWriteStream(filePath);


  // Kopplar PDF-dokumentet till filströmmen.
  document.pipe(stream);


  // ==========================================
  // TITEL
  // ==========================================

  document
    .fontSize(24)
    .text("WEBSITE QA SYSTEM", {
      align: "center",
    });

  document.moveDown();

  document
    .fontSize(18)
    .text("QA REPORT", {
      align: "center",
    });

  document.moveDown(2);


  // ==========================================
  // WEBBPLATS
  // ==========================================

  document
    .fontSize(16)
    .text("WEBBPLATS");

  document.moveDown(0.5);

  document
    .fontSize(11)
    .text(`URL: ${data.websiteUrl}`);

  document
    .text(
      `Datum: ${new Date().toLocaleString("sv-SE")}`
    );

  document.moveDown(2);


  // ==========================================
  // RÄKNAR RESULTAT
  // ==========================================

  // Räknar alla PASS-resultat.
  const passed = data.results.filter(
    (result) => result.status === "PASS"
  ).length;


  // Räknar alla WARNING-resultat.
  const warnings = data.results.filter(
    (result) => result.status === "WARNING"
  ).length;


  // Räknar alla FAIL-resultat.
  const failed = data.results.filter(
    (result) => result.status === "FAIL"
  ).length;


  // ==========================================
  // SAMMANFATTNING
  // ==========================================

  document
    .fontSize(16)
    .text("SAMMANFATTNING");

  document.moveDown(0.5);

  document
    .fontSize(12)
    .text(`PASS: ${passed}`);

  document
    .text(`WARNING: ${warnings}`);

  document
    .text(`FAIL: ${failed}`);

  document.moveDown(0.5);


  // Bestämmer det övergripande resultatet.
  let overallStatus = "PASS";

  if (failed > 0) {
    overallStatus = "FAIL";
  } else if (warnings > 0) {
    overallStatus = "WARNING";
  }


  document
    .fontSize(13)
    .text(`RESULTAT: ${overallStatus}`);


  document.moveDown(2);


  // ==========================================
  // QA-KONTROLLER
  // ==========================================

  document
    .fontSize(16)
    .text("QA-KONTROLLER");

  document.moveDown(0.5);


  // Går igenom alla QA-kontroller.
  for (const result of data.results) {

    // Standard-symbol för PASS.
    let symbol = "✓";

    // Ändrar symbol för WARNING.
    if (result.status === "WARNING") {
      symbol = "⚠";
    }

    // Ändrar symbol för FAIL.
    if (result.status === "FAIL") {
      symbol = "✗";
    }


    // Skriver resultatets namn och status.
    document
      .fontSize(11)
      .text(
        `${symbol} ${result.name}: ${result.status}`
      );


    // Skriver resultatets meddelande.
    document
      .fontSize(9)
      .text(
        result.message,
        {
          indent: 15,
        }
      );


    // Lägger lite mellanrum mellan kontrollerna.
    document.moveDown(0.7);
  }


  // ==========================================
  // AI-ANALYS
  // ==========================================

  if (data.aiAnalysis) {

    // Börjar AI-analysen på en ny sida.
    document.addPage();


    document
      .fontSize(16)
      .text("AI-ANALYS");

    document.moveDown();


    document
      .fontSize(10)
      .text(data.aiAnalysis);
  }


  // ==========================================
  // AVSLUTAR PDF
  // ==========================================

  // Avslutar PDF-dokumentet.
  document.end();


  // Väntar tills PDF-filen är färdigskriven.
  await new Promise<void>((resolve, reject) => {

    // Körs när filen är färdig.
    stream.on("finish", () => {
      resolve();
    });


    // Hanterar eventuella skrivfel.
    stream.on("error", (error) => {
      reject(error);
    });
  });


  // Returnerar sökvägen till PDF-filen.
  return filePath;
}