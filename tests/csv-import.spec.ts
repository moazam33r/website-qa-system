import { test, expect } from "@playwright/test";
import fs from "fs";

import { importWebsitesFromCSV } from "../src/checks/csv-import";

test("CSV-import hittar webbplatser", async () => {

  // Skapar testdata för CSV-filen.
  const csvContent = `URL
https://digitalkontakt.se
https://kallsvvs.se
https://abctakplat.se
`;

  // Använder en separat testfil så att
  // ingen riktig projektfil påverkas.
  const filePath =
    "test-results/csv-import-test.csv";

  // Skapar mappen om den inte finns.
  fs.mkdirSync(
    "test-results",
    { recursive: true }
  );

  try {

    // Skapar testets egen CSV-fil.
    fs.writeFileSync(
      filePath,
      csvContent
    );

    // Importerar webbplatserna från CSV-filen.
    const websites =
      importWebsitesFromCSV(filePath);

    // Kontrollerar att resultatet är en array.
    expect(Array.isArray(websites)).toBe(true);

    // Kontrollerar att tre webbplatser hittades.
    expect(websites).toHaveLength(3);

    // Kontrollerar att rätt webbplatser importerades.
    expect(websites).toContain(
      "https://digitalkontakt.se"
    );

    expect(websites).toContain(
      "https://kallsvvs.se"
    );

    expect(websites).toContain(
      "https://abctakplat.se"
    );

    // CSV-rubriken ska inte importeras som en webbplats.
    expect(websites).not.toContain("URL");

    // Alla importerade värden ska vara strängar.
    for (const website of websites) {
      expect(typeof website).toBe("string");
      expect(website.length).toBeGreaterThan(0);
    }

  } finally {

    // Tar bara bort testets egen CSV-fil.
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});