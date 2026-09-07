# Nyhetssele

Paper. Parallell till Pilotsele. Inte live-mejl.

**Nyhetssele** är selen för vardagsmorgonens utskick. Den binder remmarna i `marknad/RECEPT.md`. Den skickar inte.

`paper: true` tills namngivet ja **och** mottagarlista. Utan båda stannar selen paper. Appen har ingen knapp som skickar live.

## Remmar

| Rem | Tom cell |
| --- | --- |
| `date` | saknas |
| `subject` | saknas |
| `sources` | SVT, DI, Avanza, Nordnet, Baha, MFN, IPO |
| `oil` | saknas — gissas inte |
| `gold` | saknas — gissas inte |
| `provaForst` | default true |
| `disclaimer` | saknas |
| `filePath` | saknas |
| `namedYes` | false tills ÖB säger ja |
| `recipients` | saknas — ingen PII i git |
| `paper` | alltid true härifrån |

Olja och guld får vara tomma. Tom = saknas, inte 0 och inte en påhittad kurs.

## Regler

1. Validera remmar. Fyll inte i priser.
2. Skicka aldrig e-post från den här ytan.
3. Prova-först före namngivet ja.
4. White-label: källor och disclaimer i tenant-fält, inte bara KS.
