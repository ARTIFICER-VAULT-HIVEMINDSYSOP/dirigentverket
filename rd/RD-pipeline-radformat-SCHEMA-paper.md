# Utkast – varv 5/6

# R&D ONLY — Artefaktpipeline radformat (paper)

**Utkast.** Paper. Ingen merge, ingen live, inga produktionsdata. Uppdaterad 2026-10-02.

Cykel **#5** definierar omvägen (klar i detta utkast). Cykel **#6** är öppen: rader som underkändes i #5 prövas först mot en annan logik. Tillstånd: `rd/RD-LOOP-STATE.md`.

Placeholders = **saknas**. Inga koordinater, inga höjdtak, inga kronor. En tom cell fylls inte.

Etikett på varje värde:

| Etikett | Betydelse |
|---------|-----------|
| VERKLIG | strängen står bokstavligen i repot för detta fält |
| SIMULERAD | repot märker själv värdet som exempel eller sim |
| OKÄNT | värdet finns inte som literal på main |
| EXEMPEL | token som detta utkast sätter för att visa en form, inte ett repo-värde |

Inget fält nedan är VERKLIG. Inget fält är SIMULERAD. Repot märker inget package, ingen enhet, inget spårformat och inget geofence som exempel för den här loopen.

Koppling som utkastet siktar på, utan att filen finns på main: mission-package-schema (`RD-mission-package-SCHEMA-paper.md`, **saknas** på main) med `pipeline_namn` (mål mesh→datacenter) och `spår_format` (**saknas**). Koppling till cykel #2 steg 7 (logga omfördelning) och cykel #3 steg 6 (logga abort-händelse) är övertagen från tillståndsutkastet. De filerna finns inte på main.

## Värden från repot (sök 2026-10-02)

Sökbas: `origin/main` @ `f75906f5fd59d9c1158ea12c228e04f0c8558965`. 106 spårade filer. Ingen mapp `rd/` fanns före detta utkast.

| Fält | Värde i utkastet | Etikett | Källa |
|------|------------------|---------|-------|
| tidstämpel | saknas | OKÄNT | ingen pipeline-tidstämpel på main |
| handelse_typ | `OMFORDELNING` eller `ABORT` | OKÄNT i repot | enum i detta utkast; ingen träff på main |
| enhet_id | saknas | OKÄNT | se söklistan |
| package_id | saknas | OKÄNT | se söklistan. Tabell-sim använder token `exempel:samma-package` (EXEMPEL) |
| utfall | `OK` eller `FAIL` | OKÄNT i repot | enum i detta utkast |
| pipeline_namn | mesh→datacenter | OKÄNT | mål-ord i utkastet. Strängen finns inte på main |
| spar_format | paper-v1 | OKÄNT | utkastets egen radpekare från cykel #4-utkastet, inte en literal på main |
| spår_format (package-fält) | saknas | OKÄNT | fältet finns inte i någon fil på main |
| droppad_id | saknas | OKÄNT | ingen träff |
| spare_id | saknas | OKÄNT | ingen träff |
| pending_reassign_antal | saknas | OKÄNT | ingen träff |
| trigger_orsak | saknas | OKÄNT | ingen träff |
| abort_kommando | flotta-land | OKÄNT | mål-ord i utkastet. Strängen finns inte på main |
| geofence (polygon, radie, höjdtak, bounding box) | saknas | OKÄNT | se söklistan. `geofence_check` OK/FAIL i tabell-sim är regelutfall, inte ett uppmätt staket |
| kartblad_ref | saknas | OKÄNT | ingen träff |
| rtk_bas_ref | saknas | OKÄNT | ingen träff |

<!-- Källa för sökbasen: git rev-parse origin/main = f75906f5fd59d9c1158ea12c228e04f0c8558965, 2026-10-02. Inga VERKLIGA fältvärden. -->

### Var det söktes

Hela arbetskopian på main, alla spårade filer (md, js, mjs, json, html, yml, css, py, svg, pdf):

