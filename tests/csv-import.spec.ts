import { test, expect } from "@playwright/test";
import fs from "fs";

import { importWebsitesFromCSV } from "../src/checks/csv-import";

test("CSV-import hittar webbplatser", async () => {

  const csvContent = `URL
https://digitalkontakt.se
https://kallsvvs.se
https://abctakplat.se
`;

  const filePath = "test-websites.csv";

  // Skapar en tillfällig CSV-fil för testet
  fs.writeFileSync(
    filePath,
    csvContent
  );

  const websites =
    importWebsitesFromCSV(filePath);

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

  // Tar bort testfilen efter testet
  fs.unlinkSync(filePath);
});