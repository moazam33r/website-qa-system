// =========================================================
// API-ENDPOINTS
// =========================================================

// API-endpoint för vanlig QA-skanning av en webbplats.
const API_URL = "http://localhost:3000/api/scan";

// API-endpoint för vanlig CSV-skanning.
const CSV_API_URL = "http://localhost:3000/api/scan-csv";

// API-endpoint för CSV-skanning med riktig progress.
const CSV_PROGRESS_API_URL = "http://localhost:3000/api/scan-csv-progress";

// Basadress till backend-servern.
const API_BASE_URL = "http://localhost:3000";


// =========================================================
// HTML-ELEMENT
// =========================================================

// Inputfält för vanlig webbplats.
const urlInput = document.getElementById("url");

// Knapp för vanlig QA-skanning.
const startButton = document.getElementById("scanButton");

// CSV-filväljare.
const csvFileInput = document.getElementById("csvFile");

// Knapp för CSV-skanning.
const csvScanButton = document.getElementById("csvScanButton");

// Progress-container.
const progressContainer = document.getElementById("progressContainer");

// Progress-status.
const progressStatus = document.getElementById("progressStatus");

// Progress-procent.
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

// URL till senaste PDF-rapporten.
let latestPdfUrl = null;

// Timer för vanlig QA-skanning.
let progressTimer = null;

// Aktuell progress.
let currentProgress = 0;

// Webbplatser i aktuell CSV-skanning.
let csvWebsites = [];

// Antal färdiganalyserade webbplatser.
let csvCompletedCount = 0;


// =========================================================
// STATUS
// =========================================================

// Visar meddelande i statusfältet.
function setStatus(message) {
    statusElement.textContent = message;
}


// =========================================================
// PROGRESSBAR
// =========================================================

// Uppdaterar progressbaren.
function updateProgress(value, message = null) {

    // Begränsar värdet mellan 0 och 100.
    currentProgress = Math.max(0, Math.min(100, value));

    // Uppdaterar procenttexten.
    progressPercent.textContent = `${currentProgress}%`;

    // Uppdaterar progressbarens bredd.
    progressFill.style.width = `${currentProgress}%`;

    // Uppdaterar texten om ett meddelande skickades.
    if (message) {
        progressStatus.textContent = message;
    }
}


// =========================================================
// VANLIG QA-PROGRESS
// =========================================================

// Startar progressbaren för vanlig QA-skanning.
function startProgress() {

    // Börjar från 0%.
    currentProgress = 0;

    // Visar startmeddelande.
    updateProgress(0, "Startar QA-skanning...");

    // Visar progressområdet.
    progressContainer.hidden = false;

    // Döljer PDF-knapparna.
    pdfButton.hidden = true;
    downloadPdfButton.hidden = true;

    // Tar bort eventuell gammal timer.
    if (progressTimer) {
        clearInterval(progressTimer);
    }

    // Simulerar progress eftersom vanlig /api/scan
    // inte skickar detaljerad progress.
    progressTimer = setInterval(() => {

        if (currentProgress < 70) {
            currentProgress += 1;

        } else if (currentProgress < 90) {

            if (Math.random() > 0.5) {
                currentProgress += 1;
            }
        }

        let message = "Startar QA-skanning...";

        if (currentProgress >= 25 && currentProgress < 50) {
            message = "Analyserar webbplats...";

        } else if (currentProgress >= 50 && currentProgress < 70) {
            message = "Kör QA-kontroller...";

        } else if (currentProgress >= 70 && currentProgress < 85) {
            message = "Analyserar resultat...";

        } else if (currentProgress >= 85) {
            message = "Slutför QA-skanning...";
        }

        updateProgress(currentProgress, message);

    }, 1000);
}


// =========================================================
// CSV-SIDOR
// =========================================================

// Visar status för varje webbplats.
//
// ✓ = Klar
// ⟳ = Analyserar
// ○ = Väntar
function renderCSVSiteProgress() {

    // Tar bort tidigare lista.
    const oldList = document.querySelector(".csv-site-progress");

    if (oldList) {
        oldList.remove();
    }

    // Skapar nytt område.
    const progressList = document.createElement("div");

    // CSS-klass.
    progressList.className = "csv-site-progress";

    // Rubrik.
    const heading = document.createElement("div");

    heading.className = "csv-progress-title";
    heading.innerHTML = "<strong>CSV QA-ANALYS</strong>";

    progressList.appendChild(heading);


    // Går igenom alla webbplatser.
    csvWebsites.forEach((websiteUrl, index) => {

        // Skapar rad.
        const row = document.createElement("div");

        row.className = "csv-site-row";


        // Standard = väntar.
        let icon = "○";
        let statusText = "Väntar";


        // Färdig webbplats.
        if (index < csvCompletedCount) {

            icon = "✓";
            statusText = "Klar";

        // Nästa webbplats analyseras.
        } else if (index === csvCompletedCount) {

            icon = "⟳";
            statusText = "Analyserar...";
        }


        // Visar informationen.
        row.innerHTML = `
            <span class="csv-site-number">${icon} ${index + 1}</span>
            <span class="csv-site-url">${websiteUrl}</span>
            <span class="csv-site-status">${statusText}</span>
        `;

        progressList.appendChild(row);
    });


    // Lägger listan längst upp.
    resultsElement.prepend(progressList);
}


