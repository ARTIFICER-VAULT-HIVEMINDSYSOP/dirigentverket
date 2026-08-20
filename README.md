# Dirigentverket

Utredningsverktyg för byggprojekt — kalkyl och synergi.

Dirigentverket är ett desktop-först (men användbart på mobil) verktyg för att hålla en byggportfölj, räkna kalkyl live och låta en synergimotor peka ut samordning mellan uppdrag. Det är inte en säljsida. Allt körs i webbläsaren; inget backend.

Ändringar sparas i localStorage under nyckeln dirigentverket.v1. Första laddningen fylls med sex påhittade men plausibla svenska projekt så att kalkyl och synergier syns med en gång.

## Köra

Kräver Node.js 18 eller nyare. I projektmappen: installera beroenden, starta utvecklingsservern med scriptet `dev`, bygg med `build` och förhandsgranska med `preview` (se package.json). Vite lyssnar vanligtvis på port 5173.

## Vyerna

- Portfölj — kort eller tabell över alla projekt: status, budget, m²-pris, avvikelse.
- Projekt — ett valt uppdrag med alla fält och live kalkyl. Redigera eller ta bort.
- Kalkyl — portföljsiffror, totalsummor per typ, överlapp i tid, riskflagga.
- Synergier — automatiskt hittade fynd med förklaring och estimerat värde i kronor.

Nytt projekt läggs till via knappen Nytt projekt. Testdata kan återställas från sidfoten.

## Kalkyl

Alla belopp är kronor. Andelar räknas som decimaler och visas i procent med sv-SE.

Per projekt:

- avvikelse = kostnad minus budget (även i procent)
- m²-pris = kostnad / yta
- täckningsbidrag = budget minus kostnad
- marginal_pct = täckningsbidrag / budget
- duration_days från start- och slutdatum (inklusive båda dagarna)
- risk om avvikelse är större än 8 procent mot budget

Portfölj:

- total budget, total kostnad, total avvikelse
- viktat m²-pris = summa kostnad / summa yta
- delsummor per typ (bostäder, kontor, infrastruktur, ROT, anläggning)
- kalenderdagar där minst två projekt är aktiva samtidigt, plus summa av parvisa överlappsdygn
- riskflagga om något projekt har avvikelse över 8 procent

Siffrorna räknas om så fort ett projekt sparas.

## Synergi

Motorn jämför alla projekt och skriver fynd på svenska. Varje fynd har titel, inblandade projekt, sort, 2-4 meningars förklaring, estimated_sek och tillförlitlighet (hög / medel / låg).

- Logistik och etablering: samma eller närliggande ort. Cirka 1,2-1,8 procent av de mindre projektens kostnad.
- Samordnat inköp: delad leverantör. 4-8 procent av överlappande materialkostnad (andelen stiger med antalet projekt).
- Gemensamt material: samma material i minst tre projekt. Samma procentsats mot den hopslagna materialvolymen.
- Delad besättning: närliggande ort, minst 14 dagars överlapp, samma eller kompletterande kompetens. 22 procent av den mindre besättningen, 35 procent utnyttjande, 3800 kr per persondag.
- Infrastruktur möjliggör: infrastruktur nära bostäder eller kontor. 1,2 procent av bostads- eller kontorsbudgeten (utredningspost, inte kassa).

Närliggande orter: Stockholm, Solna och Sundbyberg; Göteborg och Mölndal.

Materialkostnad schabloniseras som andel av projektkostnad (till exempel 38 procent för bostäder, 42 procent för infrastruktur). Fyndens belopp kan överlappa — läs dem som hypoteser i en utredning, inte som en summerbar kassa.

## Teknik

Vite och vanilla JavaScript. Ingen React, ingen server. Testdata ligger i src/seed.js. Kalkyl i src/calc.js, synergimotor i src/synergy.js.

Exempel:

    npm install
    npm run dev

    npm run build
    npm run preview
