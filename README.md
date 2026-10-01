# Website QA System

Ett automatiserat kvalitetssäkringssystem för analys, testning och dokumentation av webbplatser baserat på Playwright, TypeScript, Node.js och lokal AI-analys via Ollama.

Systemet samlar flera QA-kontroller i ett enhetligt, automatiserat flöde. Utifrån en angiven målwebbplats crawlar systemet sidstrukturen, genomför funktionella och tekniska valideringar, klassificerar resultaten som `PASS`, `WARNING` eller `FAIL`, bearbetar datan via ett lokalt AI-analyslager och genererar en strukturerad PDF-rapport.

Projektet tillhandahåller även ett REST API och en Chrome Extension för integrerad interaktion.

Projektet är utvecklat som ett större praktiskt projekt inom IT-testning och testautomation och demonstrerar användning av QA-metodik, automatiserade tester, webbläsarautomation, API:er, rapportering och lokal AI.

---

## Innehåll

- [Vad är Website QA System?](#vad-är-website-qa-system)
- [Huvudfunktioner](#huvudfunktioner)
- [Systemarkitektur & Flöde](#systemarkitektur--flöde)
- [Teknikstack](#teknikstack)
- [Installation](#installation)
- [Konfiguration](#konfiguration)
- [Ollama och lokal AI](#ollama-och-lokal-ai)
- [Körning av QA-systemet](#körning-av-qa-systemet)
- [CSV-scanning](#csv-scanning)
- [Automatiserade tester](#automatiserade-tester)
- [TypeScript-kontroll](#typescript-kontroll)
- [AI-analyslager](#ai-analyslager)
- [REST API](#rest-api)
- [Chrome Extension](#chrome-extension)
- [PDF-rapportering](#pdf-rapportering)
- [Projektstruktur](#projektstruktur)
- [Miljövariabler](#miljövariabler)
- [Säkerhet](#säkerhet)
- [Distribution till ny miljö](#distribution-till-ny-miljö)
- [Felsökning](#felsökning)
- [Utvecklingsflöde & Git](#utvecklingsflöde--git)
- [Klassificering av QA-resultat](#klassificering-av-qa-resultat)
- [Teststrategi](#teststrategi)
- [Projektets mål & Syfte](#projektets-mål--syfte)

---

## Vad är Website QA System?

Website QA System automatiserar återkommande kontrollmoment vid webbplatstestning.

Systemet kan bland annat:

- crawla en webbplats och identifiera sidor
- kontrollera HTTP-statuskoder
- analysera interna och externa länkar
- kontrollera bilder och bildresurser
- identifiera formulär och formulärfält
- testa obligatoriska fält
- validera e-post- och telefonfält
- kontrollera navigation och CTA-länkar
- analysera SEO-relaterade element
- kontrollera responsivitet med Playwright
- mäta prestanda med Google PageSpeed Insights
- kontrollera HTTPS och vissa säkerhetsrelaterade aspekter
- identifiera sociala medier
- kontrollera Google Maps och Google Business Profile
- identifiera Cookiepolicy och Integritetspolicy
- importera flera webbplatser via CSV
- klassificera resultat som PASS, WARNING eller FAIL
- analysera resultat med lokal AI via Ollama
- generera PDF-rapporter

---

## Systemarkitektur & Flöde

Det övergripande flödet ser ut så här:

```text
Webbplats (URL)
    |
    v
Crawler (sidadresser & struktur)
    |
    v
QA-testmotor
    |-- Sidor & HTTP-status
    |-- Länkar (interna/externa)
    |-- Bildresurser
    |-- Formulär & validering
    |-- SEO-metadata (H1, Meta)
    |-- Responsivitet (mobilvy via Playwright)
    |-- Prestanda (Google PageSpeed API)
    |-- Säkerhet & HTTPS
    |-- Sociala medier & Google Profiles
    |-- GDPR / Cookiepolicy
    |
    v
Klassificering (PASS / WARNING / FAIL)
    |
    v
Lokal AI-analys (Ollama / Qwen3 4B)
    |
    v
PDF-rapportgenerering
```

När Chrome Extension används:

```text
Chrome Extension
    |
    v
REST API (Express)
    |
    v
QA-motor
    |
    v
Ollama AI
    |
    v
PDF-rapport
```

AI-lagret är kompletterande. De faktiska QA-kontrollerna genomförs av systemets deterministiska testlogik.

---

## Huvudfunktioner

### Webbcrawling & Länkvalidering

- Automatisk crawling av interna webbadresser och strukturanalys.
- Statuskodskontroll för interna och externa länkar.
- Detektering av trasiga länkar.
- Kontroll av omdirigeringar och avvikande URL-beteenden.
- Identifiering av interna och externa länkrelationer.

### Formulär & Validering

- Identifiering av formulär och formulärelement.
- Identifiering av inmatningsfält.
- Kontroll av obligatoriska fält.
- Testning av e-postfält med ogiltiga värden.
- Testning av telefonfält med ogiltiga värden.
- Identifiering av formulär som accepterar felaktig input.

### Responsivitet & UI

- Webbläsarautomation med Playwright.
- Testning i mobila viewport-storlekar.
- Kontroll av responsivitet på crawlande sidor.
- Identifiering och verifiering av CTA-länkar.
- Kontroll av navigation och användarflöden.

### Prestanda, SEO & Säkerhet

- Integration med Google PageSpeed Insights API.
- Mätning av Core Web Vitals, bland annat LCP och CLS.
- Kontroll av FCP.
- Kontroll av H1-struktur.
- Identifiering av saknade eller problematiska meta-beskrivningar.
- Kontroll av HTTPS.
- Kontroll av vissa säkerhetsrelaterade webbplatsförhållanden.

### Externa integrationer & GDPR

- Identifiering av Google Maps-komponenter.
- Kontroll av Google Business Profile.
- Matchning mellan företagsnamn och externa profiler.
- Kontroll av länkar till sociala medier som Facebook, LinkedIn, Instagram och YouTube.
- Sökning efter Cookiepolicy.
- Sökning efter Integritetspolicy/GDPR-relaterade sidor.
- Kontroll av alternativa domäner och företagsnamn.

### Rapportering

- Sammanställning av testresultat.
- PASS/WARNING/FAIL-klassificering.
- AI-genererad analys.
- PDF-rapport med testresultat och rekommendationer.
- CSV-baserad rapportering för flera webbplatser.

---

## Teknikstack

| Område | Teknik |
|---|---|
| Runtime | Node.js |
| Programmeringsspråk | TypeScript |
| Webbläsarautomation | Playwright |
| Testramverk | Vitest, Playwright Test |
| API-ramverk | Express.js |
| Lokal AI | Ollama |
| AI-modell | Qwen3 4B |
| Externt API | Google PageSpeed Insights API |
| Rapportering | PDF-generering |
| Klientgränssnitt | Chrome Extension, Manifest V3 |
| Versionshantering | Git & GitHub |

---

## Installation

### Förutsättningar

Säkerställ att följande är installerat:

- Git
- Node.js
- npm
- Google Chrome
- Ollama, om lokal AI-analys ska användas

### Installationssteg

1. Klona repot:

```bash
git clone https://github.com/moazam33r/website-qa-system.git
cd website-qa-system
```

2. Installera projektets beroenden:

```bash
npm install
```

3. Installera Playwright-webbläsare:

```bash
npx playwright install
```

4. Kontrollera TypeScript:

```bash
npx tsc --noEmit
```

---

## Konfiguration

Skapa en `.env`-fil i projektets rotkatalog.

Du kan utgå från `.env.example`.

### Windows PowerShell

```powershell
Copy-Item .env.example .env
```

### Linux / macOS

```bash
cp .env.example .env
```

Exempel:

```env
# Mål-URL för direktkörning
TARGET_URL=https://digitalkontakt.se/

# Google PageSpeed Insights API-nyckel
PAGESPEED_API_KEY=your_api_key_here

# Lokal Ollama-server
OLLAMA_HOST=http://127.0.0.1:11434

# AI-modell
OLLAMA_MODEL=qwen3:4b

# Timeout för AI-anrop i millisekunder
OLLAMA_TIMEOUT_MS=180000
```

Använd inte riktiga API-nycklar i GitHub eller i README-filer.

---

## Ollama och lokal AI

Systemet använder Ollama för lokal exekvering av AI-modellen.

AI-modellen används som ett kompletterande analyslager. Den utför inte själva QA-testerna.

QA-motorn genomför först de strukturerade kontrollerna. Resultaten skickas därefter till Ollama för sammanställning och tolkning.

### Installera modellen

```bash
ollama pull qwen3:4b
```

### Kontrollera installerade modeller

```bash
ollama list
```

### Kontrollera Ollama-version

```bash
ollama --version
```

Standardadressen för den lokala Ollama-servern är:

```text
http://127.0.0.1:11434
```

Ollama behöver installeras separat på varje dator där lokal AI-analys ska köras.

---

## Körning av QA-systemet

### CLI-exekvering

Ange `TARGET_URL` och starta QA-körningen.

### Windows PowerShell

```powershell
$env:TARGET_URL="https://digitalkontakt.se/"
npm run qa
```

### Bash / macOS / Linux

```bash
TARGET_URL="https://digitalkontakt.se/" npm run qa
```

Systemet crawlar därefter målwebbplatsen och genomför de konfigurerade QA-kontrollerna.

---

## CSV-scanning

CSV-scanning används när flera webbplatser ska analyseras.

Exempel på CSV-fil:

```csv
website
https://digitalkontakt.se/
https://kallsvvs.se/
https://abctakplat.se/
```

CSV-filen innehåller en webbplats per rad under kolumnen `website`.

Systemet kan därefter behandla webbplatserna sekventiellt och skapa rapportunderlag för respektive mål.

---

## Automatiserade tester

Projektet använder automatiserade tester för att verifiera systemets funktionalitet.

### Playwright

Kör Playwright-testsviten:

```bash
npx playwright test
```

### Vitest

Om projektets Vitest-skript används:

```bash
npm run test
```

Testerna används bland annat för att verifiera QA-logik, webbläsarflöden och systemets olika komponenter.

---

## TypeScript-kontroll

TypeScript kan kontrolleras utan att generera kompilerade filer:

```bash
npx tsc --noEmit
```

En lyckad körning innebär att projektets TypeScript-kod klarar den aktuella typkontrollen.

---

## AI-analyslager

Efter att de deterministiska QA-kontrollerna är genomförda skickas relevant testdata till den lokala AI-modellen.

AI-analysen används för att sammanfatta resultatet på ett mer lättläst sätt.

Analysen kan bland annat behandla:

1. **Identifierade styrkor**  
   Sammanfattning av kontroller som fått `PASS`.

2. **Kritiska avvikelser**  
   Sammanställning av `FAIL`-resultat och identifierade problem.

3. **Tekniska observationer**  
   Sammanställning av `WARNING`-resultat, exempelvis SEO- eller prestandarelaterade observationer.

4. **Åtgärdsplan**  
   Förslag på vilka områden som bör granskas eller förbättras.

AI-resultatet ska ses som ett kompletterande analysunderlag. Den primära sanningskällan för testresultaten är de automatiserade QA-kontrollerna.

---

## REST API

Starta Express-servern:

```bash
npm run api
```

API-servern körs normalt på:

```text
http://localhost:3000
```

### Endpoints

| Metod | Endpoint | Beskrivning |
|---|---|---|
| `GET` | `/api/health` | Statuskontroll för API-tjänsten |
| `POST` | `/api/scan` | Startar QA-analys mot en angiven URL |
| `POST` | `/api/scan-csv` | Startar batch-analys från CSV |
| `POST` | `/api/scan-csv-progress` | Batch-analys med progressrapportering |
| `GET` | `/api/reports/:filename` | Hämtar en genererad rapport |

### Exempel: `POST /api/scan`

Exempel på JSON-body:

```json
{
  "url": "https://digitalkontakt.se/"
}
```

API:t används bland annat som kommunikationslager mellan Chrome Extension och QA-motorn.

---

## Chrome Extension

Projektet innehåller en Chrome Extension baserad på Manifest V3.

Extensionen fungerar som ett visuellt gränssnitt mot REST API:t och gör det möjligt att starta QA-körningar utan att arbeta direkt via terminalen.

### Installation i Google Chrome

1. Starta API-servern:

```bash
npm run api
```

2. Öppna:

```text
chrome://extensions/
```

3. Aktivera **Developer mode**.

4. Klicka på **Load unpacked**.

5. Välj projektets:

```text
extension/
```

6. Extensionen kan därefter användas från Chrome.

---

## PDF-rapportering

Systemet genererar PDF-rapporter i katalogen:

```text
reports/
```

Rapporten innehåller bland annat:

- mål-URL
- datum och tidsstämpel
- information om exekveringen
- antal PASS
- antal WARNING
- antal FAIL
- detaljerade testresultat
- SEO-resultat
- prestandamätvärden
- formulärresultat
- länkresultat
- sociala medier och externa integrationer
- Google Maps / Business Profile-resultat
- AI-genererad analys
- åtgärdsförslag

Rapporten är avsedd att fungera som ett samlat QA-underlag som kan läsas av både testare och utvecklare.

---

## Projektstruktur

```text
website-qa-system/
│
├── config/                 # Konfigurationsfiler
├── extension/              # Chrome Extension, Manifest V3
├── reports/                # Genererade PDF-rapporter
│
├── src/
│   ├── ai/                 # Ollama-integration och AI-logik
│   ├── api/                # Express API och routes
│   ├── crawler/            # Playwright-crawler och sididentifiering
│   └── report/             # PDF-layout och rapportgenerering
│
├── tests/                  # Automatiserade tester
│
├── .env.example            # Mall för miljövariabler
├── .gitignore              # Git-exkluderingar
├── package.json            # Projektkonfiguration och scripts
├── package-lock.json       # Låsta npm-versioner
└── README.md               # Projektdokumentation
```

---

## Miljövariabler

| Variabel | Beskrivning | Exempel / standard |
|---|---|---|
| `TARGET_URL` | Mål-URL för direktkörning | - |
| `PAGESPEED_API_KEY` | API-nyckel för Google PageSpeed Insights | - |
| `OLLAMA_HOST` | URL till lokal Ollama-instans | `http://127.0.0.1:11434` |
| `OLLAMA_MODEL` | Namn på AI-modellen | `qwen3:4b` |
| `OLLAMA_TIMEOUT_MS` | Timeout för AI-generering i millisekunder | `180000` |

---

## Säkerhet

Projektet använder miljövariabler för konfiguration och känsliga uppgifter.

- API-nycklar ska lagras i `.env`.
- `.env` ska vara exkluderad från Git via `.gitignore`.
- API-nycklar ska inte läggas direkt i källkod.
- Lokala sökvägar ska inte hårdkodas.
- AI-körningen kan ske lokalt via Ollama utan att QA-resultaten behöver skickas till en extern AI-tjänst.
- Kontrollera alltid vilka webbplatser som får crawlas och testas innan systemet körs i en produktionsmiljö.

---

## Distribution till ny miljö

För att köra projektet på en ny dator:

```bash
git clone https://github.com/moazam33r/website-qa-system.git
cd website-qa-system
npm install
npx playwright install
```

Installera därefter Ollama och modellen om AI-funktionen ska användas:

```bash
ollama pull qwen3:4b
```

Skapa sedan `.env` från `.env.example` och lägg in eventuell PageSpeed API-nyckel.

Verifiera installationen:

```bash
npx tsc --noEmit
```

---

## Felsökning

### Ollama svarar inte

Kontrollera att Ollama körs.

Kontrollera installerade modeller:

```bash
ollama list
```

Kontrollera att Ollama kan nås lokalt:

```bash
curl http://127.0.0.1:11434
```

Kontrollera även att `OLLAMA_HOST` och `OLLAMA_MODEL` är korrekt konfigurerade i `.env`.

### Playwright-exekveringsfel

Installera Playwright-webbläsarna igen:

```bash
npx playwright install
```

På Linux kan följande även behövas:

```bash
npx playwright install --with-deps
```

### API-anslutningsfel i Chrome Extension

Kontrollera att API-servern körs:

```bash
npm run api
```

Kontrollera därefter:

- att port 3000 används
- att Chrome Extension är laddad
- att extensionens API-adress pekar mot rätt server
- eventuella CORS-fel
- felmeddelanden i Chrome DevTools

---

## Utvecklingsflöde & Git

Vid utveckling av nya QA-kontroller rekommenderas följande arbetsgång:

1. Implementera funktionen.
2. Lägg till eller uppdatera automatiserade tester.
3. Kör Playwright-tester.
4. Kör TypeScript-kontroll.
5. Kör en fullständig QA-körning.
6. Dokumentera testresultatet.
7. Commit:a ändringen.
8. Pusha ändringen till GitHub.

Exempel:

```bash
npx playwright test
npx tsc --noEmit
npm run qa

git add .
git commit -m "feat: add new QA validation"
git push origin main
```

Projektets utvecklingsprincip är att nya automatiserade funktioner ska testas och dokumenteras innan de pushas till GitHub.

---

## Klassificering av QA-resultat

| Status | Betydelse | Rekommenderad hantering |
|---|---|---|
| `PASS` | Kontrollen genomfördes utan identifierad avvikelse. | Ingen åtgärd krävs utifrån kontrollen. |
| `WARNING` | Kontrollen genomfördes men ett förbättringsområde eller en avvikelse identifierades. | Bör granskas och bedömas. |
| `FAIL` | Ett konkret funktionellt eller tekniskt problem identifierades. | Bör utredas och åtgärdas. |

Exempel:

- `PASS`: En länk returnerar en förväntad statuskod.
- `WARNING`: En sida saknar en meta-beskrivning.
- `FAIL`: Ett formulär accepterar ogiltig input eller en viktig länk returnerar 404.

---

## Teststrategi

Systemet kombinerar flera testtyper för att skapa en bred QA-analys.

### Funktionell testning

Verifierar bland annat:

- länkar
- navigation
- formulär
- formulärfält
- validering
- CTA-länkar

### UI & Responsivitet

Playwright används för att kontrollera webbplatsens beteende i olika viewport-storlekar.

### Prestandaanalys

Google PageSpeed Insights används för att samla in prestandarelaterade mätvärden som LCP, CLS och FCP.

### API-testning

REST API:t används som integrationslager mellan användargränssnittet och QA-motorn.

### Säkerhet & SEO

Systemet kontrollerar bland annat:

- HTTPS
- H1-struktur
- meta-beskrivningar
- Cookiepolicy
- Integritetspolicy
- vissa domänrelaterade konfigurationer

### AI-baserad resultatsammanställning

Ollama används för att sammanfatta strukturerade QA-resultat och skapa ett mer lättläst analysunderlag.

---

## Projektets mål & Syfte

### Mål

Målet med Website QA System är att skapa ett automatiserat verktyg som kan samla flera återkommande webb-QA-kontroller i ett enda system.

Projektet fokuserar på:

- testautomation
- webbläsarautomation
- QA-metodik
- API-integration
- rapportering
- lokal AI
- reproducerbara tester

### Syfte

Syftet är att minska manuellt och repetitivt arbete vid webbplatstestning och samtidigt skapa ett strukturerat underlag för vidare felsökning och förbättring.

Systemet är även utformat som ett praktiskt projekt inom IT-testning och testautomation, där flera tekniker kombineras i ett sammanhängande QA-flöde.

---

## Exempel på användning

Ett typiskt arbetsflöde kan se ut så här:

1. Användaren anger en målwebbplats.
2. Crawlern identifierar webbplatsens sidor.
3. QA-motorn genomför de definierade kontrollerna.
4. Resultaten klassificeras som PASS, WARNING eller FAIL.
5. Resultaten skickas till Ollama för kompletterande analys.
6. Systemet genererar en PDF-rapport.
7. Rapporten kan användas som QA-underlag för utveckling och vidare felsökning.

---

## Sammanfattning

Website QA System kombinerar webbcrawling, automatiserad testning, Playwright, TypeScript, Node.js, REST API, Chrome Extension, PDF-rapportering och lokal AI-analys i ett sammanhängande kvalitetssäkringssystem.

Projektet är byggt för att demonstrera hur automatiserad QA kan användas för att systematiskt analysera webbplatser och skapa reproducerbara testresultat.

**GitHub Repository:**  
https://github.com/moazam33r/website-qa-system
