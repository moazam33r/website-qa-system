import { test, expect } from "@playwright/test";
import fs from "fs";

import { importWebsitesFromCSV } from "../src/checks/csv-import";

test("CSV-import hittar webbplatser", async () => {

  const csvContent = `URL
https://digitalkontakt.se
https://kallsvvs.se
https://abctakplat.se
`;

  // Använder en separat testfil
  const filePath = "test-results/csv-import-test.csv";

  // Skapar mappen om den inte finns
  fs.mkdirSync("test-results", { recursive: true });

  try {

    // Skapar testets egen CSV-fil
    fs.writeFileSync(
      filePath,
      csvContent
    );

    const websites =
      importWebsitesFromCSV(filePath);

    // Kontrollerar att tre webbplatser hittades
    expect(websites).toHaveLength(3);

    expect(websites).toContain(
      "https://digitalkontakt.se"
    );

    expect(websites).toContain(
      "https://kallsvvs.se"
    );

    expect(websites).toContain(
      "https://abctakplat.se"
    );

  } finally {

    // Tar bara bort testets egen CSV-fil
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});