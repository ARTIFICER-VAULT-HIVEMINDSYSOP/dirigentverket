# PAPER: WhatsApp-svarsrobot — Fastigheterutomlands.com

Status: paper. Tenant tills ÖB byter: **Fastigheterutomlands.com**. Live-skick bara efter namngivet ja. Byggare Bob + ARTIFICER.

## Vad vi bygger

Svarsrobot som ger **val** (knappar/lista) och **tar vidare** till nästa steg eller människa. Inte fri chatt-AI först — styrt träd.

## Lager (ramverk)

```
WhatsApp (Meta Cloud API)
        │ webhook in/out
        ▼
Ingress (HTTPS)  — verifiera Meta-signatur, 24h-fönster
        ▼
Session store   — chat-id → state, tenant, språk
        ▼
Dialogmotor     — JSON-flöden (noder: message | choice | form | handoff)
        ▼
Adapters        — ForceX/CRM, kalender, magasin (tenant)
        ▼
Handoff-kö      — människa tar över; robot tyst
```

## WhatsApp-byggstenar (Meta)

| Behov | Verktyg | Gräns |
|-------|---------|-------|
| 2–3 snabba val | Reply buttons | max 3 |
| Fler alternativ | List message | max 10 |
| Formulär (namn, land, budget-band) | WhatsApp Flows | flerskärm |
| Första kontakt utanför 24h | Godkänd **template** | Meta-granskning |
| Inuti 24h efter kund | Fri text + interactive | |

## Dialogmotor (tenant-agnostisk)

Flödesfil per tenant, t.ex. `tenants/fastigheterutomlands/flows/intake.json`:

- `start` → hälsning + lista: Intresse / Fråga / Boka samtal / Människa
- Varje val → `next` eller `handoff`
- `handoff`: tagg, sammanfattning till agent, stoppa bot
- Inga kronor/kurser i svar om cell saknas
- Brand, telefonnummer-ID, webhook-secret = tenant-config

## Steg för att tända (ordning)

1. Meta Business + WhatsApp Business Account + nummer till Fastigheterutomlands
2. Cloud API-app, permanent token, webhook-URL (vår ingress)
3. Paper: flödes-JSON + mock webhook (inga live-meddelanden)
4. Testnummer → knappar → handoff syns i kö
5. ÖB namngivet ja → live template + produktion

## Vidareföring (det ÖB vill)

- Val A → mer info (länk till sajt / kort text)
- Val B → lead-fält (Flow) → lagra → bekräftelse
- Val C → **handoff** till sälj/mötesbokare (notis + kön)
- Timeout / “prata med någon” → alltid handoff

## Inte i scope än

- Live WhatsApp-token i repo
- Automatisk CRM-Create utan godkännande (samma princip som ConnectPoint-portalen)
- AI-fri text som enda väg (kan tilläggas senare bakom val)

## Klart när

- Denna paper i Dirigentverket
- Byggare Bob har uppdraget
- Nästa: flödes-JSON v1 + ingress-stub (paper)

## Leverans v1 (Byggare Bob)
- Flöde: `tenants/fastigheterutomlands/flows/intake.json`
- Meta-steg ÖB: `marknad/whatsapp/META-steg-ob.md`
- Status: paper. Ingress-stub nästa.
