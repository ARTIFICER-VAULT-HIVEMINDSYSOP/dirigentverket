import {
  formatPx,
  TILLGANGAR,
  hasRideTemplate,
  coreIncomplete,
  firstEmptyCoreName,
  leverageSpeed,
  coastPeriodMs,
  rideRails,
  rideImpulse,
  RIDER_IMPULSE_NOTE,
  RIDER_SMA_NOTE,
  RIDER_SMA_UNLOCK_NOTE,
  playRails,
  dryRunSlotTop,
  HOP_WINDOW_MS,
  HEDGE_FADE_MS,
} from './rider.js';
import { escapeHtml, emptyFigure } from './format.js';
import { emptyHudState, magazineView } from './contact-queue.js';
import { renderMagazineHud } from './magazine-hud.js';

export function riderVal(draft, name) {
  const v = draft[name];
  return v === undefined || v === null ? '' : escapeHtml(String(v));
}

function arenaScale(nums) {
  const vals = nums.filter((n) => Number.isFinite(n));
  if (!vals.length) return { y: () => 50 };
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min;
  const pad = span > 0 ? span * 0.18 : Math.max(Math.abs(min) * 0.02, 1);
  const lo = min - pad;
  const hi = max + pad;
  const range = hi - lo || 1;
  return {
    y(v) {
      return ((hi - v) / range) * 100;
    },
  };
}

function renderScanlines() {
  return `<div class="rider-scanlines" aria-hidden="true"></div>`;
}

function renderFreqPips(hedge) {
  if (!hedge) return '';
  const saknas = Boolean(hedge.saknas);
  const pip = Boolean(hedge.freqPip);
  const count = pip && hedge.count != null ? hedge.count : null;
  const lit = count != null ? Math.min(5, Math.max(0, count)) : 0;
  const pips = [0, 1, 2, 3, 4]
    .map((i) => `<span class="rider-sil-freq-pip${i < lit ? ' is-on' : ''}" data-freq-pip-i="${i}"></span>`)
    .join('');
  const countAttr = count != null ? ` data-freq-count="${count}"` : '';
  return `<div class="rider-sil-freq" data-rider-freq data-freq-pip="${pip ? '1' : '0'}" data-freq-saknas="${saknas ? '1' : '0'}"${countAttr}>
        ${pips}
        ${saknas ? '<span class="rider-sil-freq-empty">saknas</span>' : ''}
      </div>`;
}

function renderBitHud(lev, speed, railText, rails = [], play = {}, hopped = false, trailed = false, rokad = null, hedge = null) {
  const rail = play.rail || 0;
  const sit = play.sit ?? rail;
  const rokadOn = Boolean(rokad && rokad.tell);
  const hedgeOn = Boolean(hedge && hedge.tell);
  const fromSide = rokad?.from || play.side || 'köp';
  const toSide = rokadOn ? rokad.to : fromSide;
  const mode = hopped ? 'hop' : trailed ? 'trail' : rokadOn ? 'rokad' : hedgeOn ? 'hedge' : 'hold';
  const levBars = [1, 2, 3, 4]
    .map((n) => `<span class="rider-sil-bar${n <= lev ? ' is-on' : ''}" data-lev-bar="${n}"></span>`)
    .join('');
  const railPips = rails.length
    ? rails
        .map(
          (_, i) =>
            `<span class="rider-sil-rail-pip${i === rail ? ' is-rail' : ''}${i === sit ? ' is-sit' : ''}" data-rail-sil="${i}"></span>`,
        )
        .join('')
    : '<span class="rider-sil-rail-pip is-empty" data-rail-sil="-1"></span>';
  return `<div class="rider-play-hud rider-bit-hud" data-rider-sil data-verbs="w s f [ ] space">
      <div class="rider-sil-mode" data-rider-mode-sil data-mode="${mode}" data-hop-tell="${hopped ? '1' : '0'}" data-trail-tell="${trailed ? '1' : '0'}" data-rokad-tell="${rokadOn ? '1' : '0'}" data-hedge-tell="${hedgeOn ? '1' : '0'}">
        <span class="rider-sil-pip is-paper" data-mode-paper></span>
        <span class="rider-sil-pip ${hopped ? 'is-hop is-tell' : trailed ? 'is-trail is-tell' : rokadOn ? 'is-rokad is-tell' : hedgeOn ? 'is-hedge is-tell' : 'is-hold'}" data-hop-sil></span>
        ${hopped ? '<span class="rider-sil-tell" data-rider-hop-tell>tell</span>' : ''}
        ${trailed ? '<span class="rider-sil-tell" data-rider-trail-tell>tell</span>' : ''}
        ${rokadOn ? '<span class="rider-sil-tell" data-rider-rokad-tell>tell</span>' : ''}
        ${hedgeOn ? '<span class="rider-sil-tell" data-rider-hedge-tell>tell</span>' : ''}
        ${renderFreqPips(hedge)}
      </div>
      ${
        play.side || rokad
          ? `<div class="rider-sil-side" data-rider-side-sil data-side="${escapeHtml(fromSide)}" data-rokad-from="${escapeHtml(fromSide)}" data-rokad-to="${escapeHtml(toSide)}">
        <span class="rider-sil-side-pip is-from" data-side-from="${escapeHtml(fromSide)}"></span>
        ${rokadOn ? '<span class="rider-sil-side-arrow" aria-hidden="true">→</span>' : ''}
        <span class="rider-sil-side-pip is-to${rokadOn ? ' is-rokad' : ''}" data-side-to="${escapeHtml(toSide)}"></span>
      </div>`
          : ''
      }
      <div class="rider-sil-lev" data-rider-lev-sil data-lev="${lev}">
        ${levBars}
        <strong data-rider-leverage-hud>${lev}×</strong>
        <strong data-rider-speed-hud>${speed}×</strong>
      </div>
      <div class="rider-sil-rail" data-rider-rail-sil>
        ${railPips}
        <strong data-rider-rail-hud>${railText}</strong>
      </div>
    </div>`;
}

