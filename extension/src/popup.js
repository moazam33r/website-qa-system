// Hämtar URL-fältet från popupen.
const urlInput = document.getElementById("url");

// Hämtar knappen som startar skanningen.
const scanButton = document.getElementById("scanButton");

// Hämtar området där status visas.
const statusElement = document.getElementById("status");

// Hämtar området där QA-resultatet visas.
const resultsElement = document.getElementById("results");

// Hämtar PDF-knappen.
const pdfButton = document.getElementById("pdfButton");

// Hämtar containern för progressbaren.
const progressContainer =
  document.getElementById("progressContainer");

// Hämtar själva progressbaren.
const progressFill =
  document.getElementById("progressFill");

// Hämtar texten som visar aktuell procent.
const progressPercent =
  document.getElementById("progressPercent");

// Hämtar statusmeddelandet ovanför progressbaren.
const progressStatus =
  document.getElementById("progressStatus");


// Adressen till vårt lokala Website QA System API.
const API_URL = "http://localhost:3000/api/scan";


// Timer som används för progressbaren.
let progressInterval = null;


// Håller reda på aktuell procent.
let currentProgress = 0;


// Generella statusmeddelanden som visas under QA-skanningen.
//
// Vi använder medvetet generella texter eftersom backend
// kör olika kontroller beroende på webbplatsen.
const progressMessages = [
  "Startar QA-skanning...",
  "Analyserar webbplats...",
  "Kör QA-kontroller...",
  "Analyserar resultat...",
  "Slutför QA-skanning..."
];


// Startar en långsammare och mer naturlig loading-animation.
function startProgress() {

  // Börjar på 0%.
  currentProgress = 0;

  // Visar progressområdet.
  progressContainer.hidden = false;

  // Visar första statusmeddelandet.
  progressStatus.textContent =
    progressMessages[0];

  // Visar 0%.
  updateProgress(0);

  // Rensar eventuell gammal timer.
  clearInterval(progressInterval);


  // Ökar progressen långsamt.
  progressInterval = setInterval(() => {

    // Under 50% kan progressen öka lite snabbare.
    if (currentProgress < 50) {

      // Ökar med 1%.
      currentProgress += 1;


    // Mellan 50% och 70% fortsätter den långsamt.
    } else if (currentProgress < 70) {

      // Ökar med 1%.
      currentProgress += 1;


    // Mellan 70% och 85% går progressen långsammare.
    } else if (currentProgress < 85) {

      // Ökar bara ibland.
      if (Math.random() > 0.4) {
        currentProgress += 1;
      }


    // Mellan 85% och 90% går progressen mycket långsamt.
    } else if (currentProgress < 90) {

      // Ökar mer sällan.
      if (Math.random() > 0.6) {
        currentProgress += 1;
      }
    }


    // Säkerställer att progressen aldrig går över 90%
    // innan den riktiga QA-skanningen är färdig.
    currentProgress = Math.min(
      currentProgress,
      90
    );


    // Uppdaterar progressbaren.
    updateProgress(currentProgress);

  }, 1000);


  // Uppdaterar statusmeddelandet baserat på progressen.
  // Detta gör att statusen inte springer före progressbaren.
  updateProgressMessage();
}


// Uppdaterar progressbaren och procenttexten.
function updateProgress(progress) {

  // Säkerställer att värdet ligger mellan 0 och 100.
  const safeProgress =
    Math.min(100, Math.max(0, progress));


  // Sparar aktuell progress.
  currentProgress = safeProgress;


  // Uppdaterar bredden på progressbaren.
  progressFill.style.width =
    `${safeProgress}%`;


  // Uppdaterar procenttexten.
  progressPercent.textContent =
    `${Math.round(safeProgress)}%`;


  // Uppdaterar även statusmeddelandet.
  updateProgressMessage();
}


// Uppdaterar statusmeddelandet baserat på aktuell progress.
//
// Vi använder progressen istället för en separat timer.
// På så sätt kan texten inte springa iväg före progressbaren.
function updateProgressMessage() {

  // Under 25% visas första meddelandet.
  if (currentProgress < 25) {

    progressStatus.textContent =
      progressMessages[0];

    return;
  }


  // Mellan 25% och 50% visas andra meddelandet.
  if (currentProgress < 50) {

    progressStatus.textContent =
      progressMessages[1];

    return;
  }


  // Mellan 50% och 70% visas tredje meddelandet.
  if (currentProgress < 70) {

    progressStatus.textContent =
      progressMessages[2];

    return;
  }


  // Mellan 70% och 85% visas fjärde meddelandet.
  if (currentProgress < 85) {

    progressStatus.textContent =
      progressMessages[3];

    return;
  }


  // Från 85% och uppåt visas sista meddelandet.
  progressStatus.textContent =
    progressMessages[4];
}


