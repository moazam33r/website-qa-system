// Automatisk kontroll av stavning och grammatik
// med hjälp av LanguageTool

export interface TextIssue {
  // Beskrivningen av felet
  message: string;

  // Förslag på rättning
  suggestions: string[];

  // Texten där felet hittades
  context: string;
}

export interface TextCheckResult {
  // Antal hittade fel
  errors: number;

  // Lista över alla hittade fel
  issues: TextIssue[];

  // Resultat för QA-systemet
  status: "PASS" | "WARNING";
}

// Tar bort Google-recensioner från texten
// eftersom recensionerna är användargenererat innehåll
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

// Kontrollerar text med LanguageTool
export async function checkText(
  text: string,
  language = "sv"
): Promise<TextCheckResult> {

  try {

    // Om sidan inte innehåller någon text
    // behöver vi inte göra någon kontroll
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

    // Tar bort Google-recensioner
    // från texten som ska analyseras
    const textWithoutReviews =
      removeGoogleReviews(text);

    // Om det inte finns någon text kvar
    // efter att recensionerna tagits bort
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

    // Tar bort extra mellanslag
    // för att göra textkontrollen renare
    const cleanedText =
      textWithoutReviews
        .replace(/\s+/g, " ")
        .trim();

    // Skapar data som skickas till LanguageTool
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

    // Skickar texten till LanguageTool
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

    // Kontrollerar om API-anropet lyckades
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

    // Läser svaret från LanguageTool
    const data =
      await response.json();

    // Hämtar alla hittade fel
    const matches =
      data.matches || [];

    // Vanliga tekniska ord, varumärken
    // och förkortningar som inte ska flaggas
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

    // Filtrerar bort uppenbara falska träffar
    const filteredMatches =
      matches.filter((match: any) => {

        // Hämtar texten där felet hittades
        const context =
          match.context?.text || "";

        // Hämtar själva ordet eller textdelen
        // som LanguageTool markerade
        const matchedText =
          match.context?.text
            ?.substring(
              match.context.offset || 0,
              (match.context.offset || 0) +
              (match.context.length || 0)
            ) || "";

        // Gör texten enklare att jämföra
        const lowerContext =
          context.toLowerCase();

        const lowerMatchedText =
          matchedText.toLowerCase().trim();

        // Ignorerar tomma träffar
        if (!lowerMatchedText) {
          return false;
        }

        // Ignorerar mycket korta ord
        // eftersom dessa ofta ger falska träffar
        if (
          lowerMatchedText.length <= 2
        ) {
          return false;
        }

        // Ignorerar vanliga tekniska ord
        // och företags-/varumärkesnamn
        for (const word of ignoredWords) {

          if (
            lowerContext.includes(word) ||
            lowerMatchedText === word
          ) {
            return false;
          }
        }

        // Hämtar den första bokstaven
        const firstCharacter =
          matchedText.trim().charAt(0);

        // Kontrollerar om ordet börjar
        // med stor bokstav
        const startsWithUppercase =
          firstCharacter !==
          firstCharacter.toLowerCase();

        // Kontrollerar om hela ordet är skrivet
        // med stora bokstäver
        const isAllUppercase =
          matchedText.trim().length > 1 &&
          matchedText.trim() ===
          matchedText.trim().toUpperCase();

        // LanguageTool markerar ibland namn,
        // företag och orter som stavfel.
        // Därför ignerar vi stavfel på ord
        // som börjar med stor bokstav.
        if (
          startsWithUppercase &&
          match.rule?.issueType === "misspelling"
        ) {
          return false;
        }

        // Ignorerar versaler som ofta är
        // förkortningar eller namn
        if (
          isAllUppercase &&
          match.rule?.issueType === "misspelling"
        ) {
          return false;
        }

        // Hämtar LanguageTools förslag
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

        // Behåller resten av träffarna
        return true;
      });

    // Tar bort dubbletter och återkommande falska träffar
    const uniqueMatches =
      filteredMatches.filter(
        (match: any, index: number, array: any[]) => {

          // Hämtar texten som LanguageTool markerade
          const matchedText =
            match.context?.text
              ?.substring(
                match.context.offset || 0,
                (match.context.offset || 0) +
                (match.context.length || 0)
              )
              .trim()
              .toLowerCase() || "";

          // Hämtar förslag från LanguageTool
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

          // Skapar en unik nyckel för felet
          const currentKey =
            `${match.rule?.id || ""}|` +
            `${matchedText}|` +
            `${suggestions.join(",")}`;

          // Kontrollerar om exakt samma fel
          // redan har hittats tidigare
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

    // Om inga relevanta fel hittades
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

    // Gör om LanguageTools resultat
    // till vårt eget format
    const issues: TextIssue[] =
      uniqueMatches.map(
        (match: any) => {

          // Hämtar förslag på rättning
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
          };
        }
      );

    // Visar resultaten i terminalen
    console.log(
      `⚠ ${issues.length} relevanta textfel hittades`
    );

    // Visar varje hittat textfel
    for (const issue of issues) {

      // Visar själva felet
      console.log(
        `- ${issue.message}`
      );

      // Visar sammanhanget där felet hittades
      console.log(
        `  Sammanhang: ${issue.context}`
      );

      // Visar förslag på rättning
      if (
        issue.suggestions.length > 0
      ) {

        console.log(
          `  Förslag: ${issue.suggestions.join(", ")}`
        );
      }
    }

    // Returnerar resultatet till QA-systemet
    return {
      errors: issues.length,
      issues,
      status: "WARNING",
    };

  } catch {

    // Hanterar problem med LanguageTool
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