export function renderPlayArena(ride, play = {}) {
  if (!ride || !ride.ok) {
    const lev = play.leverage || 1;
    const speed = leverageSpeed(lev);
    const lens = play.lens || 1;
    const rails = playRails(ride);
    const rail = Math.min(rails.length - 1, Math.max(0, play.rail || 0));
    const sit = Math.min(rails.length - 1, Math.max(0, play.sit ?? rail));
    const sitTop = dryRunSlotTop(sit);
    const dryMarks = rails
      .map((_, i) => {
        const top = dryRunSlotTop(i);
        const cls = [
          'rider-mark',
          'rider-mark-dry',
          i === rail ? 'is-rail' : '',
          i === sit ? 'is-sit' : '',
        ]
          .filter(Boolean)
          .join(' ');
        return `<div class="${cls}" data-rail-index="${i}" data-top="${top}%" style="top:${top}%">
        <span class="rider-mark-label"></span>
        <span class="rider-mark-line"><span class="rider-mark-pip" aria-hidden="true"></span></span>
        <span class="rider-mark-px"></span>
      </div>`;
      })
      .join('');
    return `<div class="rider-play is-empty rider-bit is-dry-run" data-rider-play data-bit="32" data-dry-run="1" role="status"
      data-freq-pip="${ride?.hedge?.freqPip ? '1' : '0'}" data-freq-saknas="${!ride || !ride.hedge || ride.hedge.saknas ? '1' : '0'}" data-hedge-ghost="0" data-hedge-band="0" data-hedge-mid-pip="0" data-hedge-fade="0"
      data-leverage="${lev}" data-speed="${speed}" data-lens="${lens}" data-rail="${rail}" data-sit="${sit}"
      style="--rider-speed:${speed};--rider-lens:${lens};--rider-coast-ms:${coastPeriodMs(lev)}ms;">
      ${renderScanlines()}
      ${renderBitHud(lev, speed, '', rails, { ...play, rail, sit }, false, false, null, ride?.hedge)}
      <div class="rider-arena-field" data-rider-field style="transform:scale(var(--rider-lens));transform-origin:center;">
        <div class="rider-speed-scan" aria-hidden="true"></div>
        ${dryMarks}
        <div class="rider-dot is-hold" data-rider-dot style="top:${sitTop}%;"></div>
      </div>
      <div class="rider-coach" data-rider-coach>Process före fart. Prova räls och lins — sedan Räkna.</div>
      <p class="rider-play-empty">Fyll pilotvolym · entry · max-fel · RR · grav — sedan Räkna. Paper. Inte live.</p>
    </div>`;
  }

  const rails = rideRails(ride);
  const lev = play.leverage || ride.havstang || 1;
  const speed = leverageSpeed(lev);
  const lens = play.lens || 1;
  const rail = play.rail || 0;
  const sit = play.sit ?? rail;
  const fade = play.hedgeFade && play.hedgeFade.fading ? play.hedgeFade : null;
  const fadeGhosts = fade ? fade.ghosts || [] : [];
  const prices = [
    ride.tp,
    ride.sl,
    ride.grav,
    ride.coast,
    ...(ride.horizon?.prices || []),
    ride.jump?.jumped ? ride.jump.from : null,
    ride.jump?.jumped ? ride.jump.to : null,
    ...((ride.hedge && ride.hedge.ghosts) || []).map((g) => g.at),
    ...fadeGhosts.map((g) => g.at),
  ].filter((n) => n !== null && n !== undefined);
  const scale = arenaScale(prices);

  const marks = [];
  marks.push({ kind: 'tp', at: ride.tp, label: 'TP' });
  (ride.horizon || []).forEach((line, i) => {
    marks.push({ kind: 'trend', at: line.at, label: line.band === 'grav' ? 'grav' : 'paper-trendlinje', rail: rails.indexOf(line.at), i });
  });
  marks.push({ kind: 'grav', at: ride.grav, label: 'grav' });
  if (ride.coast !== null && ride.coast !== undefined) {
    marks.push({ kind: 'coast', at: ride.coast, label: 'coast' });
  }
  if (ride.jump && ride.jump.jumped) {
    marks.push({ kind: 'from', at: ride.jump.from, label: 'från' });
    marks.push({ kind: 'to', at: ride.jump.to, label: 'till' });
  }
  if (ride.hedge && ride.hedge.proposed && Array.isArray(ride.hedge.ghosts)) {
    for (const g of ride.hedge.ghosts) {
      if (g && g.at != null) {
        marks.push({
          kind: `hedge-${g.kind}`,
          at: g.at,
          label: g.kind === 'mid' ? 'mitt' : g.kind,
          hedgeRail: g.kind === 'nedre' || g.kind === 'övre' ? g.kind : null,
          hedgeMidPip: g.kind === 'mid',
        });
      }
    }
  } else if (fade && fadeGhosts.length) {
    for (const g of fadeGhosts) {
      if (g && g.at != null) {
        marks.push({
          kind: `hedge-${g.kind}`,
          at: g.at,
          label: g.kind === 'mid' ? 'mitt' : g.kind,
          hedgeRail: g.kind === 'nedre' || g.kind === 'övre' ? g.kind : null,
          hedgeMidPip: g.kind === 'mid',
          hedgeFade: true,
        });
      }
    }
  }
  marks.push({ kind: 'sl', at: ride.sl, label: 'SL' });

  const markHtml = marks
    .map((row) => {
      const top = scale.y(row.at);
      const railIndex = rails.indexOf(row.at);
      const railAttr = railIndex >= 0 ? `data-rail-index="${railIndex}" data-rail-price="${row.at}"` : '';
      const hedgeRailAttr = row.hedgeRail ? ` data-hedge-rail="${escapeHtml(row.hedgeRail)}"` : '';
      const hedgeMidAttr = row.hedgeMidPip ? ' data-hedge-mid-pip="1"' : '';
      const hedgeFadeAttr = row.hedgeFade ? ' data-hedge-fade="1"' : '';
      const cls = [
        'rider-mark',
        `rider-mark-${row.kind}`,
        railIndex === rail ? 'is-rail' : '',
        railIndex === sit ? 'is-sit' : '',
        row.hedgeRail ? 'is-hedge-rail' : '',
        row.hedgeMidPip ? 'is-hedge-mid-pip' : '',
        row.hedgeFade ? 'is-hedge-fade' : '',
      ]
        .filter(Boolean)
        .join(' ');
      return `<div class="${cls}" ${railAttr}${hedgeRailAttr}${hedgeMidAttr}${hedgeFadeAttr} data-top="${top}%" style="top:${top}%">
        <span class="rider-mark-label">${escapeHtml(row.label)}</span>
        <span class="rider-mark-line">${
          row.hedgeRail
            ? '<span class="rider-hedge-rail" aria-hidden="true"></span>'
            : row.hedgeMidPip
              ? '<span class="rider-hedge-mid-pip" aria-hidden="true"></span>'
              : '<span class="rider-mark-pip" aria-hidden="true"></span>'
        }</span>
        <span class="rider-mark-px">${escapeHtml(formatPx(row.at))}</span>
      </div>`;
    })
    .join('');

  const jumped = Boolean(ride.jump && ride.jump.jumped);
  const tell = Boolean(ride.jump && ride.jump.tell);
  const trailed = Boolean(ride.trail && ride.trail.tell);
  const rokadOn = Boolean(ride.rokad && ride.rokad.tell);
  const hedgeOn = Boolean(ride.hedge && ride.hedge.tell);
  const rokadVol =
    rokadOn && ride.rokad.nyVolym !== null && ride.rokad.nyVolym !== undefined
      ? escapeHtml(formatPx(ride.rokad.nyVolym))
      : '';
  const hop = jumped
    ? `<div class="rider-hop is-jump rider-hop-tell" data-hop="1" data-hop-tell="1" data-window="${HOP_WINDOW_MS}" role="status">
        <span class="rider-hop-kicker">Hopp</span>
        <span class="rider-hop-tell-mark" data-rider-hop-tell>tell</span>
        <span class="rider-hop-path">${escapeHtml(formatPx(ride.jump.from))} → ${escapeHtml(formatPx(ride.jump.to))}</span>
        <span class="faint">process före fart · ${HOP_WINDOW_MS / 1000}s</span>
      </div>`
    : `<div class="rider-hop is-hold" data-hop="0" data-hop-tell="0">
        <span class="rider-hop-kicker">Håll</span>
        <span class="rider-hop-path">ingen hopp — sitta på grav</span>
      </div>`;
  const trail = trailed
    ? `<div class="rider-trail rider-hop-tell is-trail" data-trail="1" data-trail-tell="1" role="status">
        <span class="rider-hop-kicker">Trail</span>
        <span class="rider-hop-tell-mark" data-rider-trail-tell>tell</span>
        <span class="rider-hop-path">${escapeHtml(formatPx(ride.trail.from))} → ${escapeHtml(formatPx(ride.trail.to))}</span>
        <span class="faint">process före fart · SL krymper</span>
      </div>`
    : '';
  const rokad = rokadOn
    ? `<div class="rider-rokad rider-hop-tell is-rokad" data-rokad="1" data-rokad-tell="1" data-rokad-gate="1" role="status">
        <span class="rider-hop-kicker">Rokad</span>
        <span class="rider-hop-tell-mark" data-rider-rokad-tell>tell</span>
        <span class="rider-hop-path">${escapeHtml(ride.rokad.from)} → ${escapeHtml(ride.rokad.to)}</span>
        <span class="faint">process före fart · volym −25 %${rokadVol ? ` · ${rokadVol}` : ''} · ÖB godkänner</span>
      </div>
      <p class="rider-rokad-gate faint" data-rokad-gate="1">${escapeHtml(ride.rokad.gate)}</p>`
    : '';
  const hedge = hedgeOn
    ? `<div class="rider-hedge rider-hop-tell is-hedge" data-hedge="1" data-hedge-tell="1" role="status">
        <span class="rider-hop-kicker">Mitt-hedge</span>
        <span class="rider-hop-tell-mark" data-rider-hedge-tell>tell</span>
        <span class="rider-hop-path">köp + sälj${ride.hedge.entry != null ? ` · mitt ${escapeHtml(formatPx(ride.hedge.entry))}` : ''}</span>
        <span class="faint">process före fart · ingen order</span>
      </div>`
    : '';

  const sitPrice = rails[sit] ?? ride.grav;
  const toPrice = jumped ? ride.jump.to : sitPrice;
  const sitTop = scale.y(sitPrice);
  const toTop = scale.y(toPrice);
  const coastMuted = ride.coast === null || ride.coast === undefined;

  const coastMs = coastPeriodMs(lev);
  const railText = rails[rail] != null ? escapeHtml(String(rails[rail])) : '';
  const ghostOn = Boolean(hedgeOn && ride.hedge.ghosts && ride.hedge.ghosts.length);
  const bandOn = Boolean(hedgeOn && ride.hedge.bandRails && ride.hedge.bandRails.length);
  const midPipOn = Boolean(hedgeOn && ride.hedge.midPip && ride.hedge.midPip.at != null);
  const fadeOn = Boolean(fade && fadeGhosts.length);
  const fadeMs = fade && fade.ms != null ? fade.ms : HEDGE_FADE_MS;
  return `<div class="rider-play rider-bit is-looking ${jumped ? 'has-hop' : 'has-hold'}${trailed ? ' has-trail' : ''}${rokadOn ? ' has-rokad' : ''}${hedgeOn ? ' has-hedge' : ''}${fadeOn ? ' has-hedge-fade' : ''}" data-rider-play data-bit="32" data-look="1"
      data-hop-tell="${tell ? '1' : '0'}" data-trail-tell="${trailed ? '1' : '0'}" data-rokad-tell="${rokadOn ? '1' : '0'}" data-hedge-tell="${hedgeOn ? '1' : '0'}" data-freq-pip="${ride.hedge && ride.hedge.freqPip ? '1' : '0'}" data-freq-saknas="${ride.hedge && ride.hedge.saknas ? '1' : '0'}" data-hedge-ghost="${ghostOn ? '1' : '0'}" data-hedge-band="${bandOn ? '1' : '0'}" data-hedge-mid-pip="${midPipOn ? '1' : '0'}" data-hedge-fade="${fadeOn ? '1' : '0'}"
      data-side="${escapeHtml(ride.input?.side || 'köp')}" data-rokad-from="${escapeHtml(ride.rokad?.from || ride.input?.side || 'köp')}" data-rokad-to="${escapeHtml(ride.rokad?.to || ride.input?.side || 'köp')}"
      data-leverage="${lev}" data-speed="${speed}" data-lens="${lens}" data-rail="${rail}" data-sit="${sit}"
      style="--rider-speed:${speed};--rider-lens:${lens};--rider-coast-ms:${coastMs}ms;--hop-window:${HOP_WINDOW_MS}ms;--hedge-fade-ms:${fadeMs}ms;"
      role="img" aria-label="Paper-arena">
    ${renderScanlines()}
    ${renderBitHud(lev, speed, railText, rails, { ...play, side: ride.input?.side }, jumped, trailed, ride.rokad, ride.hedge)}
    <div class="rider-arena-field" data-rider-field style="transform:scale(var(--rider-lens));transform-origin:center;">
      <div class="rider-speed-scan" aria-hidden="true"></div>
      ${markHtml}
      <div class="rider-dot ${jumped ? 'is-jump' : 'is-hold'}" data-rider-dot style="--from:${sitTop}%;--to:${toTop}%;top:${sitTop}%;"></div>
    </div>
    ${hop}
    ${trail}
    ${rokad}
    ${hedge}
    <p class="faint rider-muted-opt">${coastMuted ? 'coast tyst' : ''} · hävstång HUD = fart · max 4×</p>
  </div>`;
}

