# Tradingskolan · lektionskarta (utkast)

17 september 2026 · Utbildningsansvarig  
Uppdaterad 18 september 2026 · escrow-kapital deploy-paper  
Bas-host: **`https://live.kapitalstrategi.com`** (ÖB 2026-09-17). `www.kapitalstrategi.com` ger 509 bandwidth quota — använd inte i nya länkar.
Källa: live-sajt + Vite-data (`smartLearningPath`, `tradeSkolanCourses`). Status: **utkast**.

## Host
| Host | Status 17 sep | Användning |
|---|---|---|
| `live.kapitalstrategi.com` | 200 | **Primär** för skola/Rider tills www är uppe |
| `www.kapitalstrategi.com` | 509 kvot | Undvik i prova-först och skolcopy |

## Ordning (INITIATE · 0/17)
Robban-linjen: säkerhetsutrustning före fart. S/L · T/P · R:R innan storlek/risk.

| # | Kurs | Lektion (moduleId) | Fas | Live-URL |
|---|---|---|---|---|
| 1 | `historia` | Historia: skepp → aktier (`hist-01-skepp-till-aktier`) | foundation | https://live.kapitalstrategi.com/tradingskolan?course=historia&lesson=hist-01-skepp-till-aktier |
| 2 | `historia` | Historia: guld & korsfarare (`hist-02-guld-korsfarare`) | foundation | https://live.kapitalstrategi.com/tradingskolan?course=historia&lesson=hist-02-guld-korsfarare |
| 3 | `historia` | Historia: priser → Trade Rider (`hist-03-priser-grafer`) | foundation | https://live.kapitalstrategi.com/tradingskolan?course=historia&lesson=hist-03-priser-grafer |
| 4 | `historia` | Historia: förlustgränser (S/L·T/P) (`hist-04-risk-sl-tp`) | foundation · SL/TP-grind | https://live.kapitalstrategi.com/tradingskolan?course=historia&lesson=hist-04-risk-sl-tp |
| 5 | `historia` | Historia: böcker → appar (`hist-05-bokforing-verktyg`) | foundation | https://live.kapitalstrategi.com/tradingskolan?course=historia&lesson=hist-05-bokforing-verktyg |
| 6 | `basics-sprak` | Samma språk (`basics-01-samma-sprak`) | foundation | https://live.kapitalstrategi.com/tradingskolan?course=basics-sprak&lesson=basics-01-samma-sprak |
| 7 | `basics-sprak` | Ränta på ränta (`basics-03-ranta-pa-ranta`) | compound | https://live.kapitalstrategi.com/tradingskolan?course=basics-sprak&lesson=basics-03-ranta-pa-ranta |
| 8 | `basics-sprak` | Hävstång & R:R (`basics-02-webtrader`) | foundation | https://live.kapitalstrategi.com/tradingskolan?course=basics-sprak&lesson=basics-02-webtrader |
| 9 | `trading-grund` | Intro till trading (`trading-intro`) | risk | https://live.kapitalstrategi.com/tradingskolan?course=trading-grund&lesson=trading-intro |
| 10 | `trading-grund` | Hävstång (gasen) (`havstang`) | risk | https://live.kapitalstrategi.com/tradingskolan?course=trading-grund&lesson=havstang |
| 11 | `trading-grund` | S/L (bältet) (`stop-loss`) | risk · SL/TP-grind | https://live.kapitalstrategi.com/tradingskolan?course=trading-grund&lesson=stop-loss |
| 12 | `trading-grund` | T/P & R:R (flytväst & hjälm) (`take-profit`) | risk · SL/TP-grind | https://live.kapitalstrategi.com/tradingskolan?course=trading-grund&lesson=take-profit |
| 13 | `trading-grund` | Signaler (kritiskt) (`signaler`) | risk | https://live.kapitalstrategi.com/tradingskolan?course=trading-grund&lesson=signaler |
| 14 | `trading-grund` | Analys (`analys`) | risk | https://live.kapitalstrategi.com/tradingskolan?course=trading-grund&lesson=analys |
| 15 | `trading-grund` | Kalender (`kalender`) | risk | https://live.kapitalstrategi.com/tradingskolan?course=trading-grund&lesson=kalender |
| 16 | `trading-grund` | Kunskapstest (`kunskapstest`) | risk | https://live.kapitalstrategi.com/tradingskolan?course=trading-grund&lesson=kunskapstest |
| 17 | `ipo` | IPO (valfritt) (`ipo-01-vad-ar-ipo`) | valfritt | https://live.kapitalstrategi.com/tradingskolan?course=ipo&lesson=ipo-01-vad-ar-ipo |

Nav: https://live.kapitalstrategi.com/tradingskolan  
Trade Rider (paper): https://live.kapitalstrategi.com/trade-rider  
Spara spår: https://live.kapitalstrategi.com/login?next=/tradingskolan

## Kurser · katalog

### Available
| courseId | Titel | I 17-spåret | Anmärkning |
|---|---|---|---|
| `historia` | Marknadens historia | 1–5 | Börja här |
| `basics-sprak` | Samma språk – grunden | 6–8 | Begrepp + compound + hävstång/R:R |
| `trading-grund` | Strategi: Risker och vinster värda att ta | 9–16 | Gas/bälte/flytväst/hjälm |
| `ipo` | IPO:er | 17 (valfritt) | |
| `europa-syd` | Syd-Europa: börs, euro och bostad | nej | 2 lektioner; fördjupning i Fastighetsskolan |

