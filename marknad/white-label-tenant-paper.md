# White-label · tenant-config (paper)

**Status:** paper. License-text väntar Legal + namngivet ÖB-ja. Ingen kund-PII i licensee-pack.

## Lås (ÖB 2026-09-03)
- Dirigentverket-motorn är white-label: brand, CRM-URL, kalendrar, loggor = **tenant config**, inte i motorn.
- Kund-PII ingår aldrig i backup eller licensee-pack.
- License-text = paper tills Legal skriver och ÖB säger ja.
- Inga påhittade kronor.

## Befintliga filer (main)
| Fil | Roll |
|-----|------|
| `tenant.example.json` | Mall för ny licenstagare (skin, crm, calendars, magazines, sele, rules, license) |
| `public/tenant.js` | Läser `./tenant.json` runtime; fallback till KS-skin. Ingen PII. |
| `tenants/<slug>/` | Tenant-overlays (t.ex. Fastigheterutomlands flows/knowledge) — utan kundregister |

Kopiera `tenant.example.json` → `public/tenant.json` (eller tenant-overlay) per licens. `tenant.json` med skarpa CRM-nycklar/köer gitignoreras eller hålls utanför pack.

## Tenant-nycklar (utkast ↔ example)
| Nyckel (paper) | `tenant.example.json` | Default i klustret |
|----------------|------------------------|--------------------|
| `brand.name` | `skin.name` | Kapital och Strategi |
| `brand.logo` | `skin.logo` | saknas tills namngiven |
| `crm.baseUrl` | `crm.url` | `crm1.forcex.software` |
| `crm.open` | `crm.open` | `detail` (aldrig Call) |
| `calendar.owner` | `calendars[]` | saknas per tenant |
| `surfaces.magasin` | `magazines[]` | on |
| `surfaces.watchers` | `skin.watchers.kicker` / `chamber` | `#/robot` paper-skinn |
| `surfaces.rider` | (nexus `#/rider`) | on / paper |
| `live.orders` | `rules.paper_default` + ÖB-ja | off tills namngivet ja |
| `license.*` | `license.status/licensor/licensee/fee` | paper / `saknas` |

## Pack-regel
1. Motor + paper-docs utan register.
2. Tenant-overlays i egen fil/mapp (inte hårdkod i `src`).
3. Verifiera att dump/backup saknar telefon, saldo, kommentarsregister.
4. `fee` och belopp = `saknas` tills Legal + ÖB; hitta inte på kronor.

## Inte
- Live-utskick, merge, betala, radera
- PII i git eller backup

## Magasin-genväg (paper)
KS `/admin` → Magasin är ofärdigt tills DNS/Pages sitter. Lokal magasin-hälsa = port `8765` (HTTP 200). Tenant-yta `magazines[]` styr desk-köer; ingen kund-PII i example.

