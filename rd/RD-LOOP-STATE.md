# R&D LOOP STATE — aktiv cykel

**Uppdaterad:** 2026-10-02 — cykel **#6** — status: **öppen**
(Cykel #5 avslutad 2026-10-02 — omvägen definierad. Schema: `rd/RD-pipeline-radformat-SCHEMA-paper.md`)

Paper. Live: **nej**. Inga produktionsdata.

`RD-LOOP-LOG.md` saknas på main. Raderna om cykel #1–#4 är övertagna från tillståndsutkastet 2026-10-02. De filerna finns inte i repot (ingen `rd/` före detta utkast; sök på `origin/main` @ `f75906f`).

## Observe (nu)

- Hive → terrängrekognosering-lära: nämns i tillståndsutkastet. Fil saknas på main.
- Cykel #1: mission-package-schema (paper) komplett vs hive-checklista 5/5 struktur. Fil saknas på main.
- Cykel #2: spare-omfördelningschecklista (paper) 7/7 regler + tabell-sim drop. Fil saknas på main.
- Cykel #3: abort→flotta-land tidsordning (paper) 6/6 + ordningstabell; paper-FAIL om geofence saknas. Fil saknas på main.
- Cykel #4: artefaktpipeline-radformat (paper) gemensamt kuvert + OMFORDELNING/ABORT + två exempelrader (placeholders). Innehållet ligger nu i schemat, uppdaterat för varv 5/6.
- Cykel #5: omvägen definierad. En `FAIL`-rad sparas och prövas först i nästa loop. Tabell-sim: en ABORT-rad underkänns i #5 på värde-regel (geofence-värden saknas) och återinträder i #6-sim på struktur-regel. Samma `package_id`-token `exempel:samma-package` (EXEMPEL, inte i repot).
- Kartblad / svensk ruta / sensorprofil / ticket: **saknas**
- Package-värden för `spår_format` / id:n / geofence: **saknas** (söklista i schemat)
- Hemside/PR-spår = separat. Denna loop rör inte publika ytor.

## Hypotes (#5) — klar 2026-10-02

Om en underkänd rad i utkast-radformatet leds över till en omväg i stället för att stoppa flödet, kan loopen behålla allt underlag och pröva samma rad mot en annan logik i nästa varv, utan riktiga data.

## Experiment (#5) — klart

Omvägen är skriven i `rd/RD-pipeline-radformat-SCHEMA-paper.md`. En `FAIL`-rad är inte avfärdad, bara utanför den här loopens logik och händelseförlopp. Omvägsfälten är `omvag_status`, `underkand_i_loop`, `underkand_mot_logik`, `provad_i_loop`, `aterintrade_i_loop`. Varje ny loop läser omvägen först. Återinträde sker med samma `package_id`. Inga koordinater och inga påhittade mätetal. (Ersätter den tidigare stopp-checklistan.)

## Mät (#5)

- Omvägsdefinition och omvägsfält i schemautkastet: **ja** (2026-10-02)
- Utkast-sim av en rad som underkänns i #5 och prövas i #6 (tabell): **ja** (2026-10-02, i schemat)
- SITL: **saknas**
- Live: **nej**

## Lärdom (#5)

Omvägen håller som regel i utkastet: underkänd rad sparas, och nästa loop kan pröva den mot en annan logik. Repot gav inga värden att fylla tid, enhet, package, spårformat eller geofence med. Simuleringen visar skillnaden mellan värde-regel och struktur-regel. Den mäter inte ett riktigt återinträde.

## Hypotes (#6) — öppen

Rader som underkändes i #5 prövas först mot en annan logik. Exempel i detta varv: `geofence_check` använder struktur-regel (fältet finns i raden) i stället för värde-regel (ifyllda geofence-värden). Hypotes: samma rad kan återinträda med samma `package_id` utan att loopen stannar, och utan att ett staket hittas på.

## Experiment (#6) — pågår

Första prövningen är tabell-sim i schemat: läsning A är `utfall=FAIL`, `omvag_status=VANTAR`, `underkand_i_loop=#5`. Läsning B är samma rad, `utfall=OK` enligt struktur-regeln, `omvag_status=ATERINTRADD`, `provad_i_loop=#6`, `aterintrade_i_loop=#6`, samma `package_id`. Geofence-värdena är fortfarande saknas. Ingen ny mätning mot repo-data.

## Mät (#6)

- Återinträde mot annan logik, mätt mot värden i repot: **saknas** / **pågår**
- Antal `VANTAR` som blev `ATERINTRADD` utanför tabell-sim: **saknas**
- SITL: **saknas**
- Live: **nej**

## Lärdom (#6)

**saknas** — fylls när mätningen är klar.

## Nästa hypotes (förhands)

Om #6:s struktur-regel håller när den mäts: nästa utkast visar hur återinträdet syns i mesh→datacenter-handoff, fortfarande utan fältdata och utan kurs-hämtning.

## Block / ÖB-beslut

- Inga nya block.
- Live-flygning och namngiven ruta kräver ÖB-ja (ej begärt).
- Fyllnad av kartblad_ref / sensorläge / N/M / rtk_bas_ref / geofence-värden / spår_format = ÖB när hen vill. Loopen kör paper vidare utan det.
- Fältet `pelare` och öglornas mappning är förslag. Pelarnas betydelse ändras bara på ÖB:s egna ord. Se `stab/SANKT-HANS-STATUSINDIKATOR.md`.
