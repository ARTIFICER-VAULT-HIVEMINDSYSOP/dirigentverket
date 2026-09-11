# PAPER: Telegram-svarsrobot — Fastigheterutomlands.com

Status: paper. Kanalbyte från WhatsApp (Meta-lås) → **Telegram**. Live bara efter ÖB namngivet ja. Byggare Bob + VD.

## Varför Telegram

Samma dialogrecept utan Meta WABA/verifiering/selfie. BotFather-token + webhook räcker.

## Vad vi bygger

Svarsrobot med **val** (inline-knappar) och **vidare** till nästa steg eller människa. Styrt träd — inte fri AI först.

## Lager

```
Telegram Bot API
        │ webhook in/out  (eller long-poll paper)
        ▼
Ingress (HTTPS)  — secret token-header, session
        ▼
Session store   — chat-id → state, tenant, språk
        ▼
Dialogmotor     — samma JSON-flöden som WhatsApp-paper
        ▼
Adapters        — CRM/kalender (tenant)
        ▼
Handoff-kö      — människa; bot tyst
```

## Byggstenar (Telegram ≈ Meta)

| Behov | Telegram | Gräns |
|-------|----------|-------|
| 2–3 snabba val | Inline keyboard (callback) | praktiskt ≤3 per rad |
| Fler alternativ | Inline keyboard flera rader / ReplyKeyboard | ≤10 i vårt flöde |
| Formulär | steg-för-steg frågor eller WebApp senare | paper: mock form |
| Första kontakt | användaren startar bot (`/start`) | ingen 24h-template |

## Dialog

Återanvänder `tenants/fastigheterutomlands/flows/intake.json` (+ FAQ):

- `/start` → Interest / Question / Book a call / Human
- FAQ + alltid broker-hänvisning
- Handoff tystar bot

## Tenant-config (aldrig git)

- `telegram.bot_token` (BotFather)
- `telegram.webhook_secret`
- `telegram.bot_username`
- Brand/CRM oförändrat white-label

## Steg för att tända

1. BotFather → `/newbot` → token → tenant-config lokalt
2. Paper: ingress-stub + mock callbacks (inga live-skick)
3. Test: `/start` → knappar → handoff syns i kö
4. Webhook HTTPS mot ingress
5. ÖB namngivet ja → live

## Inte i scope än

- Live token i repo
- WhatsApp parallellt (parkerat p.g.a. Meta-restriktion)
- Betalningar / ads

## Klart när

- Denna paper i Dirigentverket
- Stub: verify-liknande health + mock choice PASS
- Rapport till VD