### Coming soon (sälj inte som öppna)
| courseId | Titel | Planerat (källa: katalog) |
|---|---|---|
| `ico` | ICO & tokenerbjudanden | ca 5 |
| `portfolj-pv` | Portfölj & Player Value | ca 4 |
| `utr-skatt` | UTR — resultat & preliminär skatt | ca 4 |
| `ai-risk` | AI-handel & riskramar | ca 5 · **utkast i `utbildning/ai-risk/`** (ÖB A 17 sep; still coming_soon) |
| `escrow-kapital` | Kapital i rörelse — tredjepart & escrow | ca 8 · **paper i `utbildning/escrow-kapital/`** · HTML öppningsbar i `public/utskick/` · SPA-katalog **coming_soon** tills ÖB-ja |

## Utanför 17-spåret men available
| # | Kurs | moduleId | Live-URL |
|---|---|---|---|
| A | europa-syd | `eu-syd-01-bors` | https://live.kapitalstrategi.com/tradingskolan?course=europa-syd&lesson=eu-syd-01-bors |
| B | europa-syd | `eu-syd-02-bostad` | https://live.kapitalstrategi.com/tradingskolan?course=europa-syd&lesson=eu-syd-02-bostad |

Fastighetsskolan: egen yta `https://live.kapitalstrategi.com/fastighetsskolan` (inte en kurs i Tradingskolan-katalogen).

## Luckor / nästa förbättring
1. Marknadscopy och nyhetsbrev pekar fortfarande ofta på `www` — byt till `live` i nya utkast (Marknad äger utskick).
2. SL/TP/RR-grind: steg 4 + 11–12 är kärnan; synka Rider-låstext.
3. `ai-risk` m.fl. coming soon — ÖB-ja öppna/parkera/ta bort CTA.
4. Verifiera att varje deep-link öppnar rätt modul i UI (SPA); kartan speglar datakällan på live.
5. `escrow-kapital`: paper/HTML deployad i boken. SPA-katalog stannar `coming_soon` tills ja + host 200.

## AI-risk (pågående)
ÖB 2026-09-17: A — lektionsutkast innan statusbyte. Se `utbildning/ai-risk/`.

## Programblock · escrow-kapital (DEPLOY paper · 18 sep)

**courseId:** `escrow-kapital` · ÖB deploy direkt.  
Host/katalog SPA: `coming_soon` tills ja + 200. Publik HTML är deploy-yta.

**KS = utbildare i kapital.** Håller inte escrow, tar inte emot medel som escrow, agerar inte escrow-agent.

| Resurs | Path |
|---|---|
| Kanonisk text | `utbildning/escrow-kapital/kapital-i-rorelse-tredjepart-escrow-utkast.md` |
| Spegel | `utbildning/kapital-i-rorelse-tredjepart-escrow-utkast.md` |
| README | `utbildning/escrow-kapital/README.md` |
| SPEGEL-not | `utbildning/escrow-modul-SPEGEL-not.md` |
| HTML (öppna) | `public/utskick/kapital-i-rorelse-tredjepart-escrow-utkast.html` |
| Publik md | `public/utskick/kapital-i-rorelse-tredjepart-escrow-utkast.md` |
| Moduler 1–8 | `utbildning/escrow-kapital/01-varfor-det-hor-hit.md` … `08-ks-roll.md` |

### Kanon · 8 lektioner

| # | moduleId | Fil | Live-URL |
|---|---|---|---|
| 1 | `escrow-01-varfor` | `01-varfor-det-hor-hit.md` | placeholder — SPA ej live |
| 2 | `escrow-02-overlamning` | `02-tredjepartsoverlamning.md` | placeholder — SPA ej live |
| 3 | `escrow-03-granskning` | `03-tredjepartsgranskning.md` | placeholder — SPA ej live |
| 4 | `escrow-04-avtal` | `04-tredjepartsavtal.md` | placeholder — SPA ej live |
| 5 | `escrow-05-escrow` | `05-escrow.md` | placeholder — SPA ej live |
| 6 | `escrow-06-koppling` | `06-kopplingen.md` | placeholder — SPA ej live |
| 7 | `escrow-07-fragor` | `07-tio-fragor.md` | placeholder — SPA ej live |
| 8 | `escrow-08-ks-roll` | `08-ks-roll.md` | placeholder — SPA ej live |

**Live-URL (när katalog + host uppe):**  
`https://live.kapitalstrategi.com/tradingskolan?course=escrow-kapital&lesson=escrow-01-varfor`

Öppna nu: `public/utskick/kapital-i-rorelse-tredjepart-escrow-utkast.html` (hela programmet). Escrow = kort kapitel inuti tredjepartstema.

### Sidospår · äldre 5-filers paper (tills UA städar)

Inte återskapade i denna deploy — källtext för integritet-kapitlet saknas. Kartan behåller raderna.

| # | moduleId | Tema |
|---|---|---|
| 1 | `escrow-01-kapital-i-rorelse` | Varför + KS utbildare |
| 2 | `escrow-02-villkor-fore-frisappning` | Överlämning / villkor före frisläppning |
| 3 | `escrow-03-granskning-bevis` | Granskning + bevis |
| 4 | `escrow-04-integritet-sakerhet` | Integritet ≠ anonymitet |
| 5 | `escrow-05-granser-skola-avtal` | Skola vs avtalsspår |

Ram: KS utbildar — håller inte escrow i skolbänken. FR Lokal synkar FR.