// Stoppar alla loading-animationer.
function stopProgress() {

  // Stoppar progress-timern.
  clearInterval(progressInterval);

  // Nollställer timern.
  progressInterval = null;
}


// Markerar skanningen som färdig.
function completeProgress() {

  // Stoppar progress-timern.
  stopProgress();

  // Sätter progressen till exakt 100%.
  updateProgress(100);

  // Visar att QA-skanningen är färdig.
  progressStatus.textContent =
    "QA-skanning klar.";
}


// Kör QA-skanningen när användaren klickar på knappen.
scanButton.addEventListener("click", async () => {

  // Hämtar URL:en och tar bort eventuella mellanslag.
  const url = urlInput.value.trim();


  // Kontrollerar att användaren faktiskt har skrivit in en URL.
  if (!url) {

    statusElement.textContent =
      "Ange en URL först.";

    return;
  }


  // Kontrollerar att URL:en börjar med http:// eller https://.
  if (!/^https?:\/\//i.test(url)) {

    statusElement.textContent =
      "URL måste börja med http:// eller https://";

    return;
  }


  // Tar bort gamla statusmeddelanden.
  statusElement.textContent = "";


  // Tar bort gamla QA-resultat.
  resultsElement.innerHTML = "";


  // Döljer PDF-knappen tills den nya skanningen är klar.
  pdfButton.hidden = true;


  // Tar bort eventuell gammal PDF-länk.
  pdfButton.removeAttribute("href");


  // Inaktiverar Start QA-knappen under skanningen.
  scanButton.disabled = true;


  // Startar progressbaren.
  startProgress();


  try {

    // Skickar URL:en till vårt backend-API.
    const response = await fetch(API_URL, {

      // Använder POST eftersom vi skickar data.
      method: "POST",

      // API:t förväntar sig JSON.
      headers: {
        "Content-Type": "application/json"
      },

      // Skickar URL:en till backend.
      body: JSON.stringify({
        url
      })

    });


    // Om API:t returnerar ett HTTP-fel
    // stoppar vi och visar ett tydligt fel.
    if (!response.ok) {

      // Försöker läsa API:ts felmeddelande.
      const errorData =
        await response
          .json()
          .catch(() => null);


      // Använder API:ts fel om det finns.
      const errorMessage =
        errorData?.message ||
        errorData?.error ||
        `API-anropet misslyckades (${response.status}).`;


      // Skickar felet vidare till catch-blocket.
      throw new Error(errorMessage);
    }


    // Läser resultatet från backend som JSON.
    const data = await response.json();


    // Markerar progressen som färdig.
    completeProgress();


    // Visar QA-resultatet.
    displayResults(data);


    // Kontrollerar om backend skapade en PDF.
    if (data.pdfUrl) {

      // Kopplar PDF-knappen till PDF-rapporten.
      pdfButton.href = data.pdfUrl;

      // Gör PDF-knappen synlig.
      pdfButton.hidden = false;
    }


  } catch (error) {

    // Stoppar loading-animationen.
    stopProgress();


    // Visar att QA-skanningen misslyckades.
    progressStatus.textContent =
      "QA-skanningen misslyckades.";


    // Kontrollerar om felet beror på
    // att extensionen inte kunde ansluta till API-servern.
    if (error instanceof TypeError) {

      statusElement.textContent =
        "Kunde inte ansluta till QA API. Kontrollera att servern körs.";

    } else {

      // Visar det faktiska felmeddelandet.
      statusElement.textContent =
        `Fel: ${error.message}`;
    }


  } finally {

    // Aktiverar Start QA-knappen igen.
    scanButton.disabled = false;
  }
});


// Visar QA-resultatet i extensionen.
function displayResults(data) {

  // Kontrollerar att backend returnerade ett resultat.
  if (
    !data ||
    !Array.isArray(data.results)
  ) {

    resultsElement.textContent =
      "Inget QA-resultat kunde visas.";

    return;
  }


  // Hämtar alla QA-resultat.
  const results = data.results;


  // Räknar hur många kontroller som blev PASS.
  const passCount = results.filter(
    (result) => result.status === "PASS"
  ).length;


  // Räknar hur många kontroller som blev WARNING.
  const warningCount = results.filter(
    (result) => result.status === "WARNING"
  ).length;


  // Räknar hur många kontroller som blev FAIL.
  const failCount = results.filter(
    (result) => result.status === "FAIL"
  ).length;


  // Visar sammanfattningen i extensionen.
  resultsElement.innerHTML = `
    <h2>Resultat</h2>

    <p>PASS: ${passCount}</p>

    <p>WARNING: ${warningCount}</p>

    <p>FAIL: ${failCount}</p>
  `;
}