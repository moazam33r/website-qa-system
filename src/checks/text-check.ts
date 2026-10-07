// Automatisk kontroll av stavning och grammatik
// med hjälp av LanguageTool

export interface TextIssue {
  // Beskrivningen av felet
  message: string;

  // Förslag på rättning
  suggestions: string[];

  // Texten där felet hittades
  context: string;

  // Själva ordet eller textdelen
  // som LanguageTool markerade
  matchedText: string;

  // URL till sidan där felet hittades
  pageUrl: string;
}

export interface TextCheckResult {
  // Antal hittade fel
  errors: number;

  // Lista över alla hittade fel
  issues: TextIssue[];

  // Resultat för QA-systemet
  status: "PASS" | "WARNING";
}


// =========================================================
// GOOGLE RECENSIONER
// =========================================================

// Tar bort Google-recensioner från texten
// eftersom recensionerna är användargenererat innehåll.
function removeGoogleReviews(
  text: string
): string {

  // Kopierar texten så att originalet inte ändras
  let cleanedText = text;

  // Vanliga rubriker som används av
  // Google-recensionssektioner
  const reviewMarkers = [
    "Google Reviews",
    "Google recensioner",
    "Google-recensioner",
    "Recensioner från Google",
    "Google reviews",
  ];

  // Försöker hitta en Google-recensionssektion
  for (const marker of reviewMarkers) {

    // Hittar var sektionen börjar
    const markerIndex =
      cleanedText
        .toLowerCase()
        .indexOf(marker.toLowerCase());

    // Om sektionen hittades
    if (markerIndex !== -1) {

      // Behåller bara texten före
      // Google-recensionerna
      cleanedText =
        cleanedText.substring(
          0,
          markerIndex
        );
    }
  }

  // Returnerar texten utan Google-recensioner
  return cleanedText;
}


// =========================================================
// TEKNISKA ORD
// =========================================================

// Kontrollerar om en träff ser ut som ett
// tekniskt ord eller tekniskt identifierarnamn.
//
// Vi hårdkodar inte specifika ord.
// Funktionen tittar istället på hur ordet
// är uppbyggt.
function isTechnicalTerm(
  matchedText: string
): boolean {

  const word =
    matchedText.trim();

  // Tom text ska inte räknas som tekniskt ord.
  if (!word) {
    return false;
  }

  // Tekniska identifierare använder ofta
  // bindestreck eller underscore.
  //
  // Exempel:
  // wp-settings-
  // wp-settings-time-
  // wp_lang
  if (
    /^wp[-_]/i.test(word) ||
    /[-_]/.test(word)
  ) {
    return true;
  }

  // Tekniska identifierare kan ibland
  // innehålla både bokstäver och siffror.
  if (
    /[a-zA-Z]/.test(word) &&
    /\d/.test(word)
  ) {
    return true;
  }

  return false;
}


// =========================================================
// TEXTKONTROLL
// =========================================================

