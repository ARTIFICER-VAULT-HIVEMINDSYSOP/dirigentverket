# White-label · tenant-config (paper)

**Status:** paper. License-text väntar Legal + namngivet ÖB-ja. Ingen kund-PII i licensee-pack.

## Lås (ÖB 2026-09-03)
- Dirigentverket-motorn är white-label: brand, CRM-URL, kalendrar, loggor = **tenant config**, inte i motorn.
- Kund-PII ingår aldrig i backup eller licensee-pack.
- License-text = paper tills Legal skriver och ÖB säger ja.
- Inga påhittade kronor.

## Tenant-nycklar (utkast)
| Nyckel | Syfte | Default i klustret |
|--------|--------|--------------------|
| `brand.name` | Visningsnamn | Kapital och Strategi |
| `brand.logo` | Logotyp-väg/URL | saknas tills namngiven |
| `crm.baseUrl` | ForceX/tenant-CRM | `crm1.forcex.software` |
| `calendar.owner` | Bokningskalender | saknas per tenant |
| `surfaces.magasin` | Magasin på/av | on |
| `surfaces.rider` | Trade Rider paper | on |
| `live.orders` | Live-lampa | off tills namngivet ja |

## Pack-regel
1. Motor + paper-docs utan register.
2. Tenant-overlays i egen fil (inte hårdkod i `src`).
3. Verifiera att dump/backup saknar telefon, saldo, kommentarsregister.

## Inte
- Live-utskick, merge, betala, radera
- PII i git eller backup
