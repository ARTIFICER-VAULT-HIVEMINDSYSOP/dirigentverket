# Ingress-stub (paper) — Fastigheterutomlands WhatsApp

Ingen live-skick. Verifierar Meta `hub.challenge` och kör mock-val mot `intake.json`.

## Start

```bash
cd marknad/whatsapp/ingress-stub
cp config.example.json config.json   # om saknas
npm start
```

## Smoke

```bash
npm run test:verify
```

## Routes

| Method | Path | Syfte |
|--------|------|--------|
| GET | `/webhook` | Meta verify (`hub.mode`, `hub.verify_token`, `hub.challenge`) |
| POST | `/webhook` | Tar emot payload, svarar 200, skickar inget till Meta |
| GET | `/mock/start` | Nollställ + visa start-lista |
| POST | `/mock/choice` | `{ "chat", "option_id" }` |
| POST | `/mock/text` | fri text (fråga) |
| POST | `/mock/form` | boka-fält (paper) |
| POST | `/mock/reset` | nollställ session |

`verify_token` i `config.json` måste matcha det du sätter i Meta senare. Live kräver ÖB namngivet ja.

## Full branch smoke
```bash
npm run test:all   # verify + Interest/Question/Book/Human
```