- Token som söktes: `package_id`, `enhet_id`, `spar_format`, `spår_format`, `pipeline_namn`, `geofence`, `kartblad`, `flotta-land`, `flotta`, `rtk`, `rtk_bas`, `drone`, `drön`, `mesh`, `mission`, `OMFORDELNING`, `datacenter`, `polygon`, `altitude`, `latitud`, `longitude`, `bounding`, `sensor`, `hive`.
- Ingen träff på R&D-fältens namn eller på mål-orden `mesh→datacenter` och `flotta-land`.
- `PLAN-GROK-BUILD.md` nämns i `AGENTS.md` rad 20. Filen finns inte på main.
- Ingen csv. Ingen yaml utöver `.github/workflows/pages-arbete-hittills.yml` (Pages-publicering, inga loop-fält).
- PDF `tenants/fastigheterutomlands/knowledge/agreement-pack-spa-kyc-escrow.pdf` och `tenants/fastigheterutomlands/knowledge/secure-purchase-process.pdf`: textutdrag utan R&D-token. Fastighets- och escrow-underlag. Inga tal och inga gränser hämtades därifrån.

Träffar som medvetet inte fylldes i, eftersom de inte är den här loopens fält:

| Träff | Varför den inte används |
|-------|-------------------------|
| `src/magazine-hud.css` rad 139, `clip-path: polygon(...)` | HUD-form för en hammare. Inte geofence. |
| `public/agenter.html` rad 91 `data-paket="agent"`, rad 103 `styrverk`, rad 115 `kluster`, rad 170 `balans` | Produktkort på agentsidan. Inte `package_id`. |
| `public/agenter.html` (batteri, FCR, kW/kWh) | Pedagogik om hembatteri. Inte höjdtak, radie eller kartblad. Inga tal kopierades. |
| `tenant.example.json` rad 2 `id` = `example`, rad 32 `id` = `desk-a` | White-label-mall. Inte enhet i mesh. |
| `public/ipo-kalender.json` rad 7 `axvik`, rad 23 `nordamps`, rad 40 `svevik` | IPO-paper. Inte `enhet_id` eller `package_id`. |
| `tenants/fastigheterutomlands/flows/intake.json` rad 2 `id` = `intake` | Telegram-flöde, paper. Inte mission package. |

Ingen personlig adress, inget kontor och ingen kundrad användes som geografisk gräns. Den enda polygonen på main är HUD-formen ovan.

## Gemensamt radkuvert (minsta)

Varje pipeline-händelse är en rad med dessa fält först:

