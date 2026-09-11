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
- **PR #4 mergad** `a8ea411` (15:31 Sthlm 9 sep) — 32-bit playfeel, första-ride-grind, dry-run, impuls, hopp-tell + soft unlock, struktur-trail-tell, rokad-tell. `LIVE_LOCKED` true.

## PR #4 — landat (inte draft)
Gate `hasCompletedFirstRide` / `RIDER_FIRST_RIDE_KEY`, «små belopp»-hint, impuls (process före fart), 32-bit playfeel (W/S/F/[ ]/Space), silhuett-HUD, tom-arena dry-run (`fde2807`), mjuk impuls + kolla-grafen på fylld arena (`3dbc025` / `6dbb626`), hopp-tell + soft unlock (`b90b3c0`), struktur-trail-tell (`c8b83e4`), rokad-tell (`ba97064` / `b99e062`). Tester gröna. Merge-commit `a8ea411`.

**15:31 Sthlm 9 sep:** PR #4 mergad till main. Statusfil synkad.

**13:39 Sthlm 10 sep (ständig-process):** Draft PR #8 mitt-hedge — mjuk Rider mitt-hedge-tell redan på branchen (`c4c5df4`); update-branch mot main klar (0 behind). Cloud follow-up: frekvens-pip + saknas-band empty-tell (samma draft, ingen merge). Lamp/WATCHERS-skin = bara kvällstid. Merge PR #8 väntar namngivet ÖB-ja.

**10 sep eftermiddag (draft PR #8, inte mergad):** frekvens-pip + saknas-band landat på branchen (`2a396fa`). Pip när svängfrekvens är mätbar. Tom serie eller ogiltigt band = saknas (inga påhittade mitt-markörer). Ghost-silhuett för köp+sälj i mitten bara när banden är ifyllda. Väntar namngivet ÖB merge-ja.

**09:42 Sthlm 11 sep (ständig-process):** Magasin 8765 HTTP 200. PR #8 + #11 update-branch → 0 behind. Cloud follow-up bc-7a6a7541: mjuk band-silhuett + mitt-pip när mitt-hedge-plan finns (samma draft, ingen merge). PR #9 lamp CONFLICTING — kväll. PII-fri backup `/workspace/backups/dirigentverket-verktyg-kod-20260911-0743.tar.gz`. Merge väntar namngivet ja. No live/send/merge.

https://github.com/ARTIFICER-VAULT-HIVEMINDSYSOP/dirigentverket/pull/8
https://github.com/ARTIFICER-VAULT-HIVEMINDSYSOP/dirigentverket/pull/4

## Prova-känsla (nu på main — paper)
När ÖB öppnar `#/rider` ska det kännas så här, i den ordningen:
1. Arena först — grafen syns innan någon formvägg.
2. Process-hint syns mjukt (inte skrikig varning).
3. W/S flyttar räls direkt; F fäster; hävstång 1–4× syns som fart/pip, inte textmur.
4. Space = lins; hopp har tell; trail-tell syns bara på struktur; rokad-tell (vänd sida, volym −25 %, ÖB-gate) när paper-rokad finns; mitt-hedge-tell + frekvens-pip när serien räcker, saknas-pip när serie/band tomt; inga nya play-knappar på ytan.
5. En lyckad paper-ride krävs innan «små belopp» syns/öppnas.
6. PAPER-badge sticky; live-knapp död.
7. Tom arena = dry-run: silhuett rör sig före Räkna; tomma rutor stannar tomma.

## Inte
- Live-order, mäklare, påhittade P&L
- Sidapp utanför Dirigentverket-nexus
- Merge utan ÖB-ja på namngiven PR-rad
- Lamp-/WATCHERS-skin — bara kvällstid (ÖB 9 sep); inte startad här