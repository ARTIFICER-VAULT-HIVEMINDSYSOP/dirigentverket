# Dirigentverket

Bok för Daniels första vinstdrivande kluster. Inte en byggportfölj. Inte bokföring.

De fyra verksamheterna ligger i boken från start. Belopp, elevtal, AUM och affärsvolymer är avsiktligt tomma. En tom kalkyl läses som *saknar utfall* / *fyll i*, inte som 0 kr.

## Klustret

1. **Kapital och Strategi** — kapital, rådgivning, strategi. Nod. Domän i git: kapitalstrategi.com.
2. **Tradingskolan** — utbildning och R&D-yta. Elever och marknadsdata in.
3. **Fastigheterutomlands** — fastigheter utanför Sverige.
4. **North Investments LTD** — investeringsfordon / struktur. Jurisdiktion och bolagsnummer är inte verifierade här.

Dirigentverket är staben. ÖB är Daniel. Utförare får utreda och föreslå, inte binda pengar eller avtal.

## Köra

Kräver Node.js 18 eller nyare. I projektmappen: `npm install`, `npm run dev`, `npm run build`.

Vite lyssnar vanligtvis på port 5173. Allt körs i webbläsaren. Klustret sparas under `dirigentverket.kluster.v1`. Paper-robotens utkast under `dirigentverket.robot.v1`.

## Vyerna

- **Portfölj** — kort eller tabell över verksamheterna.
- **Kalkyl** — totalsummor när budget och kostnad är ifyllda. Annars *saknar utfall*.
- **Synergier** — kvalitativa hypoteser, estimated_sek = 0 tills någon fyller i utfall.
- **Robot** — paper / utredning under Tradingskolan. Föreslår SL/TP, lägger inga ordrar.
- **Verksamhet** — detalj, redigera, ta bort.

Typer: kapital, utbildning, fastighet, investering. Status: utredning, aktiv, paus.

Kanaler och datakällor är etiketter. m2-pris visas inte. Täckningsbidrag och avvikelse visas bara när både budget och kostnad är större än noll.

## Synergi

- Tradingskolan matar Kapital och Strategi
- Kapital och Strategi och North Investments strukturerar Fastigheterutomlands
- Fastighetsaffärer blir case till Tradingskolan
- Gemensam datayta i Dirigentverket
- North Investments som fordon för mer än en verksamhet

Ingen bygglogik. Fynden är hypoteser utan påhittade kronor.

## Robot (paper)

Modul i samma app. Inga kurser hämtas. Inget backtest. Ingen live-körning. Storlek räknas bara om riskbelopp i kronor är ifyllt.

## Teknik

Vite och vanilla JavaScript. Testdata i src/seed.js. Kalkyl i src/calc.js. Synergimotor i src/synergy.js. Paper-robot i src/robot.js.