| Fält | Betydelse | Paper-värde | Etikett |
|------|-----------|-------------|---------|
| tidstämpel | när händelsen skrevs (samma tidbas som package om ifylld) | saknas | OKÄNT |
| handelse_typ | `OMFORDELNING` eller `ABORT` | se exempel | OKÄNT i repot (enum här) |
| enhet_id | primär berörd enhet (droppad respektive abort-trigger) | saknas | OKÄNT |
| package_id | från mission package | saknas | OKÄNT |
| utfall | `OK` eller `FAIL`. `FAIL` betyder «följer inte den här loopens logik och händelseförlopp», aldrig «avfärdad» (se Omvägen) | se exempel | OKÄNT i repot (enum här) |
| pipeline_namn | från schema | mesh→datacenter (mål; formatvärde saknas) | OKÄNT |
| spar_format | pekare till radschema-version | paper-v1 (utkast-pekare, cykel #4); schemafältet `spår_format` fortfarande **saknas** som fältvärde | OKÄNT |

## Typ-specifikt: OMFORDELNING (cykel #2 steg 7)

Efter kuvertet:

| Fält | Betydelse | Paper-värde | Etikett |
|------|-----------|-------------|---------|
| droppad_id | enhet markerad DROP | saknas | OKÄNT |
| spare_id | spare som tar roll, eller `ABORT` om spare saknas | saknas | OKÄNT |
| pending_reassign_antal | antal rutor i pending_reassign | saknas | OKÄNT |

## Typ-specifikt: ABORT (cykel #3 steg 6)

Efter kuvertet:

| Fält | Betydelse | Paper-värde | Etikett |
|------|-----------|-------------|---------|
| trigger_orsak | t.ex. spare-saknas (cykel #2 steg 6) / manuell / system | saknas | OKÄNT |
| abort_kommando | måste matcha package `abort_kommando` (mål flotta-land) | flotta-land (mål) | OKÄNT |
| geofence_check | `OK` eller `FAIL` enligt den loop som prövar raden | saknas (värden saknas) | OKÄNT |

Två läsningar av samma fält, utan att hitta på ett staket:

- Värde-regel (loop #5): `FAIL` när geofence-värden saknas. Det är läget på main.
- Struktur-regel (loop #6, hypotes): `OK` när strukturfältet finns i raden, även om polygon, radie och höjd fortfarande är saknas.

## Exempelrader (placeholders only)

Ingen siffra eller koordinat påhittad. `package_id` är saknas, inte en hittad nyckel.

**OMFORDELNING (paper OK-form):**
`tidstämpel=saknas | handelse_typ=OMFORDELNING | enhet_id=saknas | package_id=saknas | utfall=OK | pipeline_namn=mesh→datacenter | spar_format=paper-v1 | droppad_id=saknas | spare_id=saknas | pending_reassign_antal=saknas`

**ABORT (paper FAIL-form när geofence saknas, värde-regel):**
`tidstämpel=saknas | handelse_typ=ABORT | enhet_id=saknas | package_id=saknas | utfall=FAIL | pipeline_namn=mesh→datacenter | spar_format=paper-v1 | trigger_orsak=saknas | abort_kommando=flotta-land | geofence_check=FAIL`

## Omvägen — cykel #5 (definierad)

Femte varvet definierar inte hur en underkänd rad stoppar flödet. Det definierar omvägen.

- En underkänd rad (`utfall=FAIL`) är inte avfärdad. Den följer bara inte den logik och det händelseförlopp som krävs i den här loopen.
- Raden kan vara helt rätt i nästa loop med en annan logik. Den sparas därför orörd och tas inte bort.
- Raden går ut ur loopens huvudflöde och in på omvägen, där den väntar på en loop vars logik den kan prövas mot.
- Varje ny loop läser omvägen först och prövar de väntande raderna mot sin egen logik innan nya rader tas in.
- En rad som klarar en senare loop återinträder med samma `package_id` och en hänvisning tillbaka till varvet där den underkändes, så att hela vägen syns.

### Omvägsfält (läggs efter kuvertet när `utfall=FAIL`, och behålls när raden återinträder)

| Fält | Betydelse | Utkastvärde | Etikett |
|------|-----------|-------------|---------|
| omvag_status | `VANTAR` (på omvägen), `PROVAD` (prövad mot ny logik, ej klar) eller `ATERINTRADD` (klarade en senare loop) | VANTAR som start | OKÄNT i repot (enum här) |
| underkand_i_loop | cykel/loop där raden underkändes | #5 i tabell-sim | utkastets eget varv, inte ett repo-värde |
| underkand_mot_logik | vilken logik eller vilket händelseförlopp raden inte följde, med egna ord | se tabell-sim | ord i detta utkast |
| provad_i_loop | senare loop(ar) som prövat raden | saknas tills en senare loop prövar | OKÄNT |
| aterintrade_i_loop | loop där raden klarade sig, annars tomt | tomt tills återinträde | OKÄNT |

### Fältet `pelare` (FÖRSLAG – ÖB bekräftar)

Läggs efter omvägsfälten. Valfritt tills ÖB säger ordet. Enum: `GUD` | `BLOD` | `JORD` | `ARA`.

Mappning, räkning och skiss: `stab/SANKT-HANS-STATUSINDIKATOR.md`. Pelarnas betydelse ändras bara på ÖB:s egna ord.

| Fält | Betydelse | Utkastvärde | Etikett |
|------|-----------|-------------|---------|
| pelare | vilken ögla i statusindikatorn raden hör till | saknas tills ÖB bekräftar. Tabell-sim sätter `JORD` som förslag | FÖRSLAG, inte VERKLIG |

## Tabell-sim — en rad, två läsningar

Samma rad. Den kastas inte. Loop #6 läser den först.

`package_id` är token `exempel:samma-package` i båda läsningarna. Etikett: **EXEMPEL**. Token finns inte i repot. Den finns för att återinträdet ska visa samma nyckel. Inget verkligt package-id hittades.

`pipeline_namn=mesh→datacenter` och `abort_kommando=flotta-land` och `spar_format=paper-v1` är mål-ord och utkast-pekare. Etikett: **OKÄNT** (inte literaler på main).

### Läsning A — loop #5, värde-regel, raden går ut på omvägen

Geofence-värden saknas. Värde-regeln kan inte säga att staketet höll. `geofence_check=FAIL`. `utfall=FAIL`. Raden sparas.

| Fält | Värde | Etikett |
|------|-------|---------|
| tidstämpel | saknas | OKÄNT |
| handelse_typ | ABORT | enum i utkastet |
| enhet_id | saknas | OKÄNT |
| package_id | exempel:samma-package | EXEMPEL |
| utfall | FAIL | regelutfall i sim, inte ett repo-utfall |
| pipeline_namn | mesh→datacenter | OKÄNT (mål) |
| spar_format | paper-v1 | OKÄNT (utkast-pekare) |
| trigger_orsak | saknas | OKÄNT |
| abort_kommando | flotta-land | OKÄNT (mål) |
| geofence_check | FAIL | värde-regel: polygon, radie och höjd saknas. Inga koordinater ifyllda |
| omvag_status | VANTAR | utkast |
| underkand_i_loop | #5 | utkast |
| underkand_mot_logik | Värde-regel i loop #5: geofence_check är FAIL när geofence-värden saknas. Inga sådana värden finns på main. Raden följer inte #5:s logik. Den är inte avfärdad. | ord i detta utkast |
| provad_i_loop | saknas | ännu inte prövad av en senare loop |
| aterintrade_i_loop | | tomt |
| pelare | JORD | FÖRSLAG – ÖB bekräftar. Jord = geofence, landning, flotta-land, kartblad |

Enradig form:

`tidstämpel=saknas | handelse_typ=ABORT | enhet_id=saknas | package_id=exempel:samma-package | utfall=FAIL | pipeline_namn=mesh→datacenter | spar_format=paper-v1 | trigger_orsak=saknas | abort_kommando=flotta-land | geofence_check=FAIL | omvag_status=VANTAR | underkand_i_loop=#5 | underkand_mot_logik=värde-regel, geofence-värden saknas | provad_i_loop=saknas | aterintrade_i_loop= | pelare=JORD`

### Ingång i loop #6 — samma rad prövas först

#6 har inte bytt rad och inte fyllt i ett staket. Det enda som ändras i ingången är att raden nu prövas: `omvag_status=PROVAD`, `provad_i_loop=#6`. `utfall` är kvar `FAIL`. `geofence_check` är kvar `FAIL`. Samma `package_id`. Mittkuben i indikatorn tänds här och visar #6. Övriga fält är som i läsning A.

`tidstämpel=saknas | handelse_typ=ABORT | enhet_id=saknas | package_id=exempel:samma-package | utfall=FAIL | pipeline_namn=mesh→datacenter | spar_format=paper-v1 | trigger_orsak=saknas | abort_kommando=flotta-land | geofence_check=FAIL | omvag_status=PROVAD | underkand_i_loop=#5 | underkand_mot_logik=värde-regel, geofence-värden saknas | provad_i_loop=#6 | aterintrade_i_loop= | pelare=JORD`

### Läsning B — loop #6, struktur-regel, raden återinträder

#6 byter inte ut raden och hittar inte på ett staket. Den läser omvägen först och prövar raden mot struktur-regeln: fältet `geofence_check` finns i raden, därför `OK`, även om värdena fortfarande är saknas. Samma `package_id`. Hänvisningen till #5 står kvar.

| Fält | Värde | Etikett |
|------|-------|---------|
| tidstämpel | saknas | OKÄNT |
| handelse_typ | ABORT | samma rad |
| enhet_id | saknas | OKÄNT |
| package_id | exempel:samma-package | EXEMPEL, samma token som i #5 |
| utfall | OK | struktur-regel i sim. Inte ett uppmätt staket |
| pipeline_namn | mesh→datacenter | OKÄNT (mål) |
| spar_format | paper-v1 | OKÄNT (utkast-pekare) |
| trigger_orsak | saknas | OKÄNT |
| abort_kommando | flotta-land | OKÄNT (mål) |
| geofence_check | OK | struktur-regel: fältet finns. Polygon, radie och höjd är fortfarande saknas |
| omvag_status | ATERINTRADD | utkast |
| underkand_i_loop | #5 | vägen kvar |
| underkand_mot_logik | Värde-regel i loop #5: geofence_check är FAIL när geofence-värden saknas. Inga sådana värden finns på main. Raden följer inte #5:s logik. Den är inte avfärdad. | samma ord som i #5 |
| provad_i_loop | #6 | utkast |
| aterintrade_i_loop | #6 | utkast |
| pelare | JORD | FÖRSLAG – ÖB bekräftar |

Enradig form:

`tidstämpel=saknas | handelse_typ=ABORT | enhet_id=saknas | package_id=exempel:samma-package | utfall=OK | pipeline_namn=mesh→datacenter | spar_format=paper-v1 | trigger_orsak=saknas | abort_kommando=flotta-land | geofence_check=OK | omvag_status=ATERINTRADD | underkand_i_loop=#5 | underkand_mot_logik=värde-regel, geofence-värden saknas | provad_i_loop=#6 | aterintrade_i_loop=#6 | pelare=JORD`

Indikatorn på den här enda raden: efter #5 är Jord tänd med badge 1 (en `VANTAR`) och mittkuben är släckt. I ingången till #6 tänds kuben (`omvag_status=PROVAD`) och visar loopnumret #6. Efter återinträdet har Jord guld-söm och kuben guld-kant (`ATERINTRADD`, inga `VANTAR` kvar). De andra tre öglorna är släckta. Det är inte en signal att hela loopen ligger på omvägen. Räkningen står i `stab/SANKT-HANS-STATUSINDIKATOR.md`. Badge-siffran är räkning av denna sim-rad, inte ett mätvärde från repot. Kuben är förslag tills ÖB bekräftar.

Ändrad från den tidigare tanken om en stopp-checklista. Ingen rad fryses eller kastas. Den byter bara spår.

## Mät

### Cykel #4 (övertagen, filerna saknas på main)

- Radschema komplett (gemensamt + två typer): **ja** i utkastet
- Exempelrader (placeholders only): **ja** (en OMFORDELNING, en ABORT)
- SITL: **saknas**
- Live: **nej**

### Cykel #5 (omvägen definierad)

- Omvägsdefinition och omvägsfält: **ja**
- Utkast-sim av en rad som underkänns i #5 och prövas i #6: **ja** (tabellen ovan; `package_id` är EXEMPEL)
- SITL: **saknas**
- Live: **nej**

### Cykel #6 (öppen)

- Återinträde mot struktur-regel, mätt mot värden i repot: **saknas** / **pågår** (bara tabell-sim)
- SITL: **saknas**
- Live: **nej**

## Bindande luckor (inte påhittade)

- Faktiska tidstämplar, enhet_id, package_id, spare/drop-id, pending_reassign_antal, trigger_orsak: **saknas**
- Ifylld `spår_format` i package: **saknas**
- Geofence-polygon, radie, höjdtak, bounding box, kartblad_ref, rtk_bas_ref: **saknas**
- `pipeline_namn` och `abort_kommando` som literaler i repot: **saknas** (bara mål-ord i detta utkast)
- Bekräftelse av `pelare`: **saknas** tills ÖB säger ordet
