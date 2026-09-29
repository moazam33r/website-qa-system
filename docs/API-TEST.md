# API-test – Website QA System

## Syfte

Testet verifierar att Website QA System API fungerar från början till slut.

Följande delar testades:

* API-server
* Health check
* Website scan
* Playwright
* QA-kontroller
* Ollama AI-analys
* PDF-rapport
* JSON-svar från API

## Testmiljö

* Operativsystem: Windows
* Node.js / TypeScript
* Playwright
* Express
* Ollama
* Modell: `qwen3:4b`
* API-server: `http://localhost:3000`
* Testwebbplats: `https://digitalkontakt.se`

## Test 1 – Health check

Anrop:

```text
GET http://localhost:3000/api/health
```

Resultat:

```text
status: ok
message: Website QA System API fungerar.
```

**Resultat: PASS**

## Test 2 – Website scan via API

Anrop:

```text
POST http://localhost:3000/api/scan
```

Request:

```json
{
  "url": "https://digitalkontakt.se"
}
```

API:t genomförde en fullständig QA-analys av webbplatsen.

Resultat:

* 12/12 sidor fungerade
* Desktop Performance: 100/100
* Mobile Performance: 84/100
* 12/12 sidor fungerade i responsiv testning
* 18 fungerande länkar
* 15 fungerande bilder
* 1 formulär
* 19 fungerande CTA-länkar
* Sociala medier hittades och matchades
* Google Business Profile hittades och matchades
* HTTPS kontrollerades
* SEO kontrollerades
* Text och stavning kontrollerades

**Resultat: PASS**

## Test 3 – Ollama AI-analys

API-scanningen fortsatte med lokal AI-analys via Ollama.

Använd modell:

```text
qwen3:4b
```

AI-analysen returnerade fyra delar:

1. Vad fungerar bra
2. Viktigaste problemen
3. Vad resultaten visar
4. Rekommendationer

AI:n analyserade QA-resultaten och identifierade bland annat:

* 4 SEO-varningar
* 2 telefonfält utan tillräcklig client-side validering

**Resultat: PASS**

## Test 4 – PDF-rapport

API:t skapade även en PDF-rapport efter genomförd analys.

PDF-rapporten innehåller resultat från QA-kontrollerna och AI-analysen.

**Resultat: PASS**

## Sammanfattning

Hela flödet fungerade:

```text
API request
    ↓
Express API
    ↓
Playwright
    ↓
Website QA checks
    ↓
QA results
    ↓
Ollama AI analysis
    ↓
PDF report
    ↓
API response
```

### Slutresultat

**API + Ollama integration: PASS**

Testet visar att Website QA System kan användas genom API:t och genomföra en komplett automatiserad webbplatsanalys med lokal AI-analys.
