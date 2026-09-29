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
// URL-HANTERING
// =========================================================

// Gör om användarens inmatning till en komplett URL.
function normalizeWebsiteUrl(value) {

    // Tar bort mellanslag före och efter URL:en.
    let url = String(value || "").trim();

    // Tar bort eventuell BOM från början av texten.
    url = url.replace(/^\uFEFF/, "");

    // Tar bort onödiga citattecken runt värdet.
    url = url.replace(/^["']|["']$/g, "").trim();

    // Om användaren inte skrev något returneras tomt.
    if (!url) {
        return "";
    }

    // Om URL:en redan har http:// eller https://
    // låter vi den vara som den är.
    if (
        url.toLowerCase().startsWith("http://") ||
        url.toLowerCase().startsWith("https://")
    ) {
        return url;
    }

    // Om användaren exempelvis skriver:
    // digitalkontakt.se
    // lägger vi automatiskt till https://.
    return `https://${url}`;
}


// =========================================================
// KONTROLLERA OM TEXT ÄR EN WEBBPLATS
// =========================================================

// Kontrollerar om ett textvärde ser ut som en webbplats.
function looksLikeWebsite(value) {

    // Rensar texten först.
    const text = String(value || "")
        .trim()
        .replace(/^\uFEFF/, "")
        .replace(/^["']|["']$/g, "")
        .trim();

    // Tom text kan inte vara en webbplats.
    if (!text) {
        return false;
    }

    // Tar bort eventuell protokoll-del.
    const withoutProtocol = text
        .replace(/^https?:\/\//i, "")
        .trim();

    // Tar bort eventuell sökväg för kontrollen.
    const hostnamePart = withoutProtocol.split("/")[0];

    // Tar bort portnummer.
    const hostname = hostnamePart.split(":")[0];

    // Kontrollerar vanliga domännamn.
    //
    // Exempel som godkänns:
    // digitalkontakt.se
    // www.digitalkontakt.se
    // example.com
    // test.co.uk
    //
    // Exempel som inte godkänns:
    // "url"
    // "företagsnamn"
    // "12345"
    const domainPattern =
        /^(www\.)?[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

    return domainPattern.test(hostname);
}


// =========================================================
// CSV-FÄLT
// =========================================================

// Tar bort citattecken och onödiga mellanslag från ett CSV-fält.
function cleanCSVField(value) {

    return String(value || "")
        .replace(/^\uFEFF/, "")
        .trim()
        .replace(/^"(.*)"$/s, "$1")
        .replace(/^'(.*)'$/s, "$1")
        .trim();
}


// =========================================================
// HITTA CSV-DELIMITER
// =========================================================

// Försöker hitta vilken delimiter CSV-filen använder.
//
// Vanliga format:
// , = komma
// ; = semikolon
// \t = tab
function detectCSVDelimiter(text) {

    // Hämtar de första raderna eftersom de oftast
    // innehåller kolumnstrukturen.
    const sample = text
        .split(/\r?\n/)
        .slice(0, 10)
        .join("\n");

    // Räknar antal förekomster av olika delimiters.
    const commaCount = (sample.match(/,/g) || []).length;
    const semicolonCount = (sample.match(/;/g) || []).length;
    const tabCount = (sample.match(/\t/g) || []).length;

    // Returnerar den delimiter som förekommer mest.
    if (
        semicolonCount > commaCount &&
        semicolonCount >= tabCount
    ) {
        return ";";
    }

    if (
        tabCount > commaCount &&
        tabCount > semicolonCount
    ) {
        return "\t";
    }

    // Komma används som standard.
    return ",";
}


// =========================================================
// PARSA CSV
// =========================================================

// Enkel men robust CSV-parser.
//
// Hanterar:
// - komma
// - semikolon
// - tab
// - citattecken
// - komma inne i citattecken
// - radbrytningar inne i citattecken
function parseCSV(text, delimiter) {

    // Resultatet blir en array med rader.
    const rows = [];

    // Aktuell rad.
    let row = [];

    // Aktuellt fält.
    let field = "";

    // Anger om vi befinner oss inne i citattecken.
    let insideQuotes = false;

    // Går igenom varje tecken.
    for (let i = 0; i < text.length; i++) {

        const char = text[i];

        // Hanterar citattecken.
        if (char === '"') {

            // Om vi redan är inne i citattecken och nästa tecken
            // också är ett citattecken betyder det ett escape-tecken.
            if (
                insideQuotes &&
                text[i + 1] === '"'
            ) {
                field += '"';
                i++;
                continue;
            }

            // Växlar mellan inne/utanför citattecken.
            insideQuotes = !insideQuotes;

            continue;
        }


        // Om vi hittar delimiter utanför citattecken
        // avslutas fältet.
        if (
            char === delimiter &&
            !insideQuotes
        ) {
            row.push(cleanCSVField(field));
            field = "";
            continue;
        }


        // Radbrytning utanför citattecken betyder ny rad.
        if (
            (char === "\n" || char === "\r") &&
            !insideQuotes
        ) {

            // Vid Windows-radbrytning (\r\n) hoppar vi över \r.
            if (
                char === "\r" &&
                text[i + 1] === "\n"
            ) {
                continue;
            }

            // Lägger till sista fältet.
            row.push(cleanCSVField(field));

            // Lägger till raden om den innehåller data.
            if (
                row.some(
                    value => value.length > 0
                )
            ) {
                rows.push(row);
            }

            // Börjar på en ny rad.
            row = [];
            field = "";

            continue;
        }


        // Vanligt tecken läggs till i fältet.
        field += char;
    }


    // Hanterar sista fältet.
    row.push(cleanCSVField(field));


    // Hanterar sista raden om filen inte slutade med radbrytning.
    if (
        row.some(
            value => value.length > 0
        )
    ) {
        rows.push(row);
    }


    return rows;
}


// =========================================================
// HÄMTA WEBBPLATSER FRÅN CSV
// =========================================================

// Hittar webbplatser i hela CSV-filen.
//
// URL:en behöver inte ligga i första kolumnen.
// Protokoll behöver inte heller anges.
function extractWebsitesFromCSV(csvText) {

    // Tar bort BOM från början av filen.
    const cleanedText = String(csvText || "")
        .replace(/^\uFEFF/, "");

    // Om filen är tom returneras en tom lista.
    if (!cleanedText.trim()) {
        return [];
    }

    // Försöker hitta CSV-formatet.
    const delimiter = detectCSVDelimiter(cleanedText);

    // Parsar CSV-filen.
    const rows = parseCSV(
        cleanedText,
        delimiter
    );

    // Här sparar vi hittade webbplatser.
    const foundWebsites = [];


    // Går igenom varje rad.
    rows.forEach((row) => {

        // Går igenom varje kolumn i raden.
        row.forEach((cell) => {

            // Rensar cellen.
            const value = cleanCSVField(cell);

            // Hoppar över tomma celler.
            if (!value) {
                return;
            }

            // Hoppar över vanliga rubriker.
            const lowerValue = value.toLowerCase();

            if (
                lowerValue === "url" ||
                lowerValue === "website" ||
                lowerValue === "webbplats" ||
                lowerValue === "webbsida" ||
                lowerValue === "website url" ||
                lowerValue === "websiteurl"
            ) {
                return;
            }

            // Kontrollerar om värdet ser ut som en webbplats.
            if (!looksLikeWebsite(value)) {
                return;
            }

            // Gör URL:en komplett.
            const normalizedUrl =
                normalizeWebsiteUrl(value);

            // Lägger till URL:en.
            if (normalizedUrl) {
                foundWebsites.push(normalizedUrl);
            }
        });
    });


    // Tar bort dubbla webbplatser.
    const uniqueWebsites = [
        ...new Set(foundWebsites)
    ];


    return uniqueWebsites;
}


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
    currentProgress = Math.max(
        0,
        Math.min(100, value)
    );

    // Uppdaterar procenttexten.
    progressPercent.textContent =
        `${currentProgress}%`;

    // Uppdaterar progressbarens bredd.
    progressFill.style.width =
        `${currentProgress}%`;

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
    updateProgress(
        0,
        "Startar QA-skanning..."
    );

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


        let message =
            "Startar QA-skanning...";


        if (
            currentProgress >= 25 &&
            currentProgress < 50
        ) {

            message =
                "Analyserar webbplats...";

        } else if (
            currentProgress >= 50 &&
            currentProgress < 70
        ) {

            message =
                "Kör QA-kontroller...";

        } else if (
            currentProgress >= 70 &&
            currentProgress < 85
        ) {

            message =
                "Analyserar resultat...";

        } else if (
            currentProgress >= 85
        ) {

            message =
                "Slutför QA-skanning...";
        }


        updateProgress(
            currentProgress,
            message
        );

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
    const oldList =
        document.querySelector(
            ".csv-site-progress"
        );

    if (oldList) {
        oldList.remove();
    }


    // Skapar nytt område.
    const progressList =
        document.createElement("div");

    // CSS-klass.
    progressList.className =
        "csv-site-progress";


    // Rubrik.
    const heading =
        document.createElement("div");

    heading.className =
        "csv-progress-title";

    heading.innerHTML =
        "<strong>CSV QA-ANALYS</strong>";

    progressList.appendChild(heading);


    // Går igenom alla webbplatser.
    csvWebsites.forEach(
        (websiteUrl, index) => {

            // Skapar rad.
            const row =
                document.createElement("div");

            row.className =
                "csv-site-row";


            // Standard = väntar.
            let icon = "○";
            let statusText = "Väntar";


            // Färdig webbplats.
            if (
                index < csvCompletedCount
            ) {

                icon = "✓";
                statusText = "Klar";


            // Nästa webbplats analyseras.
            } else if (
                index === csvCompletedCount
            ) {

                icon = "⟳";
                statusText =
                    "Analyserar...";
            }


            // Visar informationen.
            row.innerHTML = `
                <span class="csv-site-number">
                    ${icon} ${index + 1}
                </span>

                <span class="csv-site-url">
                    ${websiteUrl}
                </span>

                <span class="csv-site-status">
                    ${statusText}
                </span>
            `;


            progressList.appendChild(row);
        }
    );


    // Lägger listan längst upp.
    resultsElement.prepend(
        progressList
    );
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
    updateProgress(
        0,
        "Startar QA-analys..."
    );

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
    csvCompletedCount =
        data.completed;


    // Visar vilken webbplats som analyseras.
    if (
        data.completed < data.total
    ) {

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

        clearInterval(
            progressTimer
        );

        progressTimer = null;
    }


    // Visar 100%.
    updateProgress(
        100,
        "QA-skanning klar."
    );
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

        return new URL(
            pdfUrl,
            API_BASE_URL
        ).href;

    } catch (error) {

        console.error(
            "Kunde inte skapa PDF-URL:",
            error
        );

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

        const overall =
            document.createElement("div");

        overall.className =
            "result-summary";

        overall.innerHTML = `
            <strong>Övergripande status:</strong>
            ${data.overallStatus}
        `;

        resultsElement.appendChild(
            overall
        );
    }


    // Visar QA-resultat.
    if (
        data.results &&
        Array.isArray(data.results)
    ) {

        const passCount =
            data.results.filter(
                result =>
                    result.status === "PASS"
            ).length;

        const warningCount =
            data.results.filter(
                result =>
                    result.status === "WARNING"
            ).length;

        const failCount =
            data.results.filter(
                result =>
                    result.status === "FAIL"
            ).length;


        const summary =
            document.createElement("div");

        summary.className =
            "result-summary";


        summary.innerHTML = `
            <strong>QA-resultat</strong><br>
            PASS: ${passCount}<br>
            WARNING: ${warningCount}<br>
            FAIL: ${failCount}
        `;


        resultsElement.appendChild(
            summary
        );
    }


    // Visar PDF-knappar om PDF finns.
    if (data.pdfUrl) {

        latestPdfUrl =
            createAbsolutePdfUrl(
                data.pdfUrl
            );


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
    const title =
        document.createElement("div");

    title.className =
        "csv-result";


    title.innerHTML = `
        <strong>CSV-resultat</strong><br>
        Totalt: ${data.total}<br>
        Klara: ${data.completed}<br>
        Misslyckade: ${data.failed}
    `;


    resultsElement.appendChild(
        title
    );


    // Visar varje webbplats.
    if (
        data.results &&
        Array.isArray(data.results)
    ) {

        data.results.forEach(
            (site) => {

                const siteResult =
                    document.createElement(
                        "div"
                    );

                siteResult.className =
                    "csv-result";


                if (site.success) {

                    siteResult.innerHTML = `
                        <strong>
                            ${site.websiteUrl}
                        </strong><br>
                        Status: QA klar
                    `;

                } else {

                    siteResult.innerHTML = `
                        <strong>
                            ${site.websiteUrl}
                        </strong><br>
                        FEL:
                        ${site.error || "Okänt fel"}
                    `;
                }


                resultsElement.appendChild(
                    siteResult
                );
            }
        );
    }


    // Visar PDF-information.
    if (data.pdfUrl) {

        latestPdfUrl =
            createAbsolutePdfUrl(
                data.pdfUrl
            );


        if (latestPdfUrl) {

            const pdfContainer =
                document.createElement(
                    "div"
                );

            pdfContainer.className =
                "csv-pdf-link";


            pdfContainer.innerHTML = `
                <strong>
                    Samlad PDF-rapport
                </strong><br>
                PDF-rapporten är klar.
            `;


            resultsElement.appendChild(
                pdfContainer
            );


            pdfButton.hidden = false;
            downloadPdfButton.hidden = false;
        }
    }
}


// =========================================================
// VANLIG QA-SKANNING
// =========================================================

startButton.addEventListener(
    "click",
    async () => {

        // Hämtar URL och gör den till en komplett URL.
        // Exempel:
        // digitalkontakt.se
        // blir:
        // https://digitalkontakt.se
        const url =
            normalizeWebsiteUrl(
                urlInput.value
            );


        // Kontrollerar URL.
        if (!url) {

            setStatus(
                "Ange en webbplats."
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

        // Startar progress.
        startProgress();

        // Inaktiverar knappen.
        startButton.disabled = true;


        try {

            // Skickar den normaliserade URL:en till backend.
            const response =
                await fetch(
                    API_URL,
                    {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            url: url
                        })
                    }
                );


            // Läser JSON.
            const data =
                await response.json();


            // Hanterar backend-fel.
            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "QA-skanningen misslyckades."
                );
            }


            // Backend är klar.
            finishProgress();

            // Visar resultat.
            displayResults(data);

            // Visar slutstatus.
            setStatus(
                "QA-skanning klar."
            );

        } catch (error) {

            finishProgress();

            setStatus(
                `FEL: ${error.message}`
            );


            resultsElement.innerHTML = `
                <div class="csv-result">
                    <strong>
                        Skanningen misslyckades.
                    </strong><br>
                    ${error.message}
                </div>
            `;

        } finally {

            // Aktiverar knappen igen.
            startButton.disabled = false;
        }
    }
);


// =========================================================
// CSV QA-SKANNING
// =========================================================

csvScanButton.addEventListener(
    "click",
    async () => {

        // Kontrollerar CSV-fil.
        if (
            !csvFileInput.files ||
            csvFileInput.files.length === 0
        ) {

            setStatus(
                "Välj en CSV-fil först."
            );

            return;
        }


        // Hämtar filen.
        const file =
            csvFileInput.files[0];


        // Kontrollerar filändelse.
        if (
            !file.name
                .toLowerCase()
                .endsWith(".csv")
        ) {

            setStatus(
                "Välj en CSV-fil."
            );

            return;
        }


        try {

            // Läser CSV-filen.
            const csvText =
                await file.text();


            // Hämtar webbplatser från hela CSV-filen.
            //
            // Funktionen hittar URL:er även om:
            // - protokoll saknas
            // - URL ligger i en annan kolumn
            // - CSV använder ; istället för ,
            // - filen har rubriker
            const urls =
                extractWebsitesFromCSV(
                    csvText
                );


            // Loggar hittade webbplatser för felsökning.
            console.log(
                "Webbplatser hittade i CSV:",
                urls
            );


            // Kontrollerar att URL hittades.
            if (urls.length === 0) {

                setStatus(
                    "Inga giltiga webbplatser hittades i CSV-filen."
                );

                return;
            }


            // Visar hur många webbplatser som hittades.
            setStatus(
                `${urls.length} webbplatser hittades. Startar QA...`
            );


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
            startCSVProgress(
                urls
            );


            try {

                // Skickar URL-listan till progress-endpointen.
                const response =
                    await fetch(
                        CSV_PROGRESS_API_URL,
                        {

                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
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

                        const errorData =
                            await response.json();


                        errorMessage =
                            errorData.error ||
                            errorMessage;

                    } catch (error) {

                        // Använder standardfelet om svaret inte är JSON.
                    }


                    throw new Error(
                        errorMessage
                    );
                }


                // Kontrollerar att streaming finns.
                if (!response.body) {

                    throw new Error(
                        "Backend skickade ingen progress-stream."
                    );
                }


                // Hämtar stream-läsaren.
                const reader =
                    response.body.getReader();


                // Omvandlar bytes till text.
                const decoder =
                    new TextDecoder();


                // Buffer för SSE-data.
                let buffer = "";


                // Läser streamen.
                while (true) {

                    const {
                        value,
                        done
                    } = await reader.read();


                    // Streamen är klar.
                    if (done) {
                        break;
                    }


                    // Lägger ny data i buffern.
                    buffer +=
                        decoder.decode(
                            value,
                            {
                                stream: true
                            }
                        );


                    // SSE-event separeras med tom rad.
                    const events =
                        buffer.split(
                            /\r?\n\r?\n/
                        );


                    // Sparar event som ännu inte är komplett.
                    buffer =
                        events.pop() || "";


                    // Hanterar kompletta events.
                    for (
                        const eventText of events
                    ) {

                        // Delar eventet i rader.
                        const eventLines =
                            eventText.split(
                                /\r?\n/
                            );


                        let eventType = "";
                        let eventData = "";


                        // Läser eventets innehåll.
                        eventLines.forEach(
                            (line) => {

                                if (
                                    line.startsWith(
                                        "event:"
                                    )
                                ) {

                                    eventType =
                                        line
                                            .replace(
                                                "event:",
                                                ""
                                            )
                                            .trim();
                                }


                                if (
                                    line.startsWith(
                                        "data:"
                                    )
                                ) {

                                    eventData +=
                                        line
                                            .replace(
                                                "data:",
                                                ""
                                            )
                                            .trim();
                                }
                            }
                        );


                        // Hoppar över tomma events.
                        if (
                            !eventType ||
                            !eventData
                        ) {
                            continue;
                        }


                        // Läser JSON.
                        let data;


                        try {

                            data =
                                JSON.parse(
                                    eventData
                                );

                        } catch (error) {

                            console.error(
                                "Kunde inte läsa SSE-data:",
                                eventData
                            );

                            continue;
                        }


                        // -----------------------------------------
                        // START
                        // -----------------------------------------

                        if (
                            eventType ===
                            "started"
                        ) {

                            updateProgress(
                                0,
                                "Startar QA-analys..."
                            );

                            renderCSVSiteProgress();
                        }


                        // -----------------------------------------
                        // WEBBPLATS STARTAR
                        // -----------------------------------------

                        else if (
                            eventType ===
                            "website-start"
                        ) {

                            // Visar att webbplatsen faktiskt
                            // har börjat analyseras.
                            const websiteNumber =
                                data.completed + 1;


                            // Första webbplatsen får 2% så att
                            // progressbaren inte står kvar på 0%.
                            const startPercentage =
                                data.completed === 0
                                    ? 2
                                    : data.percentage;


                            // Uppdaterar progressbaren.
                            updateProgress(
                                startPercentage,
                                `Analyserar webbplats ${websiteNumber} av ${data.total}`
                            );


                            // Uppdaterar listan.
                            renderCSVSiteProgress();
                        }


                        // -----------------------------------------
                        // PROGRESS
                        // -----------------------------------------

                        else if (
                            eventType ===
                            "progress"
                        ) {

                            // En webbplats har blivit färdig.
                            updateCSVProgress(
                                data
                            );
                        }


                        // -----------------------------------------
                        // PDF
                        // -----------------------------------------

                        else if (
                            eventType ===
                            "pdf"
                        ) {

                            updateProgress(
                                95,
                                data.message ||
                                "Skapar PDF-rapport..."
                            );
                        }


                        // -----------------------------------------
                        // KLAR
                        // -----------------------------------------

                        else if (
                            eventType ===
                            "complete"
                        ) {

                            updateProgress(
                                100,
                                "CSV QA-analys klar."
                            );


                            displayCSVResults(
                                data
                            );


                            setStatus(
                                "CSV QA-skanning klar."
                            );
                        }


                        // -----------------------------------------
                        // FEL
                        // -----------------------------------------

                        else if (
                            eventType ===
                            "error"
                        ) {

                            throw new Error(
                                data.error ||
                                "CSV-skanningen misslyckades."
                            );
                        }
                    }
                }

            } catch (error) {

                // Stoppar vanlig progress-timer om
                // den skulle vara aktiv.
                if (progressTimer) {

                    clearInterval(
                        progressTimer
                    );

                    progressTimer = null;
                }


                // Visar fel.
                setStatus(
                    `FEL: ${error.message}`
                );


                // Visar felet.
                resultsElement.innerHTML = `
                    <div class="csv-result">
                        <strong>
                            CSV-skanningen misslyckades.
                        </strong><br>
                        ${error.message}
                    </div>
                `;

            } finally {

                // Aktiverar CSV-knappen igen.
                csvScanButton.disabled = false;
            }

        } catch (error) {

            // Hanterar fel vid läsning/parsing av CSV-filen.
            console.error(
                "CSV-fel:",
                error
            );


            setStatus(
                `FEL: Kunde inte läsa CSV-filen. ${error.message}`
            );
        }
    }
);


// =========================================================
// ÖPPNA PDF
// =========================================================

pdfButton.addEventListener(
    "click",
    () => {

        // Kontrollerar att PDF finns.
        if (!latestPdfUrl) {

            setStatus(
                "Ingen PDF-rapport finns ännu."
            );

            return;
        }


        // Öppnar PDF i ny flik.
        window.open(
            latestPdfUrl,
            "_blank"
        );
    }
);


// =========================================================
// LADDA NER PDF
// =========================================================

downloadPdfButton.addEventListener(
    "click",
    async () => {

        // Kontrollerar att PDF finns.
        if (!latestPdfUrl) {

            setStatus(
                "Ingen PDF-rapport finns ännu."
            );

            return;
        }


        try {

            // Visar status.
            setStatus(
                "Laddar ner PDF..."
            );


            // Hämtar PDF.
            const response =
                await fetch(
                    latestPdfUrl
                );


            // Kontrollerar svar.
            if (!response.ok) {

                throw new Error(
                    "PDF-filen kunde inte hämtas."
                );
            }


            // Läser PDF som Blob.
            const blob =
                await response.blob();


            // Skapar temporär URL.
            const blobUrl =
                URL.createObjectURL(
                    blob
                );


            // Skapar temporär länk.
            const link =
                document.createElement(
                    "a"
                );


            link.href =
                blobUrl;

            link.download =
                "Website-QA-Report.pdf";


            // Lägger till länken.
            document.body.appendChild(
                link
            );


            // Startar nedladdningen.
            link.click();


            // Tar bort länken.
            link.remove();


            // Frigör Blob-URL.
            URL.revokeObjectURL(
                blobUrl
            );


            // Visar status.
            setStatus(
                "PDF-nedladdning startad."
            );

        } catch (error) {

            // Visar fel.
            setStatus(
                `FEL vid PDF-nedladdning: ${error.message}`
            );
        }
    }
);