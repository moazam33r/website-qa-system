import "dotenv/config";

// Kontrollerar webbplatsens prestanda med Google PageSpeed Insights
export async function checkPerformance(url: string) {

  console.log("\n--- PRESTANDA ---");

  try {

    // Hämtar API-nyckeln från .env
    const apiKey = process.env.PAGESPEED_API_KEY;

    // Om API-nyckeln saknas kan testet inte köras
    if (!apiKey) {
      console.log(
        "⚠ PAGESPEED_API_KEY saknas i .env"
      );

      return {
        desktop: null,
        mobile: null,
        status: "WARNING" as const,
      };
    }

    // Kör PageSpeed för desktop eller mobile
    const runPageSpeed = async (
      strategy: "desktop" | "mobile"
    ) => {

      // Skapar URL till PageSpeed API
      const apiUrl =
        `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
        `?url=${encodeURIComponent(url)}` +
        `&category=performance` +
        `&strategy=${strategy}` +
        `&key=${encodeURIComponent(apiKey)}`;

      // Skickar förfrågan till PageSpeed
      const response = await fetch(apiUrl);

      // PageSpeed har nått sin rate limit
      if (response.status === 429) {
        console.log(
          `⚠ PageSpeed ${strategy} kunde inte genomföras: API rate limit (429)`
        );

        return null;
      }

      // Kontrollerar om API-anropet misslyckades
      if (!response.ok) {
        console.log(
          `⚠ PageSpeed ${strategy} kunde inte genomföras (${response.status})`
        );

        return null;
      }

      // Hämtar resultatet från API:t
      const data = await response.json();

      // Hämtar Performance-score från Lighthouse
      const performanceScore =
        data?.lighthouseResult?.categories?.performance?.score;

      // Om ingen score hittades kan testet inte fortsätta
      if (typeof performanceScore !== "number") {
        console.log(
          `⚠ Ingen PageSpeed Performance-score hittades för ${strategy}`
        );

        return null;
      }

      // Gör om score från exempelvis 0.95 till 95
      const score = Math.round(
        performanceScore * 100
      );

      // Hämtar Lighthouse-mätvärden
      const audits =
        data?.lighthouseResult?.audits;

      // Hämtar Largest Contentful Paint
      const lcp =
        audits?.["largest-contentful-paint"]?.numericValue;

      // Hämtar Cumulative Layout Shift
      const cls =
        audits?.["cumulative-layout-shift"]?.numericValue;

      // Hämtar First Contentful Paint
      const fcp =
        audits?.["first-contentful-paint"]?.numericValue;

      // Bestämmer resultatet baserat på Performance-score
      let status: "PASS" | "WARNING" | "FAIL";

      if (score >= 80) {
        status = "PASS";
      } else if (score >= 50) {
        status = "WARNING";
      } else {
        status = "FAIL";
      }

      // Returnerar resultatet
      return {
        score,
        lcp: typeof lcp === "number" ? lcp : null,
        cls: typeof cls === "number" ? cls : null,
        fcp: typeof fcp === "number" ? fcp : null,
        status,
      };
    };

    // ==============================
    // DESKTOP
    // ==============================

    console.log("\nDesktop:");

    // Kör PageSpeed-test för desktop
    const desktop = await runPageSpeed(
      "desktop"
    );

    if (desktop) {

      console.log(
        `Performance score: ${desktop.score}/100`
      );

      // Visar LCP om värdet finns
      if (typeof desktop.lcp === "number") {
        console.log(
          `LCP: ${(desktop.lcp / 1000).toFixed(2)} s`
        );
      }

      // Visar CLS om värdet finns
      if (typeof desktop.cls === "number") {
        console.log(
          `CLS: ${desktop.cls.toFixed(2)}`
        );
      }

      // Visar FCP om värdet finns
      if (typeof desktop.fcp === "number") {
        console.log(
          `FCP: ${(desktop.fcp / 1000).toFixed(2)} s`
        );
      }

      // Visar resultatet för desktop
      if (desktop.status === "PASS") {
        console.log(
          "✓ Desktop Performance är godkänd"
        );
      } else if (desktop.status === "WARNING") {
        console.log(
          "⚠ Desktop Performance kan förbättras"
        );
      } else {
        console.log(
          "✗ Låg Desktop Performance"
        );
      }
    }

    // ==============================
    // MOBILE
    // ==============================

    console.log("\nMobile:");

    // Kör PageSpeed-test för mobile
    const mobile = await runPageSpeed(
      "mobile"
    );

    if (mobile) {

      console.log(
        `Performance score: ${mobile.score}/100`
      );

      // Visar LCP om värdet finns
      if (typeof mobile.lcp === "number") {
        console.log(
          `LCP: ${(mobile.lcp / 1000).toFixed(2)} s`
        );
      }

      // Visar CLS om värdet finns
      if (typeof mobile.cls === "number") {
        console.log(
          `CLS: ${mobile.cls.toFixed(2)}`
        );
      }

      // Visar FCP om värdet finns
      if (typeof mobile.fcp === "number") {
        console.log(
          `FCP: ${(mobile.fcp / 1000).toFixed(2)} s`
        );
      }

      // Visar resultatet för mobile
      if (mobile.status === "PASS") {
        console.log(
          "✓ Mobile Performance är godkänd"
        );
      } else if (mobile.status === "WARNING") {
        console.log(
          "⚠ Mobile Performance kan förbättras"
        );
      } else {
        console.log(
          "✗ Låg Mobile Performance"
        );
      }
    }

    // Om någon av testerna inte kunde genomföras
    if (!desktop || !mobile) {
      return {
        desktop,
        mobile,
        status: "WARNING" as const,
      };
    }

    // Bestämmer det totala resultatet
    let status: "PASS" | "WARNING" | "FAIL";

    if (
      desktop.status === "FAIL" ||
      mobile.status === "FAIL"
    ) {
      status = "FAIL";
    } else if (
      desktop.status === "WARNING" ||
      mobile.status === "WARNING"
    ) {
      status = "WARNING";
    } else {
      status = "PASS";
    }

    // Returnerar desktop-, mobile- och totalresultatet
    return {
      desktop,
      mobile,
      status,
    };

  } catch (error) {

    // Hanterar fel om PageSpeed-testet inte kan genomföras
    console.log(
      "⚠ PageSpeed-kontrollen kunde inte genomföras"
    );

    return {
      desktop: null,
      mobile: null,
      status: "WARNING" as const,
    };
  }
}