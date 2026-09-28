// =========================================================
// API-ENDPOINTS
// =========================================================

// API-endpoint för vanlig QA-skanning av en webbplats.
const API_URL = "http://localhost:3000/api/scan";

// API-endpoint för CSV-skanning av flera webbplatser.
const CSV_API_URL = "http://localhost:3000/api/scan-csv";

// Basadressen till backend-servern.
// Används för att skapa korrekta absoluta URL:er till PDF-filer.
const API_BASE_URL = "http://localhost:3000";


// =========================================================
// HTML-ELEMENT
// =========================================================

// Hämtar HTML-element från popupen.

// Inputfält för vanlig webbplats.
const urlInput = document.getElementById("url");

// Knapp för vanlig QA-skanning.
// ID:t måste matcha id="scanButton" i popup.html.
const startButton = document.getElementById("scanButton");

// CSV-filväljare.
const csvFileInput = document.getElementById("csvFile");

// Knapp för CSV-skanning.
const csvScanButton = document.getElementById("csvScanButton");

// Progress-container.
const progressContainer = document.getElementById("progressContainer");

// Text som visar aktuell progress-status.
const progressStatus = document.getElementById("progressStatus");

// Text som visar procent.
const progressPercent = document.getElementById("progressPercent");

// Själva progressbaren.
const progressFill = document.getElementById("progressFill");

// Statusfält.
const statusElement = document.getElementById("status");

// Resultatområde.
const resultsElement = document.getElementById("results");

// Knapp för att öppna PDF.
const pdfButton = document.getElementById("pdfButton");

// Knapp för att ladda ner PDF.
const downloadPdfButton = document.getElementById("downloadPdfButton");


// =========================================================
// VARIABLER
// =========================================================

// Sparar URL till den senast skapade PDF-rapporten.
let latestPdfUrl = null;

// Timer för progressbaren.
let progressTimer = null;

// Aktuell progress.
let currentProgress = 0;


// =========================================================
// HJÄLPFUNKTIONER
// =========================================================

// Visar ett meddelande i statusfältet.
function setStatus(message) {

    // Skriver meddelandet till statusfältet.
    statusElement.textContent = message;
}


// =========================================================
// PROGRESSBAR
// =========================================================

// Uppdaterar progressbaren.
function updateProgress(value, message = null) {

    // Säkerställer att värdet ligger mellan 0 och 100.
    currentProgress = Math.max(0, Math.min(100, value));

    // Uppdaterar procenttexten.
    progressPercent.textContent = `${currentProgress}%`;

    // Uppdaterar själva progressbaren.
    progressFill.style.width = `${currentProgress}%`;

    // Uppdaterar statusmeddelandet om ett meddelande skickades med.
    if (message) {
        progressStatus.textContent = message;
    }
}


// =========================================================
// STARTA PROGRESS
// =========================================================

// Startar en långsamt ökande progressbar medan backend arbetar.
function startProgress() {

    // Börjar från 0%.
    currentProgress = 0;

    // Visar startmeddelandet.
    updateProgress(0, "Startar QA-skanning...");

    // Visar progress-sektionen.
    progressContainer.hidden = false;

    // Döljer gamla PDF-knappar.
    pdfButton.hidden = true;
    downloadPdfButton.hidden = true;

    // Tar bort eventuell gammal timer.
    if (progressTimer) {
        clearInterval(progressTimer);
    }

    // Uppdaterar progress ungefär varje sekund.
    progressTimer = setInterval(() => {

        // Vi låter aldrig den visuella progressbaren nå 100%
        // innan backend faktiskt är färdig.
        if (currentProgress < 70) {

            currentProgress += 1;

        } else if (currentProgress < 90) {

            // Efter 70% går progressen långsammare.
            // Detta gör att den inte når 100% innan backend är klar.
            if (Math.random() > 0.5) {
                currentProgress += 1;
            }
        }

        // Standardmeddelande.
        let message = "Startar QA-skanning...";

        // Anpassar meddelandet efter aktuell progress.
        if (currentProgress >= 25 && currentProgress < 50) {

            message = "Analyserar webbplats...";

        } else if (currentProgress >= 50 && currentProgress < 70) {

            message = "Kör QA-kontroller...";

        } else if (currentProgress >= 70 && currentProgress < 85) {

            message = "Analyserar resultat...";

        } else if (currentProgress >= 85) {

            message = "Slutför QA-skanning...";
        }

        // Uppdaterar progressbaren.
        updateProgress(currentProgress, message);

    }, 1000);
}


