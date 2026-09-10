# PAPER: Telegram-svarsrobot — Fastigheterutomlands.com

Status: paper. **Kanalbyte från WhatsApp** (ÖB 2026-09-10): samma recept, slippa Meta-verifiering. Live-skick bara efter namngivet ja. Byggare Bob + VD.

## Varför Telegram

- BotFather → token på minuter (ingen Business Manager / WABA / display-name-granskning)
- Inline-knappar + reply keyboard = samma valträd
- Webhook eller long-poll; ingen 24h-template-mur för första svar (kunden startar med /start)

## Samma recept (återanvänd)

- Flöde: `tenants/fastigheterutomlands/flows/intake.json` (Interest / Question / Book / Human)
- FAQ: `knowledge/faq-secure-purchase.json` + mäklarhänvisning, ingen IBAN i chatt
- Handoff-kö oförändrad
- Dialogmotor tenant-agnostisk — byt bara `meta.channel` → `telegram_bot_api` + adapter

## Lager

```
Telegram Bot API
        │ webhook / getUpdates
        ▼
Ingress (HTTPS)  — secret token i header
        ▼
Session store
        ▼
Dialogmotor (samma JSON-noder)
        ▼
Adapters (CRM/handoff)
```

## Mapping WhatsApp → Telegram

| WA | Telegram |
|----|----------|
| Reply buttons (≤3) | InlineKeyboard (rader) |
| List (≤10) | InlineKeyboard eller reply keyboard |
| Flows (formulär) | stegvisa frågor / WebApp senare |
| Template utanför 24h | Behövs ej — bot svarar efter /start |

## Steg för att tända

1. @BotFather → `/newbot` → spara token i tenant-config (aldrig git)
2. Sätt webhook till ingress (paper stub först)
3. Mock: /start → meny → alla grenar (samma test:all-idé)
4. ÖB namngivet ja → live

## Inte i scope

- WhatsApp-live (parkerad)
- Token i repo
- Auto-CRM Create utan godkännande

## Klart när

- Denna paper
- Telegram-stub + smoke (Bob)
- Live efter ja
