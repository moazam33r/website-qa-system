import fs from "fs";

// Läser in webbplatser från en CSV-fil
export function importWebsitesFromCSV(
  filePath: string
) {

  // Kontrollerar att filen finns
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `CSV-filen hittades inte: ${filePath}`
    );
  }

  // Läser hela CSV-filen
  const content = fs.readFileSync(
    filePath,
    "utf-8"
  );

  // Delar upp filen rad för rad
  const rows = content
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter((row) => row.length > 0);

  // Om CSV-filen är tom
  if (rows.length === 0) {
    return [];
  }

  // Tar bort rubriken
  const dataRows = rows.slice(1);

  // Hämtar URL från första kolumnen
  const websites = dataRows
    .map((row) => row.split(",")[0].trim())
    .filter((url) => url.length > 0);

  console.log("\nCSV-import:");
  console.log(
    `✓ ${websites.length} webbplatser importerades`
  );

  for (const website of websites) {
    console.log(`- ${website}`);
  }

  return websites;
}