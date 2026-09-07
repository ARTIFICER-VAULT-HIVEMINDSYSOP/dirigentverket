# Sele

Paper. Låst av ÖB via stab. Inte live. Inte ForceX.

**Sele** är sele / control harness: den binder pilotens volymregel och SL/TP-mall till ett valt klienturval. Robot och älvor ärver. De höjer aldrig volymen.

LIVE_LOCKED stannar true. Paper är default. Ingen mäklare. Inga påhittade kronor, kurser eller saldo.

ROBOT, AIIND och GULDR är skilda tillgångar hos Rider. Sele blandar inte ihop dem. Symboler skriver piloten.

## Form

| Fält | Typ | Tom cell |
| --- | --- | --- |
| `name` | sträng | saknas |
| `clientFilter.brand` | sträng (tenant, inte hårdkodad KS) | saknas |
| `clientFilter.assigned` | sträng (tenant) | saknas |
| `clientFilter.tenantId` | sträng från `tenant.json` | saknas |
| `volumePct` | tal, t.ex. 1 | saknas |
| `side` | `köp` / `sälj` | default `köp` |
| `symbols` | lista, en eller flera | saknas |
| `slPct` | tal | saknas → `saknar_sl_tp` |
| `tpPct` | tal | saknas → `saknar_sl_tp` |
| `skipIfSymbolOpen` | bool | default true |
| `paper` | alltid true | — |

Exempel på filter, inte data i git: brand North Investment + assigned Daniel. Ny tenant fyller egna namn i `tenant.json` (`sele.brands`, `sele.assignees`). Kund-PII hör inte hemma här.

## Regler

1. SL och TP krävs. Saknas något av dem = `saknar_sl_tp`, `ok` är false.
2. Volym sätter piloten (`volumePct`). Älva/robot ärver, `applyVolume` klipper mot pilotens % och höjer aldrig.
3. `applyVolume(balance, volumePct)` räknar bara när anroparen skickar saldo. Tom balance gissas inte. Tom cell = saknas, inte 0 kr.
4. `skipIfSymbolOpen`: om symbolen redan är öppen hoppas den över. Om öppen-status saknas påstås den inte.
5. Ingen live-order. Ingen ForceX-hämtning från webbläsarappen. Ingen master/slave-ord — kommando / stab / älvor.

## Motor

`src/sele.js` — rena funktioner. `src/sele-ui.js` — formulär i Artificer-panelen (`#/sele`). Samma motor för varje tenant.
