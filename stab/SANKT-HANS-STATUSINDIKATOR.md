# Sankt Hans statusindikator

Status: utkast · endast internt · varv 5/6 · 2026-10-02

Paper. Ingen kundyta. Ingen live.

## Vad öglorna visar

Sankt Hans vapen är klustrets sigill: tecknet ⌘ (U+2318), slingan med fyra öglor, och en femte del i mitten. Grundtexten står i `stab/SANKT-HANS-VAPEN.md`. Bilden av sigillet står i `stab/sigill/klustrets-sigill.svg`. De två filerna hör till ett separat utkast och läggs inte in här.

Femte delen är ÖB:s tillägg. Den hör hemma i `stab/SANKT-HANS-VAPEN.md` på det separata utkastet. Denna fil ändrar inte den texten. ÖB:s ord som indikatorn följer: en dubbel, tredimensionell kub i mitten av ⌘, kanter synliga från alla dimensioner, betraktaren sitter i mitten.

I R&D-loopen blir de fyra öglorna och mittkuben en statusindikator. En ögla per pelare. Placering av öglorna är densamma som i `stab/SANKT-HANS-VAPEN.md`. Kuben sitter i mitten av tecknet:

```
              GUD
               │
   ÄRA ──────  ⌘  ────── BLOD
               │    kub i mitten
              JORD
```

Skiss: `stab/sigill/statusindikator-skiss.svg`. Den visar läget efter tabell-simets #6: Jord har guld-söm, kuben har guld-kant och bär loopnumret #6.

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

## FÖRSLAG – ÖB bekräftar — kuben, femte delen

Kuben är inte en pelare och har inget värde i `pelare`. Den visar loopen som helhet.

| Del | Vad den visar |
|-----|----------------|
| Form | Dubbel kub. Två nästlade trådmodeller, isometriska, alla kanter synliga, även de som ligger bakom. Inga fyllda sidor. Betraktaren sitter i mitten. |
| Loopnummer | Numret på loopen som pågår, ritat i mitten. I detta utkast är den öppna loopen **#6**. Under #5 var numret #5. Numret är varvets namn, inte ett mätvärde från repot. |
| Tänd kub | En omvägsrad från en tidigare loop prövas först i den nya loopen: `omvag_status=PROVAD`. |
| Guld-kant | En rad har `omvag_status=ATERINTRADD`. |
| Släckt kub | Ingen rad är `PROVAD` och ingen rad i varvet är `ATERINTRADD`. |

Både tänd och guld-kant kan gälla samtidigt, om någon rad fortfarande är `PROVAD` och en annan redan är `ATERINTRADD`. Guld-kanten ritas då tillsammans med det tända läget. När inga `PROVAD` återstår och minst en rad är `ATERINTRADD` står kuben med guld-kant.

De fyra öglorna ändras inte av kuben. En ögla tänds när en rad i den pelaren tar omvägen. Kuben tänds när en sådan rad från ett tidigare varv prövas först i det nya.

## Så räknas indikatorn

Underlag är pipeline-rader. Fält som läses:

`tidstämpel`, `handelse_typ`, `enhet_id`, `package_id`, `utfall`, `omvag_status`, `pelare`

För varje pelare, varv för varv:

1. Ta de rader vars `pelare` är den pelaren och vars `omvag_status` är `VANTAR`, `PROVAD` eller `ATERINTRADD`. Övriga rader tänder ingen ögla.
2. `vantar` = antal av de raderna med `omvag_status=VANTAR`.
3. `ater` = antal med `omvag_status=ATERINTRADD`.
4. Inga sådana rader: öglan är släckt.
5. `vantar` större än noll: öglan är tänd. Badge = `vantar`.
6. `vantar` är noll, `ater` är noll, och minst en rad är `PROVAD`: öglan förblir tänd. Omvägen pågår, raden prövas. Badge visas inte, eftersom badge bara räknar `VANTAR`.
7. `vantar` är noll och `ater` är större än noll: öglan har guld-söm. Inget väntar. De som väntade har återinträtt.
8. Både `vantar` och `ater` större än noll: öglan förblir tänd, badge = `vantar`. Guld-söm ritas inte förrän inga `VANTAR` återstår i pelaren.
9. Alla fyra öglor tända i samma varv: signal till MindCore att planera om logiken till nästa loop. Loopen stannar inte. Raderna ligger kvar på omvägen.