function smaHintHtml(unlocked, fresh = false) {
  if (!unlocked) return '';
  const note = fresh ? RIDER_SMA_UNLOCK_NOTE : RIDER_SMA_NOTE;
  return `<p class="rider-sma${fresh ? ' is-unlock' : ''}" data-sma-belopp="1" data-sma-unlock="${fresh ? '1' : '0'}" role="status">
    <span class="rider-sma-pip" aria-hidden="true"></span>
    ${escapeHtml(note)}
  </p>`;
}

export function renderRideResult(ride, play = {}, opts = {}) {
  if (!ride) {
    return `${renderPlayArena(ride, play)}
      <p class="muted">Minst: tillgång, pilotvolym, entry, max-fel, RR. Grav ger arenan. Resten under Avancerat.</p>`;
  }
  if (!ride.ok) {
    return `${renderPlayArena(ride, play)}
      <div class="info-banner">saknar_sl_tp — fyll entry, maxFel och RR innan SL/TP kan räknas.</div>`;
  }

  const volCell =
    ride.pilotVolume !== null && ride.pilotVolume !== undefined
      ? `<div class="metric-value">${escapeHtml(formatPx(ride.pilotVolume))}</div>`
      : emptyFigure('tom');
  const coastCell =
    ride.coast !== null && ride.coast !== undefined
      ? `<div class="metric-value">${escapeHtml(formatPx(ride.coast))}</div>`
      : emptyFigure('tom');
  const hopNote = ride.jump.jumped
    ? `${formatPx(ride.jump.from)} → ${formatPx(ride.jump.to)}`
    : 'håll';
  const horizonList = (ride.horizon || [])
    .map((line) => `<li>${escapeHtml(line.kind)} ${escapeHtml(formatPx(line.at))}</li>`)
    .join('');
  const horizonLabel = ride.horizon?.label || '';

  return `
    ${renderPlayArena(ride, play)}
    ${smaHintHtml(opts.smallAmountUnlocked, opts.justUnlocked === true)}
    <h3 class="section-title">Paper-plan</h3>
    <div class="kalkyl-live">
      <div class="card"><div class="metric-label">SL</div><div class="metric-value">${escapeHtml(formatPx(ride.sl))}</div><div class="faint">entry ± maxFel</div></div>
      <div class="card"><div class="metric-label">TP</div><div class="metric-value">${escapeHtml(formatPx(ride.tp))}</div><div class="faint">maxFel × RR ${escapeHtml(formatPx(ride.rr))}</div></div>
      <div class="card"><div class="metric-label">Grav</div><div class="metric-value">${escapeHtml(formatPx(ride.grav))}</div><div class="faint">${ride.input.grav === null ? 'tom ruta → entry' : 'ifylld'}</div></div>
      <div class="card"><div class="metric-label">Pilotvolym</div>${volCell}<div class="faint">piloten sätter · robot höjer aldrig</div></div>
      <div class="card"><div class="metric-label">Coast</div>${coastCell}<div class="faint">valfri — tom är ärlig</div></div>
    </div>
    <div class="rider-horizon-card">
      <div class="metric-label">Horisont</div>
      <ul class="rider-horizon-list">${horizonList}</ul>
      <p class="faint">${escapeHtml(horizonLabel)}</p>
    </div>
    <p class="muted">Hopp: ${escapeHtml(hopNote)}. RSI/BB: ${ride.structure.known ? 'ifylld' : 'inte ifylld, inte påhittad'}.</p>
  `;
}