// =========================================================
// AVSLUTA PROGRESS
// =========================================================

// Stoppar progressbaren när backend är klar.
function finishProgress() {

    // Stoppar timern.
    if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
    }

    // Visar 100%.
    updateProgress(100, "QA-skanning klar.");
}


// =========================================================
// ÅTERSTÄLL PROGRESS
// =========================================================

// Återställer progressbaren inför en ny skanning.
function resetProgress() {

    // Stoppar eventuell aktiv timer.
    if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
    }

    // Återställer progressvärdet.
    currentProgress = 0;

    // Döljer progress-sektionen.
    progressContainer.hidden = true;

    // Återställer procent.
    progressPercent.textContent = "0%";

    // Återställer progressbaren.
    progressFill.style.width = "0%";

    // Återställer texten.
    progressStatus.textContent = "Startar...";
}


// =========================================================
// PDF-URL
// =========================================================

// Gör en PDF-URL absolut.
//
// Backend kan exempelvis returnera:
// /api/reports/QA-Report-digitalkontakt.se.pdf
//
// Denna funktion gör då om den till:
// http://localhost:3000/api/reports/QA-Report-digitalkontakt.se.pdf
function createAbsolutePdfUrl(pdfUrl) {

    // Kontrollerar att backend faktiskt skickade en URL.
    if (!pdfUrl) {
        return null;
    }

    try {

        // Skapar en absolut URL baserad på backend-servern.
        return new URL(pdfUrl, API_BASE_URL).href;

    } catch (error) {

        // Loggar fel om URL:en inte kunde skapas.
        console.error("Kunde inte skapa PDF-URL:", error);

        return null;
    }
}


// =========================================================
// VISA VANLIGA QA-RESULTAT
// =========================================================

// Visar resultat från en vanlig webbplatsskanning.
function displayResults(data) {

    // Rensar gamla resultat.
    resultsElement.innerHTML = "";

    // Visar övergripande status om backend skickade den.
    if (data.overallStatus) {

        // Skapar ett nytt resultatkort.
        const overall = document.createElement("div");

        // Lägger till CSS-klass.
        overall.className = "result-summary";

        // Visar statusen.
        overall.innerHTML = `
            <strong>Övergripande status:</strong>
            ${data.overallStatus}
        `;

        // Lägger till resultatet på sidan.
        resultsElement.appendChild(overall);
    }


    // Kontrollerar att QA-resultat finns.
    if (data.results && Array.isArray(data.results)) {

        // Räknar PASS.
        const passCount = data.results.filter(
            result => result.status === "PASS"
        ).length;

        // Räknar WARNING.
        const warningCount = data.results.filter(
            result => result.status === "WARNING"
        ).length;

        // Räknar FAIL.
        const failCount = data.results.filter(
            result => result.status === "FAIL"
        ).length;

        // Skapar resultatsammanfattning.
        const summary = document.createElement("div");

        // CSS-klass.
        summary.className = "result-summary";

        // Visar resultat.
        summary.innerHTML = `
            <strong>QA-resultat</strong><br>
            PASS: ${passCount}<br>
            WARNING: ${warningCount}<br>
            FAIL: ${failCount}
        `;

        // Lägger till resultatet.
        resultsElement.appendChild(summary);
    }


    // Kontrollerar om backend skapade en PDF.
    if (data.pdfUrl) {

        // Gör PDF-URL:en absolut.
        latestPdfUrl = createAbsolutePdfUrl(data.pdfUrl);

        // Kontrollerar att URL:en kunde skapas.
        if (latestPdfUrl) {

            // Visar knappen för att öppna PDF.
            pdfButton.hidden = false;

            // Visar knappen för att ladda ner PDF.
            downloadPdfButton.hidden = false;
        }
    }
}


// =========================================================
// VISA CSV-RESULTAT
// =========================================================

