// =========================================================
// WEBSITE QA SYSTEM - BACKGROUND
// =========================================================

// Sparar ID:t för QA-fönstret.
let qaWindowId = null;


// =========================================================
// ÖPPNA QA-FÖNSTRET
// =========================================================

// Körs när användaren klickar på extensionens ikon.
chrome.action.onClicked.addListener(async () => {

    // Om QA-fönstret redan finns försöker vi fokusera det.
    if (qaWindowId !== null) {

        try {

            await chrome.windows.update(
                qaWindowId,
                {
                    focused: true
                }
            );

            // Fönstret finns redan, så vi behöver inte skapa ett nytt.
            return;

        } catch (error) {

            // Fönstret finns inte längre.
            qaWindowId = null;
        }
    }


    // Hämtar sökvägen till popup.html i extensionen.
    const qaPageUrl =
        chrome.runtime.getURL("popup.html");


    // Skapar ett separat Chrome-fönster.
    const newWindow =
        await chrome.windows.create({

            // Öppnar vårt QA-gränssnitt.
            url: qaPageUrl,

            // Gör sidan till ett separat fönster.
            type: "popup",

            // Startstorlek på fönstret.
            width: 500,
            height: 800,

            // Fokuserar fönstret direkt.
            focused: true
        });


    // Sparar fönstrets ID.
    qaWindowId = newWindow.id;
});


// =========================================================
// NÄR QA-FÖNSTRET STÄNGS
// =========================================================

// Körs när ett Chrome-fönster stängs.
chrome.windows.onRemoved.addListener((windowId) => {

    // Kontrollerar om det var vårt QA-fönster.
    if (windowId === qaWindowId) {

        // Nollställer ID:t.
        qaWindowId = null;
    }
});