// Kontrollerar grundläggande HTTPS-säkerhet
export async function checkSecurity(
  url: string
) {

  console.log("\n--- HTTPS / SECURITY ---");

  // Kontrollerar om webbplatsen använder HTTPS
  if (url.startsWith("https://")) {

    console.log(
      "✓ Webbplatsen använder HTTPS"
    );

    return {
      https: true,
      status: "PASS" as const,
      message:
        "Webbplatsen använder HTTPS",
    };

  } else {

    console.log(
      "✗ Webbplatsen använder inte HTTPS"
    );

    return {
      https: false,
      status: "FAIL" as const,
      message:
        "Webbplatsen använder inte HTTPS",
    };
  }
}