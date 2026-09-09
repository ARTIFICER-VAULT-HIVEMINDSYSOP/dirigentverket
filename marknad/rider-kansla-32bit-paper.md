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
- White-label + IPO-paper stubbar (`91d4d4d`).

## Paper-bygge i PR #4 (draft — merge bara efter namngivet ja)
Branch `cursor/rider-kansla-32bit-0a6e`. Gate `hasCompletedFirstRide` / `RIDER_FIRST_RIDE_KEY`, «små belopp»-hint, impuls (process före fart), 32-bit playfeel (W/S/F/[ ]/Space), silhuett-HUD, tom-arena dry-run (`fde2807`), mjuk impuls + kolla-grafen på fylld arena (`3dbc025` / `6dbb626`), hopp-tell + soft unlock (`b90b3c0`), struktur-trail-tell (`c8b83e4`: trail bara på RSI/Bollinger+budstuds; SL krymper bara, aldrig breddas; mjuk tell på arena/silhuett-HUD), rokad-tell (`ba97064` / head `b99e062`: vänd sida syns i silhuett, volym −25 % av aktuell pilotvolym, mjuk tell + ÖB-gate i paper; ingen live-väg). Tester gröna. `LIVE_LOCKED` orörd. Head `b99e062`. Draft/clean.

**17:54 Sthlm 7 sep:** rebase klar mot tip. Draft kvar.
**09:38 Sthlm 8 sep:** tom-arena dry-run landat.
**~10:00 Sthlm 8 sep:** mjuk impuls efter Räkna + kolla-grafen (coast/scanlines/silhuett lever med häv=fart); CSS-fix så `hidden` inte slås ut av flex.
**13:43 Sthlm 8 sep (ständig):** magasin `8765` HTTP 200; main-status synkad; nästa paper-UX = hopp-tell + mjuk första-ride-unlock.
**13:50 Sthlm 8 sep:** hopp-tell mjuk på arena/silhuett-HUD + «små belopp» soft unlock (intjänad, pilotens tal). Inga nya play-knappar.
**17:38 Sthlm 8 sep (ständig):** magasin `8765` HTTP 200; hopp-tell redan landat; nästa = struktur-trail-tell.
**17:46 UTC 8 sep:** struktur-trail-tell landat (`c8b83e4`).
**09:38 Sthlm 9 sep (ständig):** magasin `8765` var nere → omstartad, HTTP 200. Main-status synkad. Nästa paper-UX = rokad-tell.
**09:47 Sthlm 9 sep:** rokad-tell landat (`b99e062`). Merge väntar namngivet ja. Nästa paper-UX = Lamp/WATCHERS-skin (efter playfeel). Draft PR #8 mitt-hedge ligger separat.

https://github.com/ARTIFICER-VAULT-HIVEMINDSYSOP/dirigentverket/pull/4

## Prova-känsla (efter merge — paper)
När ÖB öppnar `#/rider` ska det kännas så här, i den ordningen:
1. Arena först — grafen syns innan någon formvägg.
2. Process-hint syns mjukt (inte skrikig varning).
3. W/S flyttar räls direkt; F fäster; hävstång 1–4× syns som fart/pip, inte textmur.
4. Space = lins; hopp har tell; trail-tell syns bara på struktur; rokad-tell syns vid vändning (−25 %); inga nya play-knappar på ytan.
5. En lyckad paper-ride krävs innan «små belopp» syns/öppnas.
6. PAPER-badge sticky; live-knapp död.
7. Tom arena = dry-run: silhuett rör sig före Räkna; tomma rutor stannar tomma.

## Inte
- Live-order, mäklare, påhittade P&L
- Sidapp utanför Dirigentverket-nexus
- Merge utan ÖB-ja på namngiven PR-rad
- Lamp-/WATCHERS-skin före playfeel/gate
