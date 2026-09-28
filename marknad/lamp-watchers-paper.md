# Lamp / WATCHERS · paper-skinn (kväll)

**Status:** paper. `live=false` / `LIVE_LOCKED` tills namngivet ja. Inga påhittade kronor, kurser eller P&L.

**Fönster:** kvällstid per ÖB 9 sep 2026. Inte dagtid R&D.

**Synk 15 sep kväll:** merge `origin/main` (`82b8e8e`, PR #8 mergad). `LIVE_LOCKED` kvar. Draft. Ingen merge.

**Synk 16 sep ~17:55 Sthlm:** merge `origin/main` (`35b3367`). Konflikt i rider-kansla-status: mitt-hedge/rokad från main behållen. `LIVE_LOCKED` kvar. Draft. Ingen merge.

**Synk 18 sep kväll ~18:05 Sthlm:** merge `origin/main` (`7ef2db6`, rider-kansla + escrow-utbildning). Konflikt i rider-kansla-status löst: mitt-hedge/rokad från main behållen, lamp/WATCHERS-pekare kvar. `LIVE_LOCKED`/`paperLock`/`live=false` kvar. Draft stannar draft. Merge väntar namngivet ÖB-ja. Ingen merge.

**Synk 21 sep kväll ~18:20 Europe/Sofia:** merge `origin/main` (`956ec03`, PR #19 publik funktionskatalog). Inga konflikter — katalogfilerna är nya. `LIVE_LOCKED`/`paperLock`/`live=false` kvar. Lamp/WATCHERS paper-skinn oförändrat. Draft stannar draft. Merge väntar namngivet ÖB-ja. Ingen merge.

**Synk 22 sep kväll ~18:10 Europe/Sofia:** `origin/main` tip `956ec03` (`956ec03052e53633822c70e01dccf5039ce1e028`, PR #19). Redan ancestor sedan synken 21 sep. `git merge origin/main` → Already up to date. Inget nytt från main. Inga konflikter. `LIVE_LOCKED`/`paperLock`/`live=false` kvar. Rider mitt-hedge/rokad från main orörd. Lamp/WATCHERS paper-skinn oförändrat. `node --test src/*.test.mjs` 147/147 pass, 0 fail. Mergeable `CLEAN`. Draft stannar draft. Merge väntar namngivet ÖB-ja. Ingen merge.

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