// Visar resultat från CSV-skanningen.
function displayCSVResults(data) {

    // Rensar gamla resultat.
    resultsElement.innerHTML = "";


    // Skapar rubrik för CSV-resultatet.
    const title = document.createElement("div");

    // CSS-klass.
    title.className = "csv-result";

    // Visar sammanfattningen.
    title.innerHTML = `
        <strong>CSV-resultat</strong><br>
        Totalt: ${data.total}<br>
        Klara: ${data.completed}<br>
        Misslyckade: ${data.failed}
    `;

    // Lägger till sammanfattningen.
    resultsElement.appendChild(title);


    // Kontrollerar om resultat finns.
    if (data.results && Array.isArray(data.results)) {

        // Går igenom varje webbplats.
        data.results.forEach((site) => {

            // Skapar resultatkort.
            const siteResult = document.createElement("div");

            // CSS-klass.
            siteResult.className = "csv-result";


            // Om webbplatsen lyckades.
            if (site.success) {

                siteResult.innerHTML = `
                    <strong>${site.websiteUrl}</strong><br>
                    Status: QA klar
                `;

            }

            // Om webbplatsen misslyckades.
            else {

                siteResult.innerHTML = `
                    <strong>${site.websiteUrl}</strong><br>
                    FEL: ${site.error || "Okänt fel"}
                `;
            }

            // Lägger till webbplatsens resultat.
            resultsElement.appendChild(siteResult);
        });
    }


    // Backend skapar EN gemensam PDF för hela CSV-filen.
    if (data.pdfUrl) {

        // Gör PDF-URL:en absolut.
        latestPdfUrl = createAbsolutePdfUrl(data.pdfUrl);

        // Kontrollerar att PDF-URL:en skapades korrekt.
        if (latestPdfUrl) {

            // Skapar ett område för PDF-informationen.
            const pdfContainer = document.createElement("div");

            // CSS-klass.
            pdfContainer.className = "csv-pdf-link";

            // Visar att den gemensamma PDF-rapporten är klar.
            pdfContainer.innerHTML = `
                <strong>Samlad PDF-rapport</strong><br>
                PDF-rapporten är klar.
            `;

            // Lägger till PDF-informationen.
            resultsElement.appendChild(pdfContainer);

            // Visar knappen för att öppna PDF.
            pdfButton.hidden = false;

            // Visar knappen för att ladda ner PDF.
            downloadPdfButton.hidden = false;
        }
    }
}


// =========================================================
// VANLIG QA-SKANNING
// =========================================================

// Startar vanlig QA-skanning när användaren klickar på Start QA.
startButton.addEventListener("click", async () => {

    // Hämtar URL från inputfältet.
    const url = urlInput.value.trim();

    // Kontrollerar att användaren har skrivit en URL.
    if (!url) {

        setStatus("Ange en webbplats.");

        return;
    }


    // Rensar gamla resultat.
    resultsElement.innerHTML = "";

    // Nollställer tidigare PDF.
    latestPdfUrl = null;

    // Döljer PDF-knapparna tills ny PDF finns.
    pdfButton.hidden = true;
    downloadPdfButton.hidden = true;

    // Startar progressbaren.
    startProgress();

    // Inaktiverar knappen under skanningen.
    startButton.disabled = true;


    try {

        // Skickar URL till backend.
        const response = await fetch(API_URL, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                url: url
            })
        });


        // Försöker läsa backend-svaret som JSON.
        const data = await response.json();


        // Om backend returnerade ett fel.
        if (!response.ok) {

            throw new Error(
                data.error || "QA-skanningen misslyckades."
            );
        }


        // Backend är klar.
        finishProgress();

        // Visar resultat.
        displayResults(data);

        // Visar slutstatus.
        setStatus("QA-skanning klar.");

    } catch (error) {

        // Backend eller nätverket gav ett fel.
        finishProgress();

        // Visar felmeddelande.
        setStatus(`FEL: ${error.message}`);

        // Visar felet i resultatområdet.
        resultsElement.innerHTML = `
            <div class="csv-result">
                <strong>Skanningen misslyckades.</strong><br>
                ${error.message}
            </div>
        `;

    } finally {

        // Aktiverar knappen igen.
        startButton.disabled = false;
    }
});


// =========================================================
// CSV QA-SKANNING
// =========================================================