// =========================================================
// STARTA CSV-PROGRESS
// =========================================================

// Startar riktig CSV-progress.
// Ingen timer används här.
function startCSVProgress(urls) {

    // Sparar URL-listan.
    csvWebsites = [...urls];

    // Börjar med 0 färdiga.
    csvCompletedCount = 0;

    // Börjar från 0%.
    currentProgress = 0;

    // Visar progressområdet.
    progressContainer.hidden = false;

    // Döljer PDF-knappar.
    pdfButton.hidden = true;
    downloadPdfButton.hidden = true;

    // Rensar gamla resultat.
    resultsElement.innerHTML = "";

    // Visar startmeddelande.
    updateProgress(0, "Startar QA-analys...");

    // Visar alla webbplatser.
    renderCSVSiteProgress();
}


// =========================================================
// UPPDATERA CSV-PROGRESS
// =========================================================

// Uppdaterar progress baserat på backendens riktiga progress.
function updateCSVProgress(data) {

    // Kontrollerar att backend skickade rätt data.
    if (
        typeof data.completed !== "number" ||
        typeof data.total !== "number"
    ) {
        return;
    }

    // Sparar antal färdiga webbplatser.
    csvCompletedCount = data.completed;

    // Visar vilken webbplats som analyseras.
    if (data.completed < data.total) {

        updateProgress(
            data.percentage,
            `Analyserar webbplats ${data.completed + 1} av ${data.total}`
        );

    } else {

        // Alla webbplatser är klara.
        updateProgress(
            data.percentage,
            "Alla webbplatser analyserade."
        );
    }

    // Uppdaterar ✓ / ⟳ / ○.
    renderCSVSiteProgress();
}


// =========================================================
// AVSLUTA PROGRESS
// =========================================================

// Avslutar progressbaren.
function finishProgress() {

    // Stoppar timer.
    if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
    }

    // Visar 100%.
    updateProgress(100, "QA-skanning klar.");
}


// =========================================================
// PDF-URL
// =========================================================

// Gör PDF-URL absolut.
function createAbsolutePdfUrl(pdfUrl) {

    if (!pdfUrl) {
        return null;
    }

    try {

        return new URL(pdfUrl, API_BASE_URL).href;

    } catch (error) {

        console.error("Kunde inte skapa PDF-URL:", error);

        return null;
    }
}


// =========================================================
// VISA VANLIGA RESULTAT
// =========================================================

// Visar resultat från vanlig QA-skanning.
function displayResults(data) {

    resultsElement.innerHTML = "";

    // Visar övergripande status.
    if (data.overallStatus) {

        const overall = document.createElement("div");

        overall.className = "result-summary";

        overall.innerHTML = `
            <strong>Övergripande status:</strong>
            ${data.overallStatus}
        `;

        resultsElement.appendChild(overall);
    }


    // Visar QA-resultat.
    if (data.results && Array.isArray(data.results)) {

        const passCount = data.results.filter(
            result => result.status === "PASS"
        ).length;

        const warningCount = data.results.filter(
            result => result.status === "WARNING"
        ).length;

        const failCount = data.results.filter(
            result => result.status === "FAIL"
        ).length;

        const summary = document.createElement("div");

        summary.className = "result-summary";

        summary.innerHTML = `
            <strong>QA-resultat</strong><br>
            PASS: ${passCount}<br>
            WARNING: ${warningCount}<br>
            FAIL: ${failCount}
        `;

        resultsElement.appendChild(summary);
    }


    // Visar PDF-knappar om PDF finns.
    if (data.pdfUrl) {

        latestPdfUrl = createAbsolutePdfUrl(data.pdfUrl);

        if (latestPdfUrl) {

            pdfButton.hidden = false;
            downloadPdfButton.hidden = false;
        }
    }
}


// =========================================================
// VISA CSV-RESULTAT
// =========================================================

