# PAPER: ConnectPoint → ForceX-kommentar (godkännandeportal)

Status: paper. Live Create i ForceX bara efter godkännande. Inget API i agent-UI (2026-09-09).

## Källa

- Produkt: ConnectPoint Agent Workspace (`teleman.pro`)
- Textväg: My Calls → dokument-ikon (Assets) → **AI TRANSCRIPT** (scrollbar text)
- Ingen separat transcript-URL. Settings har ljud/notiser/display — **inga** API-nycklar, tokens, webhooks, developer-export
- Lista har Export (samtal), inte transcript-specifik
- Ingen ljudström i pipen (låg bandbredd)

## Flöde (låst riktning)

1. **Hämta** — älva öppnar My Calls, plockar AI TRANSCRIPT + metadata (tid, nummer, agent, status ENDED). Matcha ForceX-kund via telefon (E.164).
2. **Utkast** — AI skriver kort ForceX-kommentar på **engelska** (samma stil som magasin-utfall). Inga dubbletter: jämför befintliga kommentarer först.
3. **Godkännandeportal** — kö med: kund-ID/namn (brand), telefon, call-id, transcript (collapse), utkast. Knapp **Godkänn** / **Ändra** / **Avvisa**.
   - Agent godkänner sina egna.
   - Supervisor (ÖB/stab) stickprov: transcript vs utkast.
4. **Create** — bara godkända rader: ForceX user-detail → Create a comment → Create. Bevis = rad synlig i listan.
5. **Logg** — call-id + ForceX-kund-id + tidpunkt godkänd/skapad. Ingen PII-dump till GitHub.

## Portal (minimal UI)

- En kö-sida (mörk, samma sten/ton som övriga verktyg)
- Rad: väntan | kund | utkast-preview | [öppna]
- Detalj: transcript + redigerbart utkast + Godkänn / Avvisa
- Status: `pending` → `approved` → `written` | `rejected`
- Tenant-fält: ConnectPoint-bas-URL, ForceX-bas-URL, brand — inte hårdkodat i motor

## Utförare

- ConnectPoint + ForceX = box-browser (ingen connector)
- Skrapa/läs UI tills tenant-admin ger API (saknas i agent-Settings)
- Skapa aldrig kommentar utan portal-godkännande

## Portal-stub (paper)

Statisk HTML: `public/connectpoint-godkannande.html`  
Tenant-platshållare: `public/connectpoint-godkannande.config.example.json` och `tenant.example.json` → `connectpoint.baseUrl`, `crm.url`, `skin.name`.

Exempelrader endast. Inga ForceX-skrivningar från sidan. **Live Create kräver namngivet ÖB-ja.**

## Klart när

- Paper-fil i Dirigentverket (denna)
- Portal HTML-stub (paper-kö, lokal Godkänn/Ändra/Avvisa)
- Senare: älva-recept; bevis = godkänd rad syns i ForceX-kommentarlista efter ÖB-ja

## Inte i scope än

- Tenant-admin / API-token (fråga ConnectPoint om de har tenant-nivå)
- Ljud/inspelning
- Automatisk Create utan godkännande