export function renderRider(draft, ride, hopPulse = 0, play = {}, opts = {}) {
  const tillgang = draft.tillgang || 'ROBOT';
  const options = TILLGANGAR.map(
    (t) => `<option value="${t}" ${tillgang === t ? 'selected' : ''}>${t}</option>`,
  ).join('');
  const hasTpl = typeof localStorage !== 'undefined' && hasRideTemplate(tillgang);
  const incomplete = coreIncomplete(draft);
  const firstHint = opts.firstHint || '';
  const liveLocked = opts.liveLocked !== false;
  const completed = opts.hasCompletedFirstRide === true;
  const justUnlocked = opts.justUnlocked === true;
  const impulse = opts.impulse || rideImpulse(draft, play, { hasCompletedFirstRide: completed });

  return `
    <section class="rider-stage ${impulse.visible ? 'has-impulse' : ''}${justUnlocked ? ' has-sma-unlock' : ''}" data-hop-pulse="${hopPulse}" data-impulse="${impulse.visible ? '1' : '0'}" data-first-ride="${completed ? '1' : '0'}" data-sma-fresh="${justUnlocked ? '1' : '0'}">
      <header class="rider-hero">
        <p class="rider-kicker">Trade Rider · paper</p>
        <h2 class="rider-title">Trade Rider</h2>
        <p class="rider-lead">Första ride i kärnan. Avancerat är igenbommat. Inget lamp-läger.</p>
      </header>
      <div class="rider-badge-paper" role="status">PAPER · live=false · ingen mäklare</div>

      <div class="rider-mode" role="status">
        <span class="rider-mode-paper">paper</span>
        <span class="rider-mode-live" aria-hidden="true">live = false</span>
      </div>
      <p class="banner-rider">Paper. live = false. Inga kurser hämtas. Ingen live-order. SL+TP bara när entry, maxFel och RR är ifyllda.</p>

      <div class="rider-process" data-rider-process>
        <span class="rider-process-kicker">process</span>
        Process före fart. Tomma rutor stannar tomma.
      </div>
      <div class="rider-impulse" data-rider-impulse role="status"${impulse.visible ? '' : ' hidden'}>
        <span class="rider-impulse-pip" aria-hidden="true"></span>
        <span data-rider-impulse-note>${escapeHtml(impulse.note || RIDER_IMPULSE_NOTE)}</span>
      </div>

      <div id="rider-out" class="rider-out">${renderRideResult(ride, play, { smallAmountUnlocked: completed, justUnlocked })}</div>

      <aside class="rider-magasin-extra" aria-label="Magasinet extra">
        ${renderMagazineHud(magazineView([], emptyHudState(), Date.now()), { extra: true })}
        <p class="faint"><a href="/magasin.html">Öppna Magasinet</a> — primär klient/lead-kö.</p>
      </aside>

      <div class="rider-tablet">
        <div class="rider-robban-row">
          <details class="rider-robban" id="rider-robban">
            <summary>Robban</summary>
            <p class="faint">Menyn tar inte W/S/F. Demo stannar paper.</p>
            <button class="btn btn-ghost" type="button" data-action="rider-live-ask" data-rider-no-wsf>Demo → live</button>
            <p class="rider-live-lock">${liveLocked ? 'live låst · paper' : 'paper'}</p>
          </details>
        </div>
        <form id="rider-form">
          <div id="rider-core" class="form-grid">
            <label>Tillgång
              <select name="tillgang">
                ${options}
              </select></label>
            <label>Sida
              <select name="side">
                <option value="köp" ${draft.side !== 'sälj' ? 'selected' : ''}>Köp</option>
                <option value="sälj" ${draft.side === 'sälj' ? 'selected' : ''}>Sälj</option>
              </select></label>
            <label>Pilotvolym
              <input name="pilotVolume" inputmode="decimal" placeholder="piloten sätter" value="${riderVal(draft, 'pilotVolume')}" />
              ${completed ? `<span class="hint" data-sma-belopp="1">små belopp · risken stannar · robot höjer aldrig</span>` : ''}</label>
            <label>Entry
              <input name="entry" inputmode="decimal" placeholder="skriv själv" value="${riderVal(draft, 'entry')}" /></label>
            <label>maxFel
              <input name="maxFel" inputmode="decimal" placeholder="SL-avstånd" value="${riderVal(draft, 'maxFel')}" /></label>
            <label>RR
              <input name="rr" inputmode="decimal" placeholder="t.ex. 2" value="${riderVal(draft, 'rr')}" /></label>
            <label>Grav <span class="hint">ger arenan — tom = entry</span>
              <input name="grav" inputmode="decimal" placeholder="tom = entry" value="${riderVal(draft, 'grav')}" /></label>
          </div>
          ${
            incomplete
              ? `<div class="btn-row">
                  <button class="btn btn-gold" type="button" data-action="rider-first" aria-describedby="rider-first-hint">Första paper-ride</button>
                  <p id="rider-first-hint" class="faint" aria-live="polite">${escapeHtml(firstHint || 'Fokusera kärnan. Tomma rutor fylls inte.')}</p>
                </div>`
              : ''
          }
          <details id="rider-advanced">
            <summary>Avancerat</summary>
            <div class="form-grid">
              <label>Requested
                <input name="requested" inputmode="decimal" value="${riderVal(draft, 'requested')}" /></label>
              <label>Aktuell kurs <span class="hint">skriv själv</span>
                <input name="current" inputmode="decimal" value="${riderVal(draft, 'current')}" /></label>
              <label>RSI
                <input name="rsi" inputmode="decimal" placeholder="tom = ingen hopp" value="${riderVal(draft, 'rsi')}" /></label>
              <label>Bollinger nedre
                <input name="bbLower" inputmode="decimal" value="${riderVal(draft, 'bbLower')}" /></label>
              <label>Bollinger övre
                <input name="bbUpper" inputmode="decimal" value="${riderVal(draft, 'bbUpper')}" /></label>
              <label>Bud studsar mot
                <select name="bounce">
                  <option value="nej" ${draft.bounce !== 'nedre' && draft.bounce !== 'övre' ? 'selected' : ''}>Nej</option>
                  <option value="nedre" ${draft.bounce === 'nedre' ? 'selected' : ''}>Nedre band</option>
                  <option value="övre" ${draft.bounce === 'övre' ? 'selected' : ''}>Övre band</option>
                </select></label>
              <label class="full">Övre paper-trendlinjer
                <input name="ovre" placeholder="tom = grav/entry" value="${riderVal(draft, 'ovre')}" /></label>
              <label class="full">Undre paper-trendlinjer
                <input name="undre" value="${riderVal(draft, 'undre')}" /></label>
              <label>Hävstång 1–4×
                <input name="havstang" inputmode="decimal" placeholder="tom = 1×" value="${riderVal(draft, 'havstang')}" /></label>
              <label>Cluster
                <input name="cluster" value="${riderVal(draft, 'cluster')}" /></label>
              <label>Tempo / lins
                <input name="tempo" placeholder="lins, inte fill" value="${riderVal(draft, 'tempo')}" /></label>
              <label>Prognos <span class="hint">rokad — tom = ingen vändning</span>
                <select name="prognos">
                  <option value="" ${!draft.prognos ? 'selected' : ''}></option>
                  <option value="köp" ${draft.prognos === 'köp' ? 'selected' : ''}>Köp</option>
                  <option value="sälj" ${draft.prognos === 'sälj' ? 'selected' : ''}>Sälj</option>
                  <option value="neutral" ${draft.prognos === 'neutral' ? 'selected' : ''}>Neutral</option>
                </select></label>
              <label>Prognos-RR <span class="hint">krävs för rokad</span>
                <input name="prognosRr" inputmode="decimal" placeholder="tom = ingen rokad" value="${riderVal(draft, 'prognosRr')}" /></label>
              <label>Hålla-RR <span class="hint">valfritt</span>
                <input name="hallaRr" inputmode="decimal" value="${riderVal(draft, 'hallaRr')}" /></label>
              <label class="full">Kursserie <span class="hint">mitt-hedge — en kurs per rad, skriv själv</span>
                <textarea name="priceSeries" rows="3" placeholder="tom = ingen mitt-hedge">${riderVal(draft, 'priceSeries')}</textarea></label>
              <label>Minsta svängfrekvens <span class="hint">valfritt, standard 3</span>
                <input name="minFrequency" inputmode="numeric" placeholder="3" value="${riderVal(draft, 'minFrequency')}" /></label>
              <label>Coast <span class="hint">valfritt</span>
                <input name="coast" inputmode="decimal" placeholder="tom är ärlig" value="${riderVal(draft, 'coast')}" /></label>
            </div>
          </details>
          <div class="btn-row">
            <button class="btn btn-gold" type="submit">Räkna paper-ride</button>
            <button class="btn btn-ghost" type="button" data-action="rider-clear">Rensa</button>
          </div>
          <div class="btn-row rider-tpl-row">
            <button class="btn btn-ghost" type="button" data-action="rider-save-tpl">Spara mall ${escapeHtml(tillgang)}</button>
            <button class="btn btn-ghost" type="button" data-action="rider-load-tpl">Ladda mall ${escapeHtml(tillgang)}</button>
            <span class="faint">${hasTpl ? 'mall finns lokalt' : 'ingen mall än — tomma rutor fylls inte'}</span>
          </div>
        </form>
      </div>
    </section>
  `;
}