Kuben, samma rader:

1. Loopnumret i mitten är den loop som nu körs.
2. Minst en rad med `omvag_status=PROVAD`, och den raden kommer från en tidigare loop (`underkand_i_loop` är ett tidigare varv): kuben är tänd.
3. Minst en rad med `omvag_status=ATERINTRADD`: kuben har guld-kant.
4. Varken `PROVAD` eller `ATERINTRADD`: kuben är släckt.

`handelse_typ`, `utfall`, `tidstämpel`, `enhet_id` och `package_id` följer med så att vägen kan läsas. De ändrar inte tändningen. Öglornas tändning styrs av `omvag_status` och `pelare`. Kubens tändning styrs av `omvag_status` på raden som helhet, oavsett pelare.

En rad utan `pelare` tänder ingen ögla. Den ligger kvar i schemat tills ÖB bekräftar mappningen.

## Räkneexempel från tabell-sim

Källa: läsning A, ingången i #6 och läsning B i `rd/RD-pipeline-radformat-SCHEMA-paper.md`. En rad. Inga repo-värden. `package_id` är token `exempel:samma-package` (EXEMPEL).

Raden:

| tidstämpel | handelse_typ | enhet_id | package_id | utfall | omvag_status | pelare |
|------------|--------------|----------|------------|--------|--------------|--------|
| saknas | ABORT | saknas | exempel:samma-package | FAIL i #5, FAIL vid ingång i #6, OK efter struktur-regeln | VANTAR i #5, PROVAD vid ingång i #6, ATERINTRADD efter struktur-regeln | JORD (förslag) |

Efter loop #5:

| Del | Läge |
|-----|------|
| Gud, Blod, Ära | släckta |
| Jord | tänd, badge 1 |
| Kub | släckt. Loopnumret är #5. Ingen tidigare omvägsrad prövas. |

Badge 1 är antalet `VANTAR` i den här sim-raden. Det är inte ett mätvärde från repot.

Ingång i loop #6, samma rad prövas först (`omvag_status=PROVAD`):

| Del | Läge |
|-----|------|
| Gud, Blod, Ära | släckta |
| Jord | tänd, ingen badge. Raden är `PROVAD`, inte `VANTAR`. Öglan förblir tänd medan omvägen pågår. |
| Kub | tänd. Loopnumret är #6. |

Efter struktur-regeln, samma rad (`ATERINTRADD`):

| Del | Läge |
|-----|------|
| Gud, Blod, Ära | släckta |
| Jord | guld-söm |
| Kub | guld-kant. Loopnumret är #6. |

Skissen visar det sista läget. Inte alla fyra öglor. Ingen signal att hela loopen ska planeras om. Jord har gått omvägen och återinträtt. Geofence-värdena är fortfarande saknas.

## Regler

- Endast internt. Ordet ÖB, pelarna och indikatorn ska inte synas i kundytor.
- Pelarnas betydelse ändras bara på ÖB:s egna ord.
- Tecknet är ⌘ (U+2318), med kuben i mitten. Rita öglor och en trådkub, inte sol, hjul eller strålar.
- Kuben får sin betydelse bara på ÖB:s ord. Tills dess är raden ovan märkt förslag.
- Indikatorn skickar inget. Den räknar rader i paper-utkastet.
- Tomt fält förblir saknas. Indikatorn hittar inte på id, tid, koordinat eller höjd.
