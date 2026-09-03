# White-label

Maskineriet är Dirigentverket. Ett nytt system är en tenant, inte en fork.

## Licenseras (skinn + regler)

- Magasin: ringkö, ett kort per kund, NA = VM, kortet bak
- Varje utfall sparas som CRM-kommentar. Aldrig samma text två gånger
- Paper-robot: SL+TP krävs, volym från pilot, robot ärver, höjer aldrig
- Stab / kommando / älvor. Aldrig master/slave

## Följer inte med

- Kundregister, telefon, saldo, kalenderluckor
- Live-nycklar, sessioner, PAT
- Klustrets varumärke (Kapital och Strategi, North, Tradingskolan) om licensen inte säger det

## Ny tenant

1. Kopiera `tenant.example.json` till `tenant.json` (gitignored)
2. Fyll `skin`, `crm.url`, `calendars`, `magazines`
3. Peka sidorna på den tenant. Motorn är densamma
4. Kunddata stannar hos licenstagaren

## Backup

Allt vi arbetar med backas upp utom kundinfo. PNG-kammare väntar molnlänk. Inga kronor, kurser, SL, TP eller saldo hittas på.

## Avtal

Paper. Legal skriver licenstexten. Belopp = saknas tills ÖB fyller i. Inget live-avtal härifrån.
