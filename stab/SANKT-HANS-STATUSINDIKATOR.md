# Sankt Hans statusindikator

Status: utkast · endast internt · varv 5/6 · 2026-10-02

Paper. Ingen kundyta. Ingen live.

## Vad öglorna visar

Sankt Hans vapen är klustrets sigill: tecknet ⌘ (U+2318), slingan med fyra öglor. Grundtexten står i `stab/SANKT-HANS-VAPEN.md`. Bilden av sigillet står i `stab/sigill/klustrets-sigill.svg`. De två filerna hör till ett separat utkast och läggs inte in här.

I R&D-loopen blir de fyra öglorna en statusindikator. En ögla per pelare. Placering är densamma som i `stab/SANKT-HANS-VAPEN.md`:

```
              GUD
               │
   ÄRA ──────  ⌘  ────── BLOD
               │
              JORD
```

Skiss med en tänd ögla: `stab/sigill/statusindikator-skiss.svg`.

Öglan tänds när en rad i den pelarens område tar omvägen i stället för att stoppa loopen. Släckt ögla betyder att pelaren inte har några omvägsrader. Flera tända öglor betyder omvägsrader i flera områden samtidigt. Alla fyra tända betyder att hela loopen ligger på omvägen detta varv. Det är en signal till MindCore att planera om logiken till nästa loop. Det är inte ett stopp.

Badge (siffra på öglan) är antalet rader med `omvag_status=VANTAR` i den pelaren. När pelarens väntande rader har `ATERINTRADD` går öglan från tänd till en guld-söm, en kontur. Guld-söm betyder att omvägen är gången och raderna är tillbaka, inte att ett nytt fel har hittats.

## FÖRSLAG – ÖB bekräftar

Mappning från rad till pelare. Förslag tills ÖB säger ordet. Pelarnas betydelse i sigillet ändras bara på ÖB:s egna ord. Ett ja som en agent för vidare räknas inte.

| Pelare | Plats | Område i R&D-loopen | Enum |
|--------|-------|---------------------|------|
| Gud | övre öglan | Helheten. `pipeline_namn`, `spar_format`, package-nivåns integritet, hela vägen mesh→datacenter. | `GUD` |
| Blod | högra öglan | Samförståndet och kretsloppet. `OMFORDELNING`, spare som tar över, samordning mellan enheter. | `BLOD` |
| Jord | nedre öglan | Jorden och marken. `geofence_check`, landning, `flotta-land`, kartblad. | `JORD` |
| Ära | vänstra öglan | Ansvaret och sanningen. Dataintegritet: `tidstämpel`, `enhet_id`, saknade eller obekräftade värden, märkning VERKLIG mot SIMULERAD. | `ARA` |

Valfritt radfält, efter omvägsfälten i `rd/RD-pipeline-radformat-SCHEMA-paper.md`:

`pelare` = `GUD` | `BLOD` | `JORD` | `ARA`

Tills ÖB bekräftar står fältet som förslag. Tabell-sim i schemat sätter `JORD` på abort-raden, eftersom underkännandet sitter i `geofence_check`.

## Så räknas indikatorn

Underlag är pipeline-rader. Fält som läses:

`tidstämpel`, `handelse_typ`, `enhet_id`, `package_id`, `utfall`, `omvag_status`, `pelare`

För varje pelare, varv för varv:

1. Ta de rader vars `pelare` är den pelaren och vars `omvag_status` är `VANTAR`, `PROVAD` eller `ATERINTRADD`. Övriga rader tänder ingen ögla.
2. `vantar` = antal av de raderna med `omvag_status=VANTAR`.
3. `ater` = antal med `omvag_status=ATERINTRADD`.
4. Inga sådana rader: öglan är släckt.
5. `vantar` större än noll: öglan är tänd. Badge = `vantar`.
6. `vantar` är noll och `ater` är större än noll: öglan har guld-söm. Inget väntar. De som väntade har återinträtt.
7. Både `vantar` och `ater` större än noll: öglan förblir tänd, badge = `vantar`. Guld-söm ritas inte förrän inga `VANTAR` återstår i pelaren.
8. Alla fyra öglor tända i samma varv: signal till MindCore att planera om logiken till nästa loop. Loopen stannar inte. Raderna ligger kvar på omvägen.

`handelse_typ`, `utfall`, `tidstämpel`, `enhet_id` och `package_id` följer med så att vägen kan läsas. De ändrar inte tändningen. Tändningen styrs av `omvag_status` och `pelare`.

En rad utan `pelare` tänder ingen ögla. Den ligger kvar i schemat tills ÖB bekräftar mappningen.

## Räkneexempel från tabell-sim

Källa: läsning A och B i `rd/RD-pipeline-radformat-SCHEMA-paper.md`. En rad. Inga repo-värden. `package_id` är token `exempel:samma-package` (EXEMPEL).

Raden:

| tidstämpel | handelse_typ | enhet_id | package_id | utfall | omvag_status | pelare |
|------------|--------------|----------|------------|--------|--------------|--------|
| saknas | ABORT | saknas | exempel:samma-package | FAIL i #5, OK i #6 | VANTAR i #5, ATERINTRADD i #6 | JORD (förslag) |

Efter loop #5:

| Ögla | Läge | Badge |
|------|------|-------|
| Gud | släckt | |
| Blod | släckt | |
| Jord | tänd | 1 |
| Ära | släckt | |

Badge 1 är antalet `VANTAR` i den här sim-raden. Det är inte ett mätvärde från repot. Skissen visar detta läge.

Efter loop #6, samma rad prövad först:

| Ögla | Läge | Badge |
|------|------|-------|
| Gud | släckt | |
| Blod | släckt | |
| Jord | guld-söm | |
| Ära | släckt | |

Inte alla fyra. Ingen signal att hela loopen ska planeras om. Jord har gått omvägen och återinträtt. Geofence-värdena är fortfarande saknas.

## Regler

- Endast internt. Ordet ÖB, pelarna och indikatorn ska inte synas i kundytor.
- Pelarnas betydelse ändras bara på ÖB:s egna ord.
- Tecknet är ⌘ (U+2318). Rita öglor, inte sol, hjul eller strålar.
- Indikatorn skickar inget. Den räknar rader i paper-utkastet.
- Tomt fält förblir saknas. Indikatorn hittar inte på id, tid, koordinat eller höjd.
