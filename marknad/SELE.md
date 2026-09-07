# Pilotsele

Paper. Låst av ÖB via stab. Inte live. Inte ForceX.

**Pilotsele** är selen: pilotens volymregel + SL + TP ärvs av **ROBOT-klustret** (ROBOT-TRADER). Robot/älvor höjer aldrig volymen.

AIIND och GULDR är valbara och förblir skilda tillgångar. De är inte ROBOT.

LIVE_LOCKED stannar true. Paper är default. Ingen mäklare. Inga påhittade kronor, kurser eller saldo.

## Form

| Fält | Typ | Tom cell |
| --- | --- | --- |
| `kind` | `pilotsele` | — |
| `name` | sträng | saknas |
| `tillgang` | `ROBOT` / `AIIND` / `GULDR` | default `ROBOT` |
| `cluster` | sträng | default `ROBOT-TRADER` när ROBOT |
| `clientFilter.brand` | sträng (tenant) | saknas |
| `clientFilter.assigned` | sträng (tenant) | saknas |
| `clientFilter.tenantId` | från `tenant.json` | saknas |
| `volumePct` | tal, t.ex. 1 | saknas |
| `side` | `köp` / `sälj` | default `köp` |
| `symbols` | lista, valfritt utöver kluster | saknas |
| `slPct` | tal | saknas → `saknar_sl_tp` |
| `tpPct` | tal | saknas → `saknar_sl_tp` |
| `skipIfSymbolOpen` | bool | default true |
| `paper` | alltid true | — |

Exempel på filter, inte data i git: brand North Investment + assigned Daniel. Ny tenant fyller egna namn i `tenant.json`.

## Regler

1. SL och TP krävs. Saknas något = `saknar_sl_tp`, `ok` false.
2. Volym sätter piloten. `inheritPilotVolume` / `applyVolume`: barn ≤ pilot. Höjer aldrig.
3. `applyVolume(balance, volumePct)` räknar bara när anroparen skickar saldo. Tom balance gissas inte.
4. Ingen live-order. Ingen ForceX-hämtning från webbläsarappen.

Parallell sele för nyheter: `marknad/NYHETSSELE.md`.
