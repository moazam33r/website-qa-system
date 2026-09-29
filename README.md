# Website QA System

Ett automatiserat QA-system för att analysera och testa webbplatser med Playwright, TypeScript och lokal AI-analys med Ollama.

Systemet kan analysera en webbplats och kontrollera bland annat:

- Webbplatsens sidor och statuskoder
- Interna och externa länkar
- Bilder
- Formulär och formulärfält
- Obligatoriska fält
- E-post- och telefonvalidering
- Navigation
- CTA-knappar
- Sociala medier
- Google Maps
- Google Business Profile
- SEO
- Prestanda
- Responsivitet
- Cookie/GDPR-sidor
- HTTPS och säkerhetsrelaterade kontroller
- Alternativa domäner
- Stavnings- och textkontroller
- AI-baserad sammanfattning av QA-resultatet

## Teknik

Projektet använder bland annat:

- TypeScript
- Playwright
- Node.js
- Express
- Ollama
- Qwen3 4B
- Google PageSpeed Insights API
- PDF-rapportering

## Installation

### 1. Klona projektet

git clone https://github.com/moazam33r/website-qa-system.git
cd website-qa-system

### 2. Installera projektets paket

npm install

### 3. Installera Playwrights webbläsare

npx playwright install

## Konfiguration

Projektet använder en lokal .env-fil för inställningar.

Skapa .env från exempelkonfigurationen:

Copy-Item .env.example .env

Öppna sedan .env.

Exempel:

# Google PageSpeed Insights API-nyckel.
# Lämna tom om PageSpeed-kontrollen inte ska användas.
PAGESPEED_API_KEY=

# Adressen till den lokala Ollama-servern.
OLLAMA_HOST=http://127.0.0.1:11434

# AI-modellen som används av QA-systemet.
OLLAMA_MODEL=qwen3:4b

# Maximal tid för ett Ollama-anrop i millisekunder.
# 180000 = 3 minuter.
OLLAMA_TIMEOUT_MS=180000

.env innehåller lokala inställningar och ska inte läggas upp på GitHub.

## Ollama

AI-analysen körs lokalt med Ollama.

Ollama måste installeras separat på den dator där QA-systemet ska köras.

### Kontrollera Ollama

Efter installation:

ollama --version

### Installera AI-modellen

Projektet använder:

qwen3:4b

Installera modellen:

ollama pull qwen3:4b

Kontrollera installerade modeller:

ollama list

### Ollama-server

Ollama körs normalt lokalt på:

http://127.0.0.1:11434

Detta anges i .env:

OLLAMA_HOST=http://127.0.0.1:11434

Modellen anges med:

OLLAMA_MODEL=qwen3:4b

Timeout anges med:

OLLAMA_TIMEOUT_MS=180000

QA-systemet kontrollerar automatiskt att Ollama är tillgängligt och att den konfigurerade modellen finns installerad innan AI-analysen körs.

## Köra projektet på en annan dator

Ollama-modellen sparas inte i GitHub-repot eftersom modellen är flera gigabyte stor.

Om projektet ska användas på en annan dator behöver modellen därför installeras lokalt på den datorn.

### Steg 1 – Klona projektet

git clone https://github.com/moazam33r/website-qa-system.git
cd website-qa-system

### Steg 2 – Installera projektets paket

npm install

### Steg 3 – Installera Playwright

npx playwright install

### Steg 4 – Installera Ollama

Installera Ollama på datorn och kontrollera installationen:

ollama --version

### Steg 5 – Installera AI-modellen

ollama pull qwen3:4b

### Steg 6 – Skapa .env

Copy-Item .env.example .env

### Steg 7 – Kontrollera modellen

ollama list

qwen3:4b ska finnas i listan.

Därefter är datorn redo att köra QA-systemets AI-analys.

## Köra QA-systemet

QA-systemet använder TARGET_URL för att bestämma vilken webbplats som ska analyseras.

Exempel:

$env:TARGET_URL="https://example.com"
npm run qa

Exempel med Digitalkontakt:

