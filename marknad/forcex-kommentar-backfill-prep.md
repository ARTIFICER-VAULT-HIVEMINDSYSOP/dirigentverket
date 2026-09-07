# ForceX kommentar-backfill — prep (paper)

**Status:** prep only. Ingen live-skrivning tills ÖB ger namngivna kort/ja. Ingen kund-PII i git.

## Lås (ÖB 2026-08-31 / 08-27)
- Varje magasin-utfall (NA, VM, Recovery, Booked, annan park) ska ha SPARAD ForceX-kommentar.
- Retroaktivt för utfall som saknar kommentar.
- Aldrig samma text två gånger; dubbletter → behåll äldsta, radera extra.
- Öppna via detalj, aldrig Call/Mail.
- Engelska. Kortet först, Save, sen kalender.
- Rapportera antal sparade / raderade. Dumpa inte registret.

## Prep-steg (älva)
1. Läs magasin-utfall utan telefon/saldo i logg.
2. Bygg ID-lista (ForceX-id + utfall + föreslagen engelsk rad) — bara lokalt, aldrig till GitHub.
3. För varje kort: öppna detalj → läs befintliga kommentarer → hoppa om samma text finns → annars spara en rad → stäng.
4. Stoppa före Save om ÖB inte gett ja för backfill-passet.

## Inte
- Live-order, mejl, ring, merge, radera annat än exakta dubblettkommentarer
- Kundregister eller telefon i repo/backup