export function readRiderForm(form) {
  const fd = new FormData(form);
  return {
    tillgang: String(fd.get('tillgang') || 'ROBOT').trim(),
    side: String(fd.get('side') || 'köp'),
    pilotVolume: String(fd.get('pilotVolume') || ''),
    entry: String(fd.get('entry') || ''),
    maxFel: String(fd.get('maxFel') || ''),
    rr: String(fd.get('rr') || ''),
    grav: String(fd.get('grav') || ''),
    requested: String(fd.get('requested') || ''),
    current: String(fd.get('current') || ''),
    rsi: String(fd.get('rsi') || ''),
    bbLower: String(fd.get('bbLower') || ''),
    bbUpper: String(fd.get('bbUpper') || ''),
    bounce: String(fd.get('bounce') || 'nej'),
    ovre: String(fd.get('ovre') || ''),
    undre: String(fd.get('undre') || ''),
    coast: String(fd.get('coast') || ''),
    havstang: String(fd.get('havstang') || ''),
    cluster: String(fd.get('cluster') || ''),
    tempo: String(fd.get('tempo') || ''),
    prognos: String(fd.get('prognos') || ''),
    prognosRr: String(fd.get('prognosRr') || ''),
    hallaRr: String(fd.get('hallaRr') || ''),
    nastaSasong: String(fd.get('nastaSasong') || ''),
    priceSeries: String(fd.get('priceSeries') || ''),
    minFrequency: String(fd.get('minFrequency') || ''),
  };
}

export function focusRiderCore(draft, root = globalThis.document) {
  if (!root) return null;
  const name = firstEmptyCoreName(draft) || 'pilotVolume';
  const el = root.querySelector(`#rider-core [name="${name}"]`);
  if (el && typeof el.focus === 'function') el.focus();
  const hint = root.querySelector('#rider-first-hint');
  if (hint) hint.textContent = `Kärnan: fyll ${name}. Inga påhittade tal.`;
  return name;
}