$env:TARGET_URL="https://digitalkontakt.se"
npm run qa

Systemet analyserar då webbplatsen och kör QA-kontrollerna.

## Automatiserade tester

Kör hela Playwright-testsviten:

npx playwright test

Kör tester med synlig webbläsare:

npx playwright test --headed

## TypeScript-kontroll

Kontrollera TypeScript:

npx tsc --noEmit

Om kommandot inte visar några fel är TypeScript-kontrollen godkänd.

## AI-analys

När QA-kontrollerna är färdiga skickas resultaten till Ollama.

AI:n sammanfattar resultaten på svenska i fyra delar:

1. Vad fungerar bra
2. Viktigaste problemen
3. Vad resultaten visar
4. Rekommendationer

AI:n ska endast utgå från resultaten som QA-systemet har samlat in.

AI:n ska inte hitta på egna fel, mätvärden eller resultat.

## API

Projektet innehåller en Express-baserad API-server.

Starta API-servern:

npm run api

eller:

npm run server

## PDF-rapporter

QA-systemet kan skapa PDF-rapporter med resultaten från analysen.

Rapporterna innehåller bland annat:

- Genomförda QA-kontroller
- PASS-resultat
- WARNING-resultat
- FAIL-resultat
- Identifierade problem
- QA-resultat
- AI-analys

## Projektstruktur

website-qa-system/
│
├── src/
│   │
│   ├── ai/
│   │   ├── ollama-config.ts
│   │   ├── ollama.ts
│   │   ├── ollama-worker.ts
│   │   └── qa-analyzer.ts
│   │
│   ├── api/
│   │   └── server.ts
│   │
│   ├── checks/
│   │   ├── cta.ts
│   │   ├── forms.ts
│   │   ├── google-business-profile.ts
│   │   ├── google-maps.ts
│   │   ├── images.ts
│   │   ├── links.ts
│   │   ├── navigation.ts
│   │   ├── pages.ts
│   │   ├── performance.ts
│   │   ├── responsive.ts
│   │   ├── seo.ts
│   │   ├── social-media.ts
│   │   ├── text.ts
│   │   └── validation.ts
│   │
│   ├── report/
│   │   └── ...
│   │
│   ├── cli.ts
│   └── website-scanner.ts
│
├── tests/
│   └── ...
│
├── extension/
│   └── ...
│
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── playwright.config.ts
├── test-websites.csv
└── README.md

## Miljövariabler

TARGET_URL
Webbplatsen som ska analyseras.

Exempel:
https://example.com

PAGESPEED_API_KEY
API-nyckel för Google PageSpeed Insights.

OLLAMA_HOST
Adressen till Ollama-servern.

Exempel:
http://127.0.0.1:11434

OLLAMA_MODEL
AI-modellen som används.

Exempel:
qwen3:4b

OLLAMA_TIMEOUT_MS
Maximal väntetid för AI-anrop.

Exempel:
180000

## Säkerhet

Känsliga uppgifter och API-nycklar ska sparas i .env.

.env ska inte committas till GitHub.

Projektets .gitignore är konfigurerad för att ignorera .env.

.env.example används istället för att visa vilka miljövariabler projektet behöver.

## Git och utveckling

Projektet versionshanteras med Git och GitHub.

Repository:

https://github.com/moazam33r/website-qa-system

Vid utveckling bör nya funktioner testas innan de pushas till GitHub.

Exempel:

npx tsc --noEmit

npx playwright test

## QA-resultat

Systemet använder tre huvudsakliga resultatnivåer.

### PASS

Kontrollen är godkänd och inga problem identifierades.

### WARNING

Kontrollen har genomförts men något bör kontrolleras eller förbättras.

### FAIL

Ett konkret problem har identifierats.

## Syfte

Syftet med projektet är att skapa ett samlat automatiserat QA-system som kan användas för att analysera webbplatser och snabbt identifiera tekniska problem, kvalitetsproblem och förbättringsområden.

Projektet kombinerar automatiserade Playwright-tester, olika QA-kontroller, rapportering och lokal AI-analys i ett och samma system.