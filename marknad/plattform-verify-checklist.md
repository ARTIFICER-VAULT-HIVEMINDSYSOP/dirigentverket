# Plattform — verifieringschecklista

Paper. Dirigentverket = kontrollnexus. Tom cell = saknas, inte noll.
Ingen live-order / merge / mejl / betala utan namngivet ja.

## A. Nexus / bok

- [ ] Vite `#/` startar (panel, robot, rider, sele)
- [ ] Pilotsele: volym + SL + TP ärvs; älva höjer aldrig
- [ ] Nyhetssele: paper, skickar inte
- [ ] `saknar_sl_tp` när SL/TP saknas (inga påhittade kurser)
- [ ] Tester gröna efter Magasin #6 (kontaktkö / relevanta tester)

## B. Magasinet (primär klient/lead-kö)

- [ ] Tunnel / `8765` kör **main** (stäng issue #7 när synkad)
- [ ] Alla kort visar info direkt (telefon, brand, saldo, NA/VM)
- [ ] `servedThisRound`: samma namn återkommer inte före övriga osaknade
- [ ] Lucka: dag + tid i **ett** knapptryck
- [ ] Highlight på senast interagerade kort
- [ ] Recovery bakom fresh (inte först i Ring-nu)
- [ ] Inte nyhetsbrev; inte Trade Rider som primär kö

## C. Trade Rider

- [ ] `#/rider` paper: silhuett-HUD, process före fart
- [ ] Första-ride-grind innan «små belopp»
- [ ] `LIVE_LOCKED` tills namngivet ja
- [ ] PR #4 merge bara efter ÖB-ja på namngiven rad

## D. ForceX (skilt spår)

- [ ] Paper default; live bara namngiven lista
- [ ] Varje öppning har SL + TP
- [ ] Kommentarer: aldrig dubblett; öppna via detalj, aldrig Call
- [ ] PII stannar i ForceX-brand

## E. Ytor / tenant

- [ ] kapitalstrategi.com = referens, ingen andrasanning
- [ ] `tenant.json` skinnar CRM / kalender / logo (WHITE-LABEL)
- [ ] Backup utan kund-PII

## F. Lås som måste hålla

- [ ] Ingen live-order / merge / mejl / betala utan namngivet ja
- [ ] Tom cell = saknas, inte noll
- [ ] Inga påhittade kronor / kurser / telefonnummer

---

*Lockad som verify-yta 2026-09-07. Uppdatera kryss när ÖB eller stab kört punkten.*
