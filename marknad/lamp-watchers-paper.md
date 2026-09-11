# Lamp / WATCHERS · paper-skinn (kväll)

**Status:** paper. `live=false` / `LIVE_LOCKED` tills namngivet ja. Inga påhittade kronor, kurser eller P&L.

**Fönster:** kvällstid per ÖB 9 sep 2026. Inte dagtid R&D.

## Vad som landat

Paper-skinn på befintlig Artificer-yta (`#/robot`) i Dirigentverket-nexus. Inte en sidapp.

- Stenkammare + lampa (CSS). Ingen saknad `/watchers.png` i motorn. Valfri kammare via `tenant.skin.watchers.chamber`.
- Anden i lampan = närvaro (veke, dimma, sigill). Inte tecknad ande, inte spam.
- Lätta tell: `idle` / `wait` / `lit` / `trail`. Trail bara när struktur redan sagt trail. Tom plan tänder inte lampan.
- PAPER-badge + live överstruken. `LIVE_LOCKED` stannar true.
- Logo/kicker/kammare från tenant. Tom logo = ingen mark. Ingen kund-PII.

## Filer

| Fil | Roll |
|-----|------|
| `src/style.css` | Stenkammare, lampa, tell |
| `src/robot-ui.js` | Lampkärl, badge, `lampTell` |
| `src/robot.js` | `LIVE_LOCKED`, `paper`/`live=false`, `saknar_sl_tp` |
| `src/tenant.js` | White-label resolve (ingen hårdkodad brand) |
| `tenant.example.json` | `skin.watchers.kicker` / `chamber` |

## Inte

- Live-order, mäklare, mejl, merge
- Påhittade belopp eller kurser
- Brand/logotyp i motorn
- Kund-PII i git
