// Hämtar URL-fältet från popupen.
const urlInput = document.getElementById("url");

// Hämtar knappen som startar skanningen.
const scanButton = document.getElementById("scanButton");

// Hämtar området där status visas.
const statusElement = document.getElementById("status");

// Hämtar området där resultatet visas.
const resultsElement = document.getElementById("results");

// Adressen till vårt lokala Website QA System API.
const API_URL = "http://localhost:3000/api/scan";


// Kör QA-skanningen när användaren klickar på knappen.
scanButton.addEventListener("click", async () => {

  // Hämtar URL:en och tar bort eventuella mellanslag.
  const url = urlInput.value.trim();

  // Kontrollerar att användaren faktiskt har skrivit in en URL.
  if (!url) {
    statusElement.textContent = "Ange en URL först.";
    return;
  }

  // Kontrollerar att URL:en börjar med http:// eller https://.
  if (!/^https?:\/\//i.test(url)) {
    statusElement.textContent =
      "URL måste börja med http:// eller https://";

    return;
  }

  // Visar att skanningen har startat.
  statusElement.textContent = "Startar QA-skanning...";

  // Tar bort eventuella gamla resultat.
  resultsElement.innerHTML = "";

  // Inaktiverar knappen under skanningen.
  scanButton.disabled = true;

  try {

    // Skickar URL:en till vårt backend-API.
    const response = await fetch(API_URL, {
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
      const errorData = await response.json().catch(() => null);

      // Använder API:ts fel om det finns.
      const errorMessage =
        errorData?.message ||
        errorData?.error ||
        `API-anropet misslyckades (${response.status}).`;

      throw new Error(errorMessage);
    }

    // Läser resultatet från backend som JSON.
    const data = await response.json();

    // Visar att skanningen är klar.
    statusElement.textContent = "QA-skanning klar.";

    // Visar QA-resultatet.
    displayResults(data);

  } catch (error) {

    // Kontrollerar om felet beror på att extensionen
    // inte kunde ansluta till API-servern.
    if (error instanceof TypeError) {

      statusElement.textContent =
        "Kunde inte ansluta till QA API. Kontrollera att servern körs.";

    } else {

      // Visar det faktiska felmeddelandet.
      statusElement.textContent =
        `Fel: ${error.message}`;
    }

  } finally {

    // Aktiverar knappen igen när skanningen är klar.
    scanButton.disabled = false;
  }
});


// Visar QA-resultatet i extensionen.
function displayResults(data) {

  // Kontrollerar att backend returnerade ett resultat.
  if (!data || !Array.isArray(data.results)) {

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