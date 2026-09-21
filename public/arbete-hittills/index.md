# Dirigentverket — funktionskatalog (publik)

**Datum:** 2026-09-21  
**Axel:** funktion / förmåga · inte kundkö eller statuslistor  
**Not:** Sanerad — ingen kund-PII, inga CRM-id, e-post, telefon eller personliga Desktop-sökvägar. Intern stab har full karta.

---

## Innehåll (alla H2)

1. [Kapitalstrategi (KS)](#kapitalstrategi-ks)
2. [Magasin](#magasin)
3. [Verktygslåda (toolbox)](#verktygslåda-toolbox)
4. [Agentinstruktioner](#agentinstruktioner)
5. [Uträkningar](#uträkningar)
6. [Bankkarta](#bankkarta)
7. [Utbildningar](#utbildningar)
8. [UI-stil](#ui-stil)
9. [Mötesbokning & kalender](#mötesbokning--kalender)
10. [CRM-kommentar](#crm-kommentar)
11. [Kunddokument](#kunddokument)
12. [Mejl-utkast & utskick](#mejl-utkast--utskick)
13. [FU premium-utskick](#fu-premium-utskick)
14. [Nyhetsbrev](#nyhetsbrev)
15. [Stab / orkestrering](#stab--orkestrering)
16. [Trading paper / Rider](#trading-paper--rider)
17. [Artificer AI](#artificer-ai)
18. [Telegram-bot](#telegram-bot)
19. [Pipe-tavla](#pipe-tavla)
20. [ConnectPoint](#connectpoint)
21. [Solros](#solros)
22. [Övriga stödfunktioner](#övriga-stödfunktioner)

---

## Kapitalstrategi (KS)

- Vite/React-sajt för klustret (Kapital och Strategi, Tradingskolan, admin, Rider, assistent).
- Live-host och www/Pages-spår; DNS/CNAME-guider för custom domain.
- Admin-sektioner (contracts, newsletter, courses, …); magasin-genväg på admin ofärdig.
- Tradingskolan / prova-först; escrow-utbildning under school-path.
- i18n dokumenterat (SV/EN/UA i UI; EN/FR escrow-handshake).
- Sajt-hälsa-rutin + underhållspolicy; fallback lokal utskick → www → live.

## Magasin

- Lokal magasin-server + HTML/JS/CSS-UI (dedikerad port).
- Separata köer per bokare; no-recycle (served-flagga + cooldown).
- Magasin-utfall → sparad CRM-kommentar (Create på detalj, inte Call/Mail).
- Magasin-data stannar lokalt (ej publik git); kod synkas via repo/backup.

## Verktygslåda (toolbox)

- Desktop-låda med P0-länkar/smoke (lokal HTML, ingen död dev-port).
- Kundjämförelse-, FU-formulär-, avtal-/contracts-verktyg.
- Luckor/leads-vyer; Pipe-chip i samma pack.
- Gap-/builder-dokumentation för crystal-HUD och pipe.

## Agentinstruktioner

- **Orkestrering:** ett spår, leverans=bevis, park-först, INPUT vid auth, WIP-tak.
- **Spegel:** gemensam aktiv/park/bevis.
- **Orgning:** ÖB → VD → chefer; kväll ≠ dag.
- **Ofärdigt-** och **onboarding-checklistor**.
- **OSINT:** gemensam utbildning + skill; 28 förmågekluster.
- **Skills:** CRM-kort/positioner, mötesbokare, sälj/uppföljning, kundjämförelse, FU Zoho-BCC, artikelbild, gemensam-osint.
- **Lås:** Create≠Call; utkast≠live; PII i CRM; namngivet ja för live; bättre agenter först.
- **Rutiner:** park-kö, ofärdigt, sajt-hälsa, utskicks-bevakning.

## Uträkningar

Funktion — beskriver *vad* som räknas, inte belopp.

- Kundjämförelse-verktyg: %-ökning från insatt→saldo; speglas på Brons/Silver/Guld-trösklar; handelskredit = gap till mål-nivå; PDF-utskrift.
- Kontotyp/nivå i admin-avtalspanel (benefitDelta / nästa kontotyp).
- Nivå-HTML + intern nivå-JS; kreditkalkylator (flerspråkiga forms).
- Paper-robot: SL/TP/RR och storlek från ifylld risk — tom = saknas.
- Regel: siffror bara från namngivet underlag.

## Bankkarta

- `bankkarta.html` — bank vs trading / jämförelsekarta.
- Kundjämförelse-mallar med bank-vs-trading-spår.
- OSINT-bankjämförelser (sourced, ingen kund-PII).
- Admin-sektion banks.

## Utbildningar

- Tradingskolan (steg/rank, lektionskarta, live-host).
- Escrow / tredjepart («Kapital i rörelse») + Pages-deploy.
- OSINT gemensam låda + mini-övning + onboarding.
- Robban-linje (säkerhetsutrustning före fart) i skola/chat.
- Rider paper / policy / demo-copy.
- AI-risk-kursutkast (coming soon); SL/TP-grind-utkast.
- Agent-onboarding + drillmanus.

## UI-stil

- WATCHERS: sten + lampa (+ 16-bit fordon) i intern panel/robot/Rider.
- KS: React-produkt-UI (skola, Rider, assistent, språkväljare).
- Magasin: mörk operatörs-UI; HUD/patronbälte skilt från snabbknappar.
- Verktyg-HTML: mörk sten/ton, chip-rad (crystal-HUD draft).
- Artikelbild: license-klar stock + credit; ingen feed-foto.

## Mötesbokning & kalender

- CRM Create + kalender; mötesbokare äger luckor; manus + luckor/leads-HTML.

## CRM-kommentar

- Create på detaljkort; dubblettförbud; saldo tom=saknas; retro magasin-utfall; skill för kort/positioner.

## Kunddokument

- Mappstruktur + jämförelse HTML/PDF + manus; deploy-hjälp för synk.

## Mejl-utkast & utskick

- Lokalt utkast; skick efter namngivet ja; massutskick-grind (ämne/teaser/PDF/batch).

## FU premium-utskick

- Intro-mallar → PDF; Zoho-BCC-skill; kampanjbatch med send-lock / cooldown.

## Nyhetsbrev

- Utskick-pipeline; admin newsletter; finansnyheter kopplad till OSINT.

## Stab / orkestrering

- Spegel + orkestrering + orgning + ofärdigt; 1–2–3 LIVE; WIP-tak.

## Trading paper / Rider

- Paper/live-grind; SL/TP-watch; Rider PR:er; IPO/budget/intäkt-paper.

## Artificer AI

- Automatisk handel under VD; paper-robot/Rider internt; skiljs från publik assistent.

## Telegram-bot

- Extern kundkanal (meny/poller test); produktion efter namngivet ja; WA-spår parkerat.

## Pipe-tavla

- Del av verktygslådan; POP vid bokat; export JSON; Desktop-pack + smoke.

## ConnectPoint

- Paper: transcript → godkännande → CRM Create; API i agent-UI saknas.

## Solros

- Paper-arkitektur för Telegram-handel (fysisk vara) — ej produktion i stab-kärnan.

## Övriga stödfunktioner

- Frihetsbibliotek (publik sida); NFT-advisory paper; white-label paper; kvälls-/spelspår.

---

*Publik spegel av funktionsaxeln. Tom rad = saknas i källa. Inga påhittade belopp.*
