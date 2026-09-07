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
- Pilotsele / Nyhetssele (PR #5) + Magasinet kontaktkö/`servedThisRound` (PR #6) ligger på main.

## Paper-bygge i PR #4 (draft — merge bara efter namngivet ja)
Branch `cursor/rider-kansla-32bit-0a6e` @ `2e6f3f2`. Gate `hasCompletedFirstRide` / `RIDER_FIRST_RIDE_KEY`, «små belopp»-hint, impuls (process före fart), 32-bit playfeel (W/S/F/[ ]/Space), silhuett-HUD. 81 tester gröna. `LIVE_LOCKED` orörd.

**17:54 Sthlm 7 sep:** rebase klar mot tip `ceadcbf`. Konflikter lösta (rider-ui Magasin-extra behållen; känsla/grind från branchen). **mergeable_state=clean**, draft kvar. **Väntar namngivet merge-ja på PR #4.** Ingen undraft/merge utan ÖB.

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