// Startar CSV-skanning när användaren klickar på Start CSV QA.
csvScanButton.addEventListener("click", async () => {

    // Kontrollerar att en CSV-fil har valts.
    if (
        !csvFileInput.files ||
        csvFileInput.files.length === 0
    ) {

        setStatus("Välj en CSV-fil först.");

        return;
    }


    // Hämtar den valda filen.
    const file = csvFileInput.files[0];


    // Kontrollerar filändelsen.
    if (!file.name.toLowerCase().endsWith(".csv")) {

        setStatus("Välj en CSV-fil.");

        return;
    }


    // Läser CSV-filen som text.
    const csvText = await file.text();


    // Delar upp CSV-filen rad för rad.
    const lines = csvText
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);


    // Tar bort eventuell header.
    const urls = lines

        // Tar bort raden som innehåller "url".
        .filter(
            line => !line.toLowerCase().includes("url")
        )

        // Tar första kolumnen.
        .map(
            line => line.split(",")[0].trim()
        )

        // Behåller endast riktiga HTTP/HTTPS-URL:er.
        .filter(
            url =>
                url.startsWith("http://") ||
                url.startsWith("https://")
        );


    // Kontrollerar att minst en URL hittades.
    if (urls.length === 0) {

        setStatus(
            "Inga giltiga webbplatser hittades i CSV-filen."
        );

        return;
    }


    // Rensar gamla resultat.
    resultsElement.innerHTML = "";

    // Nollställer PDF.
    latestPdfUrl = null;

    // Döljer gamla PDF-knappar.
    pdfButton.hidden = true;
    downloadPdfButton.hidden = true;

    // Inaktiverar CSV-knappen under skanningen.
    csvScanButton.disabled = true;

    // Startar progressbaren.
    startProgress();


    try {

        // Skickar ALLA URL:er till backend i ETT enda anrop.
        //
        // Backend kommer sedan:
        //
        // 1. Skanna alla webbplatser.
        // 2. Samla resultaten.
        // 3. Skapa EN gemensam PDF.
        // 4. Returnera EN PDF-länk.
        const response = await fetch(CSV_API_URL, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                urls: urls
            })
        });


        // Läser backend-svaret.
        const data = await response.json();


        // Kontrollerar HTTP-status.
        if (!response.ok) {

            throw new Error(
                data.error ||
                "CSV-skanningen misslyckades."
            );
        }


        // Backend är klar.
        finishProgress();

        // Visar alla CSV-resultat.
        displayCSVResults(data);

        // Visar slutstatus.
        setStatus("CSV QA-skanning klar.");

    } catch (error) {

        // Hanterar nätverksfel eller backend-fel.
        finishProgress();

        // Visar felmeddelande.
        setStatus(`FEL: ${error.message}`);

        // Visar felet i resultatområdet.
        resultsElement.innerHTML = `
            <div class="csv-result">
                <strong>CSV-skanningen misslyckades.</strong><br>
                ${error.message}
            </div>
        `;

    } finally {

        // Aktiverar CSV-knappen igen.
        csvScanButton.disabled = false;
    }
});


// =========================================================
// ÖPPNA PDF
// =========================================================

// Öppnar PDF-rapporten i en ny flik.
pdfButton.addEventListener("click", () => {

    // Kontrollerar att en PDF finns.
    if (!latestPdfUrl) {

        setStatus("Ingen PDF-rapport finns ännu.");

        return;
    }


    // Öppnar endast den riktiga PDF-URL:en.
    //
    // Eftersom pdfButton nu är en vanlig button
    // finns inget href="#" som kan öppna popup.html.
    window.open(latestPdfUrl, "_blank");
});


// =========================================================
// LADDA NER PDF
// =========================================================

// Laddar ner den senast skapade PDF-rapporten.
downloadPdfButton.addEventListener("click", async () => {

    // Kontrollerar att en PDF finns.
    if (!latestPdfUrl) {

        setStatus("Ingen PDF-rapport finns ännu.");

        return;
    }


    try {

        // Visar status medan PDF hämtas.
        setStatus("Laddar ner PDF...");


        // Hämtar PDF-filen från backend.
        const response = await fetch(latestPdfUrl);


        // Kontrollerar att servern returnerade en lyckad status.
        if (!response.ok) {

            throw new Error(
                "PDF-filen kunde inte hämtas."
            );
        }


        // Läser svaret som en Blob.
        const blob = await response.blob();


        // Skapar en temporär URL för PDF-filen.
        const blobUrl = URL.createObjectURL(blob);


        // Skapar en temporär HTML-länk.
        const link = document.createElement("a");


        // Kopplar PDF-filen till länken.
        link.href = blobUrl;


        // Anger filnamnet vid nedladdning.
        link.download = "Website-QA-Report.pdf";


        // Lägger länken tillfälligt i popupen.
        document.body.appendChild(link);


        // Startar nedladdningen.
        link.click();


        // Tar bort den temporära länken.
        link.remove();


        // Frigör den temporära Blob-URL:en.
        URL.revokeObjectURL(blobUrl);


        // Visar att nedladdningen startat.
        setStatus("PDF-nedladdning startad.");

    } catch (error) {

        // Visar fel om PDF:n inte kunde laddas ner.
        setStatus(
            `FEL vid PDF-nedladdning: ${error.message}`
        );
    }
});