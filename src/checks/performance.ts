import "dotenv/config";

// Kontrollerar webbplatsens prestanda med Google PageSpeed Insights
export async function checkPerformance(url: string) {

  console.log("\n--- PRESTANDA ---");
  console.log("PageSpeed Performance check:");

  try {

    const apiKey = process.env.PAGESPEED_API_KEY;

    if (!apiKey) {
      console.log(
        "⚠ PAGESPEED_API_KEY saknas i .env"
      );

      return {
        score: null,
        lcp: null,
        cls: null,
        fcp: null,
        status: "WARNING" as const,
      };
    }

    const apiUrl =
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
      `?url=${encodeURIComponent(url)}` +
      `&category=performance` +
      `&strategy=desktop` +
      `&key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(apiUrl);

    // PageSpeed API har nått sin rate limit
    if (response.status === 429) {

      console.log(
        "⚠ PageSpeed kunde inte genomföras: API rate limit (429)"
      );

      return {
        score: null,
        lcp: null,
        cls: null,
        fcp: null,
        status: "WARNING" as const,
      };
    }

    if (!response.ok) {

      console.log(
        `⚠ PageSpeed kunde inte genomföras (${response.status})`
      );

      return {
        score: null,
        lcp: null,
        cls: null,
        fcp: null,
        status: "WARNING" as const,
      };
    }

    const data = await response.json();

    const performanceScore =
      data?.lighthouseResult?.categories?.performance?.score;

    if (typeof performanceScore !== "number") {

      console.log(
        "⚠ Ingen PageSpeed Performance-score hittades"
      );

      return {
        score: null,
        lcp: null,
        cls: null,
        fcp: null,
        status: "WARNING" as const,
      };
    }

    const score = Math.round(performanceScore * 100);

    // Lighthouse-mätvärden
    const audits = data?.lighthouseResult?.audits;

    const lcp =
      audits?.["largest-contentful-paint"]?.numericValue;

    const cls =
      audits?.["cumulative-layout-shift"]?.numericValue;

    const fcp =
      audits?.["first-contentful-paint"]?.numericValue;

    console.log(`Performance score: ${score}/100`);

    if (typeof lcp === "number") {
      console.log(`LCP: ${(lcp / 1000).toFixed(2)} s`);
    }

    if (typeof cls === "number") {
      console.log(`CLS: ${cls.toFixed(2)}`);
    }

    if (typeof fcp === "number") {
      console.log(`FCP: ${(fcp / 1000).toFixed(2)} s`);
    }

    let status: "PASS" | "WARNING" | "FAIL";

    if (score >= 80) {

      status = "PASS";

      console.log(
        "✓ Performance är godkänd"
      );

    } else if (score >= 50) {

      status = "WARNING";

      console.log(
        "⚠ Performance kan förbättras"
      );

    } else {

      status = "FAIL";

      console.log(
        "✗ Låg Performance"
      );
    }

    return {
      score,
      lcp: typeof lcp === "number" ? lcp : null,
      cls: typeof cls === "number" ? cls : null,
      fcp: typeof fcp === "number" ? fcp : null,
      status,
    };

  } catch (error) {

    console.log(
      "⚠ PageSpeed-kontrollen kunde inte genomföras"
    );

    return {
      score: null,
      lcp: null,
      cls: null,
      fcp: null,
      status: "WARNING" as const,
    };
  }
}