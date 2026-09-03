# Dirigentverket

Bok för Daniels första vinstdrivande kluster. Inte en byggportfölj. Inte bokföring.

De fyra verksamheterna ligger i boken från start. Belopp är avsiktligt tomma. En tom kalkyl läses som saknar utfall / fyll i, inte som 0 kr.

## Klustret

1. **Kapital och Strategi** — kapital, rådgivning, strategi. Nod. Domän i git: kapitalstrategi.com.
2. **Tradingskolan** — utbildning och R&D-yta. Elever och marknadsdata in.
3. **Fastigheterutomlands** — fastigheter utanför Sverige.
4. **North Investments LTD** — investeringsfordon / struktur. Jurisdiktion och bolagsnummer är inte verifierade här.

Dirigentverket är staben. ÖB är Daniel. Utförare får utreda och föreslå, inte binda pengar eller avtal.

## Kora

Kraver Node 18.
Vite lyssnar pa port 5173.

## Vyerna

- Portfolio: kort eller tabell.
- Kalkyl: saknar utfall tills budget och kostnad fylls i.
- Synergier: hypoteser utan paahittade kronor.
- Robot: paper / utredning under Tradingskolan.

## Synergi

- Tradingskolan matar Kapital och Strategi
- Kapital och Strategi och North Investments strukturerar Fastigheterutomlands
- Fastighetsaffarer blir case till Tradingskolan
- Gemensam datayta i Dirigentverket
- North Investments som fordon for mer an en verksamhet

## Robot

Paper / utredning i samma app. Foreslar SL och TP. Lagger inga ordrar. Inga kurser hamtas. Ingen live-maklare.

SL flyttas bara när RSI närmar sig ett Bollinger-band och bud studsar mot bandet. Paper. Användaren skriver RSI, band och budstuds själv.

Flerårsplan för VIP: byt håll på öppen position om ifylld prognos för nästa säsong bär; snabbare tempo räddar genom att föreslå stäng/vänd nu. Rokadläge vid vändning: volym −25 % (ny volym = 75 % av ifylld öppen storlek; tom storlek gissas inte). Paper. ÖB godkänner. Tom prognos ger ingen vändning. Saknas prognos-RR påstås inte att nästa säsong kan bära.

## Teknik

Vite. seed.js, calc.js, synergy.js, robot.js.

## Nyheter

Nyheter är externa moduler (RSS eller manuell). Feed-foto används inte. Artikelbild krävs: egen eller Unsplash/Pexels/Wikimedia med credit.

## White-label

Maskineriet ska kunna licensieras till ett nytt system. Skinn, CRM-adress, kalendrar och loggor ligger i `tenant.json` (se `tenant.example.json`). Motorn är densamma. Kundinfo backas inte upp. Licenstext är paper tills Legal skriver och ÖB säger ja. Se WHITE-LABEL.md.

## Backup

Allt vi arbetar med backas upp utom kundinfo. Magasinköer, pending-kommentarer och saldo stannar lokalt.
