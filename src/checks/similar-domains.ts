// Skapar möjliga varianter av företagets namn och domän
// som senare kan användas för att hitta liknande webbplatser.

export function createSimilarDomainQueries(
  url: string,
  companyName: string
) {

  console.log("\n--- LIKNANDE DOMÄNER / FÖRETAGSNAMN ---");

  try {

    const parsedUrl = new URL(url);

    // Hämtar huvuddomänen
    const hostname =
      parsedUrl.hostname
        .replace(/^www\./, "")
        .split(".")[0];

    // Normaliserar företagsnamnet
    const normalizedName =
      companyName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/aktiebolag/g, "")
        .replace(/\bab\b/g, "")
        .replace(/[^a-z0-9\s]/g, "")
        .trim();

    // Delar upp företagsnamnet i ord
    const words =
      normalizedName
        .split(/\s+/)
        .filter(
          (word) => word.length >= 3
        );

    const queries = new Set<string>();

    // Företagsnamnet
    if (normalizedName) {
      queries.add(normalizedName);
    }

    // Domännamnet
    if (hostname) {
      queries.add(hostname);
    }

    // Företagsnamn utan mellanslag
    if (words.length > 1) {
      queries.add(words.join(""));
    }

    // Viktiga ord från företagsnamnet
    for (const word of words) {
      queries.add(word);
    }

    console.log(
      "Sökningar som kan användas:"
    );

    for (const query of queries) {
      console.log(`- ${query}`);
    }

    return {
      companyName,
      domain: hostname,
      queries: [...queries],
      status: "PASS" as const,
    };

  } catch {

    console.log(
      "⚠ Kunde inte skapa sökningar för liknande domäner."
    );

    return {
      companyName,
      domain: "",
      queries: [],
      status: "WARNING" as const,
    };
  }
}