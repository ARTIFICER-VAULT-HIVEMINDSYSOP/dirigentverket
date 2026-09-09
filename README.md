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
- Pilotsele: paper-sele som binder volym + SL/TP till ROBOT-klustret. Älvor ärver, höjer aldrig.
- Nyhetssele: paper-remmar för vardagsmorgon. Skickar inte.
- Magasinet: primär klient/lead-kö (patron + hammer). Inte nyhetsbrev. Inte Trade Rider.

## Synergi

- Tradingskolan matar Kapital och Strategi
- Kapital och Strategi och North Investments strukturerar Fastigheterutomlands
- Fastighetsaffarer blir case till Tradingskolan
- Gemensam datayta i Dirigentverket
- North Investments som fordon for mer an en verksamhet

## Robot

Paper / utredning i samma app. Foreslar SL och TP. Lagger inga ordrar. Inga kurser hamtas. Ingen live-maklare.

SL flyttas bara när RSI närmar sig ett Bollinger-band och bud studsar mot bandet. Paper. Användaren skriver RSI, band och budstuds själv.

Flerårsplan för VIP: byt håll på öppen position om ifylld prognos för nästa säsong bär; snabbare tempo räddar genom att föreslå stäng/vänd nu. Rokadläge vid säsongsvändning: volym −25 % (ny volym = 75 % av ifylld öppen storlek; tom storlek gissas inte). Paper. ÖB godkänner. Tom prognos ger ingen vändning. Saknas prognos-RR påstås inte att nästa säsong kan bära.

**Mitt-hedge (paper):** när en inklistrad kursserie svänger tillräckligt ofta mellan två band (standard minst 3 avslutade svängar, närzon 15 %) föreslås både köp och sälj i mitten. Köp mot taket, sälj mot golvet. Tom serie eller ogiltigt band = saknas. Ingen order. Befintlig SL/TP-väg oförändrad utan serie.

**Minus-rokad (paper, egen knopp):** byt till motsatt sida bara om återhämtning är mätbar (prognos-RR, struktur mot motsatt håll, eller återtagennivå + kurs). Volym = **25 %** av ifylld storlek (`ROKAD_MOTSATT_FAKTOR = 0.25`). Inte samma knopp som säsongens −25 % (0,75). Tom mätning = ingen rokad.

**GULDR / guld / gold:** tillåten rokad-tillgång. Regeln är vänta ca 8 månader (konfigurerbar). Tom historik = ingen påstådd avkastning.

## Teknik

Vite. seed.js, calc.js, synergy.js, robot.js, rider.js, sele.js, hedge.js, rokad.js.

## Nyheter

Nyheter är externa moduler (RSS eller manuell). Feed-foto används inte. Artikelbild krävs: egen eller Unsplash/Pexels/Wikimedia med credit.

## White-label

Maskineriet ska kunna licensieras till ett nytt system. Skinn, CRM-adress, kalendrar och loggor ligger i `tenant.json` (se `tenant.example.json`). Motorn är densamma. Kundinfo backas inte upp. Licenstext är paper tills Legal skriver och ÖB säger ja. Se WHITE-LABEL.md.

## Backup

Allt vi arbetar med backas upp utom kundinfo. Magasinköer, pending-kommentarer och saldo stannar lokalt.
