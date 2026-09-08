# Trade Rider · känsla (paper) — ÖB 7 sep 2026

**Status:** paper. `live=false` / `LIVE_LOCKED` tills namngivet ja. Inga påhittade kronor/kurser.

## Lås
1. **Tradingpsykologi inbyggd** — process före fart (Steenbarger-spåret). Tomma rutor fylls inte. Impuls syns i UI utan att skrika.
2. **Känns av på en gång** — första skärmen = arena/spel, inte formulärvägg.
3. **Prova minst en gång** — minst en avslutad paper-ride innan «små belopp»-läge öppnas (gate i klient; belopp = pilotens tal, aldrig påhittade).
4. **Små belopp efter prova** — volym får vara väldigt låg efter gate; robot höjer aldrig. Live fortfarande låst. Känslan ljuger inte om risk.
5. **Mer spel** — 32-bit stil (inte lamp-läger). Silhuett-HUD (läge/räls/hävstång som pip och fart, inte textvägg). Commit bara på reserverade tangenter: W/S räls instant, F fäst, hävstång 1–4× ärlig, hopp-tell, Space = lins. Robban stjäl inte. Grafen är lekytan. Inga nya play-knappar.
6. **Bygg in bra** — psykologi + gate + playfeel i samma nexus-yta (`#/rider`), inte separat app.

## Redan i main
- `fa2384d` — paper-arena, sticky PAPER-badge, kärna A–E, hopp, mallar, LIVE_LOCKED (PR #3).
- Pilotsele / Nyhetssele (PR #5) + Magasinet kontaktkö/`servedThisRound` (PR #6).
- `cc2946f` — status: rebase klar + prova-känsla-checklista.

## Paper-bygge i PR #4 (draft — merge bara efter namngivet ja)
Branch `cursor/rider-kansla-32bit-0a6e`. Gate `hasCompletedFirstRide` / `RIDER_FIRST_RIDE_KEY`, «små belopp»-hint, impuls (process före fart), 32-bit playfeel (W/S/F/[ ]/Space), silhuett-HUD. Tester gröna. `LIVE_LOCKED` orörd.

**17:54 Sthlm 7 sep:** rebase klar mot tip. Draft kvar.
**09:35 EEST 8 sep:** PR #4 fortfarande draft + mergeable clean. Magasin `8765` HTTP 200. Tom-arena dry-run (W/S/F före första Räkna) under arbete på samma branch — ingen merge. White-label + IPO-paper stubbar landade på main.

https://github.com/ARTIFICER-VAULT-HIVEMINDSYSOP/dirigentverket/pull/4

## Prova-känsla (efter merge — paper)
När ÖB öppnar `#/rider` ska det kännas så här, i den ordningen:
1. Arena först — grafen syns innan någon formvägg.
2. Process-hint syns mjukt (inte skrikig varning).
3. W/S flyttar räls direkt; F fäster; hävstång 1–4× syns som fart/pip, inte textmur.
4. Space = lins; hopp har tell; inga nya play-knappar på ytan.
5. En lyckad paper-ride krävs innan «små belopp» syns/öppnas.
6. PAPER-badge sticky; live-knapp död.

## Inte
- Live-order, mäklare, påhittade P&L
- Sidapp utanför Dirigentverket-nexus
- Merge utan ÖB-ja på namngiven PR-rad
- Lamp-/WATCHERS-skin före playfeel/gate