// Visar slutresultatet från CSV-skanningen.
function displayCSVResults(data) {

    resultsElement.innerHTML = "";

    // Sammanfattning.
    const title = document.createElement("div");

    title.className = "csv-result";

    title.innerHTML = `
        <strong>CSV-resultat</strong><br>
        Totalt: ${data.total}<br>
        Klara: ${data.completed}<br>
        Misslyckade: ${data.failed}
    `;

    resultsElement.appendChild(title);


    // Visar varje webbplats.
    if (data.results && Array.isArray(data.results)) {

        data.results.forEach((site) => {

            const siteResult = document.createElement("div");

            siteResult.className = "csv-result";


            if (site.success) {

                siteResult.innerHTML = `
                    <strong>${site.websiteUrl}</strong><br>
                    Status: QA klar
                `;

            } else {

                siteResult.innerHTML = `
                    <strong>${site.websiteUrl}</strong><br>
                    FEL: ${site.error || "Okänt fel"}
                `;
            }

            resultsElement.appendChild(siteResult);
        });
    }


    // Visar PDF-information.
    if (data.pdfUrl) {

        latestPdfUrl = createAbsolutePdfUrl(data.pdfUrl);

        if (latestPdfUrl) {

            const pdfContainer = document.createElement("div");

            pdfContainer.className = "csv-pdf-link";

            pdfContainer.innerHTML = `
                <strong>Samlad PDF-rapport</strong><br>
                PDF-rapporten är klar.
            `;

            resultsElement.appendChild(pdfContainer);

            pdfButton.hidden = false;
            downloadPdfButton.hidden = false;
        }
    }
}


// =========================================================
// VANLIG QA-SKANNING
// =========================================================