// Kontrollerar text med LanguageTool.
export async function checkText(
  text: string,
  language = "sv",
  pageUrl = "",
  siteWordFrequency?: Map<string, number>
): Promise<TextCheckResult> {

  try {

    // -----------------------------------------------------
    // TOM TEXT
    // -----------------------------------------------------

    // Om sidan inte innehåller någon text
    // behöver vi inte göra någon kontroll.
    if (!text.trim()) {

      console.log(
        "- Ingen text hittades"
      );

      return {
        errors: 0,
        issues: [],
        status: "PASS",
      };
    }


    // -----------------------------------------------------
    // TA BORT GOOGLE-RECENSIONER
    // -----------------------------------------------------

    // Tar bort Google-recensioner
    // från texten som ska analyseras.
    const textWithoutReviews =
      removeGoogleReviews(text);

    // Om det inte finns någon text kvar
    // efter att recensionerna tagits bort.
    if (!textWithoutReviews.trim()) {

      console.log(
        "✓ Ingen relevant webbplatstext att kontrollera"
      );

      return {
        errors: 0,
        issues: [],
        status: "PASS",
      };
    }


    // -----------------------------------------------------
    // RENGÖR TEXT
    // -----------------------------------------------------

    // Tar bort extra mellanslag
    // för att göra textkontrollen renare.
    const cleanedText =
      textWithoutReviews
        .replace(/\s+/g, " ")
        .trim();


    // -----------------------------------------------------
    // LANGUAGE TOOL
    // -----------------------------------------------------

    // Skapar data som skickas till LanguageTool.
    const body =
      new URLSearchParams();

    body.append(
      "text",
      cleanedText
    );

    body.append(
      "language",
      language
    );

    // Skickar texten till LanguageTool.
    const response =
      await fetch(
        "https://api.languagetool.org/v2/check",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },

          body,
        }
      );


    // -----------------------------------------------------
    // KONTROLLERA SVAR
    // -----------------------------------------------------

    // Kontrollerar om API-anropet lyckades.
    if (!response.ok) {

      console.log(
        `⚠ LanguageTool svarade med ${response.status}`
      );

      return {
        errors: 0,
        issues: [],
        status: "WARNING",
      };
    }


    // Läser svaret från LanguageTool.
    const data =
      await response.json();


    // Hämtar alla hittade fel.
    const matches =
      data.matches || [];


    // -----------------------------------------------------
    // IGNORERADE ORD
    // -----------------------------------------------------

    // Vanliga tekniska ord, varumärken
    // och förkortningar som inte ska flaggas.
    const ignoredWords = new Set([
      "google",
      "wordpress",
      "instagram",
      "facebook",
      "linkedin",
      "youtube",
      "tiktok",
      "seo",
      "ads",
      "api",
      "html",
      "css",
      "javascript",
      "typescript",
      "playwright",
      "digitalkontakt",
      "google ads",
      "page speed",
      "pagespeed",
    ]);


    // -----------------------------------------------------
    // FILTRERA LANGUAGE TOOL
    // -----------------------------------------------------

    // Filtrerar bort uppenbara falska träffar.
    const filteredMatches =
      matches.filter((match: any) => {

        // Hämtar texten där felet hittades.
        const context =
          match.context?.text || "";


        // Hämtar själva ordet eller textdelen
        // som LanguageTool markerade.
        const matchedText =
          match.context?.text
            ?.substring(
              match.context.offset || 0,
              (match.context.offset || 0) +
              (match.context.length || 0)
            ) || "";


        // Gör texten enklare att jämföra.
        const lowerContext =
          context.toLowerCase();

        const lowerMatchedText =
          matchedText.toLowerCase().trim();


        // -------------------------------------------------
        // TOM TRÄFF
        // -------------------------------------------------

        // Ignorerar tomma träffar.
        if (!lowerMatchedText) {
          return false;
        }


        // -------------------------------------------------
        // KORTA ORD
        // -------------------------------------------------

        // Ignorerar mycket korta ord
        // eftersom dessa ofta ger falska träffar.
        if (
          lowerMatchedText.length <= 2
        ) {
          return false;
        }


        // -------------------------------------------------
        // TEKNISKA IDENTIFIERARE
        // -------------------------------------------------

        // Ignorerar tekniska identifierare
        // och tekniska ord som kan kännas igen
        // utifrån hur ordet är uppbyggt.
        if (
          isTechnicalTerm(matchedText)
        ) {
          return false;
        }


        // -------------------------------------------------
        // ÅTERKOMMANDE WEBBPLATSSPECIFIKA ORD
        // -------------------------------------------------

        // Om ett ord förekommer på flera olika sidor
        // på samma webbplats kan det vara ett
        // webbplatsspecifikt eller branschrelaterat ord.
        //
        // Vi hårdkodar inte specifika ord.
        // Istället använder vi ordets faktiska
        // förekomst på webbplatsen.
        //
        // Detta används endast för stavningsfel.
        // Grammatikfel ska fortfarande kunna visas.
        if (
          siteWordFrequency &&
          match.rule?.issueType === "misspelling" &&
          lowerMatchedText.length >= 5
        ) {

          const frequency =
            siteWordFrequency.get(
              lowerMatchedText
            ) || 0;


          // Ett ord som förekommer på minst
          // tre olika sidor betraktas som ett
          // återkommande webbplatsspecifikt ord.
          if (
            frequency >= 3
          ) {
            return false;
          }
        }


        // -------------------------------------------------
        // TEKNISKA ORD / VARUMÄRKEN
        // -------------------------------------------------

        // Ignorerar vanliga tekniska ord
        // och företags-/varumärkesnamn.
        for (const word of ignoredWords) {

          if (
            lowerContext.includes(word) ||
            lowerMatchedText === word
          ) {
            return false;
          }
        }


        // -------------------------------------------------
        // STOR BOKSTAV
        // -------------------------------------------------

        // Hämtar den första bokstaven.
        const firstCharacter =
          matchedText.trim().charAt(0);


        // Kontrollerar om ordet börjar
        // med stor bokstav.
        const startsWithUppercase =
          firstCharacter !==
          firstCharacter.toLowerCase();


        // -------------------------------------------------
        // VERSALER
        // -------------------------------------------------

        // Kontrollerar om hela ordet är skrivet
        // med stora bokstäver.
        const isAllUppercase =
          matchedText.trim().length > 1 &&
          matchedText.trim() ===
          matchedText.trim().toUpperCase();


        // LanguageTool markerar ibland namn,
        // företag och orter som stavfel.
        // Därför ignorerar vi stavfel på ord
        // som börjar med stor bokstav.
        if (
          startsWithUppercase &&
          match.rule?.issueType === "misspelling"
        ) {
          return false;
        }


        // Ignorerar versaler som ofta är
        // förkortningar eller namn.
        if (
          isAllUppercase &&
          match.rule?.issueType === "misspelling"
        ) {
          return false;
        }


        // -------------------------------------------------
        // FÖRSLAG
        // -------------------------------------------------

        // Hämtar LanguageTools förslag.
        const suggestions =
          (match.replacements || [])
            .slice(0, 3)
            .map(
              (replacement: any) =>
                replacement.value
            );


        // Om LanguageTool föreslår väldigt
        // konstiga alternativ på ett kort ord
        // är det ofta en falsk träff.
        if (
          match.rule?.issueType === "misspelling" &&
          lowerMatchedText.length <= 4 &&
          suggestions.length === 0
        ) {
          return false;
        }


        // Behåller resten av träffarna.
        return true;
      });


    // -----------------------------------------------------
    // DUBLETTER
    // -----------------------------------------------------

    // Tar bort dubbletter och återkommande falska träffar.
    const uniqueMatches =
      filteredMatches.filter(
        (match: any, index: number, array: any[]) => {

          // Hämtar texten som LanguageTool markerade.
          const matchedText =
            match.context?.text
              ?.substring(
                match.context.offset || 0,
                (match.context.offset || 0) +
                (match.context.length || 0)
              )
              .trim()
              .toLowerCase() || "";


          // Hämtar förslag från LanguageTool.
          const suggestions =
            (match.replacements || [])
              .slice(0, 3)
              .map(
                (replacement: any) =>
                  replacement.value
                    .trim()
                    .toLowerCase()
              );


          // Tar bort träffar där LanguageTool
          // föreslår väldigt korta och uppenbart
          // irrelevanta ord.
          if (
            matchedText.length <= 4 &&
            suggestions.length > 0
          ) {

            const hasUsefulSuggestion =
              suggestions.some(
                (suggestion: string) =>
                  suggestion.length >= 5
              );

            if (!hasUsefulSuggestion) {
              return false;
            }
          }


          // Skapar en unik nyckel för felet.
          const currentKey =
            `${match.rule?.id || ""}|` +
            `${matchedText}|` +
            `${suggestions.join(",")}`;


          // Kontrollerar om exakt samma fel
          // redan har hittats tidigare.
          return (
            array.findIndex(
              (other: any) => {

                const otherText =
                  other.context?.text
                    ?.substring(
                      other.context.offset || 0,
                      (other.context.offset || 0) +
                      (other.context.length || 0)
                    )
                    .trim()
                    .toLowerCase() || "";


                const otherSuggestions =
                  (other.replacements || [])
                    .slice(0, 3)
                    .map(
                      (replacement: any) =>
                        replacement.value
                          .trim()
                          .toLowerCase()
                    );


                const otherKey =
                  `${other.rule?.id || ""}|` +
                  `${otherText}|` +
                  `${otherSuggestions.join(",")}`;


                return (
                  otherKey === currentKey
                );
              }
            ) === index
          );
        }
      );


    // -----------------------------------------------------
    // INGA FEL
    // -----------------------------------------------------

    // Om inga relevanta fel hittades.
    if (
      uniqueMatches.length === 0
    ) {

      console.log(
        "✓ Inga relevanta stavnings- eller grammatikfel hittades"
      );

      return {
        errors: 0,
        issues: [],
        status: "PASS",
      };
    }


    // -----------------------------------------------------
    // SKAPA TEXTISSUES
    // -----------------------------------------------------

    // Gör om LanguageTools resultat
    // till vårt eget format.
    const issues: TextIssue[] =
      uniqueMatches.map(
        (match: any) => {

          // Hämtar själva ordet eller textdelen
          // som LanguageTool markerade.
          const matchedText =
            match.context?.text
              ?.substring(
                match.context.offset || 0,
                (match.context.offset || 0) +
                (match.context.length || 0)
              ) || "";


          // Hämtar förslag på rättning.
          const suggestions =
            (match.replacements || [])
              .slice(0, 3)
              .map(
                (replacement: any) =>
                  replacement.value
              );


          return {
            message:
              match.message ||
              "Okänt textfel",

            suggestions,

            context:
              match.context?.text ||
              "",

            matchedText:
              matchedText.trim(),

            pageUrl,
          };
        }
      );


    // -----------------------------------------------------
    // TERMINAL
    // -----------------------------------------------------

    // Visar resultaten i terminalen.
    console.log(
      `⚠ ${issues.length} relevanta textfel hittades`
    );


    // Visar varje hittat textfel.
    for (const issue of issues) {

      // Visar själva felet.
      console.log(
        `- ${issue.message}`
      );


      // Visar det exakta ordet
      // som LanguageTool markerade.
      console.log(
        `  Felaktig text: ${issue.matchedText}`
      );


      // Visar sidan där felet hittades.
      console.log(
        `  Sida: ${issue.pageUrl}`
      );


      // Visar sammanhanget där felet hittades.
      console.log(
        `  Sammanhang: ${issue.context}`
      );


      // Visar förslag på rättning.
      if (
        issue.suggestions.length > 0
      ) {

        console.log(
          `  Förslag: ${issue.suggestions.join(", ")}`
        );
      }
    }


    // -----------------------------------------------------
    // RETURNERA RESULTAT
    // -----------------------------------------------------

    return {
      errors: issues.length,
      issues,
      status: "WARNING",
    };


  } catch {

    // Hanterar problem med LanguageTool.
    console.log(
      "⚠ Kunde inte genomföra textkontrollen."
    );

    return {
      errors: 0,
      issues: [],
      status: "WARNING",
    };
  }
}