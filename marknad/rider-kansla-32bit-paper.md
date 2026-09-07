# Trade Rider · känsla (paper) — ÖB 7 sep 2026

**Status:** paper. `live=false` / `LIVE_LOCKED` tills namngivet ja. Inga påhittade kronor/kurser.

## Lås
1. **Tradingpsykologi inbyggd** — process före fart (Steenbarger-spåret). Tomma rutor fylls inte. Impuls syns i UI utan att skrika.
2. **Känns av på en gång** — första skärmen = arena/spel, inte formulärvägg.
3. **Prova minst en gång** — minst en avslutad paper-ride innan «små belopp»-läge öppnas (gate i klient; belopp = pilotens tal, aldrig påhittade).
4. **Små belopp efter prova** — volym får vara väldigt låg efter gate; robot höjer aldrig. Live fortfarande låst.
5. **Mer spel** — 32-bit stil (inte lamp-läger). Interaktivt **under** tiden man ser grafen: W/S/räls, hopp, lins — grafen är lekytan.
6. **Bygg in bra** — psykologi + gate + playfeel i samma nexus-yta (`#/rider`), inte separat app.

## Redan i main
- `fa2384d` — paper-arena, sticky PAPER-badge, kärna A–E, hopp, mallar, LIVE_LOCKED (PR #3).
- Pilotsele / Nyhetssele (PR #5) + Magasinet kontaktkö/`servedThisRound` (PR #6) ligger på main — Rider-PR #4 måste baseras om.

## Paper-bygge i PR #4 (draft — merge bara efter namngivet ja)
Branch `cursor/rider-kansla-32bit-0a6e`. Gate `hasCompletedFirstRide` / `RIDER_FIRST_RIDE_KEY`, «små belopp»-hint, impuls (process före fart), 32-bit playfeel (W/S/F/[ ]/Space), silhuett-HUD.

**13:50 Sthlm 7 sep:** auto-update branch mot tip gav merge-konflikt. Cloud-agent kör rebase på tip (draft kvar, ingen merge). Magasin `8765` OK.

## Inte
- Live-order, mäklare, påhittade P&L
- Sidapp utanför Dirigentverket-nexus
- Merge utan ÖB-ja på namngiven PR-rad
- Lamp-/WATCHERS-skin före playfeel/gate