startButton.addEventListener("click", async () => {

    // Hämtar URL.
    const url = urlInput.value.trim();

    // Kontrollerar URL.
    if (!url) {

        setStatus("Ange en webbplats.");

        return;
    }


    // Rensar gamla resultat.
    resultsElement.innerHTML = "";

    // Nollställer PDF.
    latestPdfUrl = null;

    // Döljer PDF-knappar.
    pdfButton.hidden = true;
    downloadPdfButton.hidden = true;

    // Startar progress.
    startProgress();

    // Inaktiverar knappen.
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


        // Läser JSON.
        const data = await response.json();


        // Hanterar backend-fel.
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

        finishProgress();

        setStatus(`FEL: ${error.message}`);

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

csvScanButton.addEventListener("click", async () => {

    // Kontrollerar CSV-fil.
    if (
        !csvFileInput.files ||
        csvFileInput.files.length === 0
    ) {

        setStatus("Välj en CSV-fil först.");

        return;
    }


    // Hämtar filen.
    const file = csvFileInput.files[0];


    // Kontrollerar filändelse.
    if (!file.name.toLowerCase().endsWith(".csv")) {

        setStatus("Välj en CSV-fil.");

        return;
    }


    // Läser CSV-filen.
    const csvText = await file.text();


    // Delar upp CSV-filen.
    const lines = csvText
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);


    // Hämtar URL:er.
    const urls = lines
        .filter(
            line => !line.toLowerCase().includes("url")
        )
        .map(
            line => line.split(",")[0].trim()
        )
        .filter(
            url =>
                url.startsWith("http://") ||
                url.startsWith("https://")
        );


    // Kontrollerar att URL hittades.
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

    // Döljer PDF-knappar.
    pdfButton.hidden = true;
    downloadPdfButton.hidden = true;

    // Inaktiverar CSV-knappen.
    csvScanButton.disabled = true;


    // Startar riktig CSV-progress.
    startCSVProgress(urls);


    try {

        // Skickar URL-listan till progress-endpointen.
        const response = await fetch(
            CSV_PROGRESS_API_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    urls: urls
                })
            }
        );


        // Kontrollerar HTTP-status.
        if (!response.ok) {

            let errorMessage =
                `CSV-skanningen misslyckades (${response.status}).`;

            try {

                const errorData = await response.json();

                errorMessage =
                    errorData.error || errorMessage;

            } catch (error) {
                // Använder standardfelet om svaret inte är JSON.
            }

            throw new Error(errorMessage);
        }


        // Kontrollerar att streaming finns.
        if (!response.body) {

            throw new Error(
                "Backend skickade ingen progress-stream."
            );
        }


        // Hämtar stream-läsaren.
        const reader = response.body.getReader();

        // Omvandlar bytes till text.
        const decoder = new TextDecoder();

        // Buffer för SSE-data.
        let buffer = "";


        // Läser streamen.
        while (true) {

            const { value, done } = await reader.read();


            // Streamen är klar.
            if (done) {
                break;
            }


            // Lägger ny data i buffern.
            buffer += decoder.decode(value, {
                stream: true
            });


            // SSE-event separeras med tom rad.
            const events = buffer.split(/\r?\n\r?\n/);

            // Sparar event som ännu inte är komplett.
            buffer = events.pop() || "";


            // Hanterar kompletta events.
            for (const eventText of events) {

                // Delar eventet i rader.
                const eventLines =
                    eventText.split(/\r?\n/);

                let eventType = "";
                let eventData = "";


                // Läser eventets innehåll.
                eventLines.forEach((line) => {

                    if (line.startsWith("event:")) {

                        eventType = line
                            .replace("event:", "")
                            .trim();
                    }

                    if (line.startsWith("data:")) {

                        eventData += line
                            .replace("data:", "")
                            .trim();
                    }
                });


                // Hoppar över tomma events.
                if (!eventType || !eventData) {
                    continue;
                }


                // Läser JSON.
                let data;

                try {

                    data = JSON.parse(eventData);

                } catch (error) {

                    console.error(
                        "Kunde inte läsa SSE-data:",
                        eventData
                    );

                    continue;
                }


                // ---------------------------------------------
                // START
                // ---------------------------------------------

                if (eventType === "started") {

                    updateProgress(
                        0,
                        "Startar QA-analys..."
                    );

                    renderCSVSiteProgress();
                }


                // ---------------------------------------------
                // PROGRESS
                // ---------------------------------------------

                // ---------------------------------------------
// WEBBPLATS STARTAR
// ---------------------------------------------

else if (eventType === "website-start") {

    // Visar att webbplatsen faktiskt har börjat analyseras.
    const websiteNumber = data.completed + 1;

    // Första webbplatsen får 2% så att progressbaren
    // inte står kvar på 0% medan analysen pågår.
    const startPercentage =
        data.completed === 0
            ? 2
            : data.percentage;

    // Uppdaterar progressbaren.
    updateProgress(
        startPercentage,
        `Analyserar webbplats ${websiteNumber} av ${data.total}`
    );

    // Uppdaterar listan med ✓ / ⟳ / ○.
    renderCSVSiteProgress();
}


// ---------------------------------------------
// PROGRESS
// ---------------------------------------------

else if (eventType === "progress") {

    // En webbplats har faktiskt blivit färdig.
    updateCSVProgress(data);
}


                // ---------------------------------------------
                // PDF
                // ---------------------------------------------

                else if (eventType === "pdf") {

                    updateProgress(
                        95,
                        data.message ||
                        "Skapar PDF-rapport..."
                    );
                }


                // ---------------------------------------------
                // KLAR
                // ---------------------------------------------

                else if (eventType === "complete") {

                    updateProgress(
                        100,
                        "CSV QA-analys klar."
                    );

                    displayCSVResults(data);

                    setStatus("CSV QA-skanning klar.");
                }


                // ---------------------------------------------
                // FEL
                // ---------------------------------------------

                else if (eventType === "error") {

                    throw new Error(
                        data.error ||
                        "CSV-skanningen misslyckades."
                    );
                }
            }
        }

    } catch (error) {

        // Stoppar vanlig progress-timer om den skulle vara aktiv.
        if (progressTimer) {
            clearInterval(progressTimer);
            progressTimer = null;
        }

        // Visar fel.
        setStatus(`FEL: ${error.message}`);

        // Visar felet.
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

pdfButton.addEventListener("click", () => {

    // Kontrollerar att PDF finns.
    if (!latestPdfUrl) {

        setStatus("Ingen PDF-rapport finns ännu.");

        return;
    }

    // Öppnar PDF i ny flik.
    window.open(latestPdfUrl, "_blank");
});


// =========================================================
// LADDA NER PDF
// =========================================================

downloadPdfButton.addEventListener("click", async () => {

    // Kontrollerar att PDF finns.
    if (!latestPdfUrl) {

        setStatus("Ingen PDF-rapport finns ännu.");

        return;
    }


    try {

        // Visar status.
        setStatus("Laddar ner PDF...");


        // Hämtar PDF.
        const response = await fetch(latestPdfUrl);


        // Kontrollerar svar.
        if (!response.ok) {

            throw new Error(
                "PDF-filen kunde inte hämtas."
            );
        }


        // Läser PDF som Blob.
        const blob = await response.blob();


        // Skapar temporär URL.
        const blobUrl = URL.createObjectURL(blob);


        // Skapar temporär länk.
        const link = document.createElement("a");

        link.href = blobUrl;

        link.download = "Website-QA-Report.pdf";


        // Lägger till länken.
        document.body.appendChild(link);


        // Startar nedladdningen.
        link.click();


        // Tar bort länken.
        link.remove();


        // Frigör Blob-URL.
        URL.revokeObjectURL(blobUrl);


        // Visar status.
        setStatus("PDF-nedladdning startad.");

    } catch (error) {

        // Visar fel.
        setStatus(
            `FEL vid PDF-nedladdning: ${error.message}`
        );
    }
});