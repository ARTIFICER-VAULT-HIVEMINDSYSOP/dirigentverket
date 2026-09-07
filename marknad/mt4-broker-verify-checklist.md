# Handelsplattform / MT4-mäklare — verifieringschecklista

**Status:** PAPER · due diligence · ingen personlig investeringsrådgivning  
**Tillämpning:** fyll i en rad per plattform / ärende. Tom cell = saknas, inte noll.  
**Stil:** Kapital och Strategi / Dirigentverket — belagt vs obelagt; kryss bara på observerbart.

| Fält | Värde |
|------|--------|
| Plattform / varumärke | |
| Juridiskt bolagsnamn | |
| MT4 / annan terminal | |
| Datum | |
| Granskare | |
| Ärende / kund (initialer) | |
| Utfall (OK / PARKERA / STOPP) | |

---

## A. Röd flagga — pengar in lätt, ut svårt

- [ ] Insättning OK, men uttag försenas / nekas / «extra verifiering»
- [ ] De håller inne vinst (avgift, «skatt», «compliance hold») utan tydlig skriftlig regel **före** konto
- [ ] Handel fungerar tills kontot är plus — då börjar krångel

## B. Röd flagga — KYC grön in, röd ut

- [ ] KYC godkänd för insättning men «otillräcklig» först vid uttag
- [ ] Nya dokumentkrav **bara** när utbetalning begärs
- [ ] Olika regler för deposit vs withdraw i villkoren (ange §)

**Tolking:** Riktig kundkännedom är samma paket. Asymmetri = ofta utbetalningskontroll / risk / cashflow — inte att KYC «ändrats». Grön in + röd ut = varning tills **samma** krav syns i skrift före konto.

## C. Minimum innan tillit

- [ ] Licens: tillsynsmyndighet (namn + nummer) — verifierad på **myndighetens** sajt
- [ ] Juridiskt bolag + adress (inte bara varumärke / white-label)
- [ ] Villkor: uttagstid, avgifter, max/min, betalmetoder ut
- [ ] Litet **testuttag** före större saldo
- [ ] Negativ saldo-skydd / hävstång tydligt i villkor
- [ ] Support svarar skriftligt på uttagsfråga **före** mer insättning
- [ ] Inga påtryckningar «sätt in mer för att låsa upp uttag»

## D. Grönare tecken (svagare bevis)

- [ ] Samma KYC-paket räcker för in och ut
- [ ] Uttag samma väg som insättning (eller dokumenterat varför inte)
- [ ] Egna små uttagstester belagda (datum) — forumskryt räknas inte
- [ ] Separat klientmedelskonto nämns och går att belägga

## E. Stopp / parkera

- [ ] Kräver mer insättning för att «frigöra» vinst
- [ ] Byter villkor mid-trade
- [ ] Hot om kontoblock om du klagar
- [ ] Ingen verifierbar licens

## F. Bevis att pengarna finns (transaktioner / kedja)

- [ ] Konkreta transaktioner (txid / bankreferens / ledger) — inte bara «saldo i MT4»
- [ ] Crypto: **txid** i explorern; belopp, tid, adress matchar påstående
- [ ] Fiat: kontoutdrag / settlement från reglerad bank eller PSP — inte bara portalskärmdump
- [ ] Klientmedel: segregation nämns **och** beläggs (revision / tillsynsrapport) — annars saknas
- [ ] Proof-of-reserves / attest: vem, datum, omfattning — eller saknas

## G. Regelverk som motiverar (eller inte) insättning

- [ ] Vilken lag / tillsyn tillåter dem att hålla kundmedel?
- [ ] Vad kräver tillsynen för uttag vs KYC — samma paket eller asymmetri?
- [ ] Offentlig registerträff på bolagsnamnet (myndighetssök)
- [ ] Motpart i terminalen (A-book / B-book / STP) står i villkoren

## H. «Verifiera genom att sätta in» — röd logik

- [ ] Kräver mer insättning för att «låsa upp», «verifiera saldo» eller «bevisa medel»? → **stopp** tills skriftligt regelstöd
- [ ] Rätt ordning: licens + villkor + litet testuttag först
- [ ] Påstår «pengarna finns på kedjan» utan txid / adress → **obelagt**

**Kort:** MT4-saldo är deras UI. Bevis = bank/PSP-spår eller on-chain txid under regelverk du kan slå upp.

## I. Sammanfattning (fyll i)

| Fråga | Belagt / Obelagt / Saknas | Notering |
|-------|---------------------------|----------|
| Licens verifierad | | |
| KYC symmetrisk in/ut | | |
| Uttag testat | | |
| Medel belagda (txid/bank) | | |
| Regelverk motiverar insättning | | |
| Rekommenderat nästa steg | | |

---

*Mall låst 2026-09-07. Återanvänd för framtida plattformar: kopiera filen eller fyll ny rad i tabellen ovan. Ingen avkastningsgaranti. Ingen personlig rådgivning.*
