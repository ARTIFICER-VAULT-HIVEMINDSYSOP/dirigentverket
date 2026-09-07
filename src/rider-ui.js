import {
  formatPx,
  TILLGANGAR,
  hasRideTemplate,
  coreIncomplete,
  firstEmptyCoreName,
  leverageSpeed,
  coastPeriodMs,
  rideRails,
  HOP_WINDOW_MS,
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

export function renderPlayArena(ride, play = {}) {
  if (!ride || !ride.ok) {
    return `<div class="rider-play is-empty" data-rider-play role="status">
      <p class="rider-play-empty">Fyll pilotvolym · entry · max-fel · RR · grav — sedan Räkna. Paper. Inte live.</p>
    </div>`;
  }

  const rails = rideRails(ride);
  const lev = play.leverage || ride.havstang || 1;
  const speed = leverageSpeed(lev);
  const lens = play.lens || 1;
  const rail = play.rail || 0;
  const sit = play.sit ?? rail;
  const prices = [
    ride.tp,
    ride.sl,
    ride.grav,
    ride.coast,
    ...(ride.horizon?.prices || []),
    ride.jump?.jumped ? ride.jump.from : null,
    ride.jump?.jumped ? ride.jump.to : null,
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
  marks.push({ kind: 'sl', at: ride.sl, label: 'SL' });

  const markHtml = marks
    .map((row) => {
      const top = scale.y(row.at);
      const railIndex = rails.indexOf(row.at);
      const railAttr = railIndex >= 0 ? `data-rail-index="${railIndex}" data-rail-price="${row.at}"` : '';
      const cls = [
        'rider-mark',
        `rider-mark-${row.kind}`,
        railIndex === rail ? 'is-rail' : '',
        railIndex === sit ? 'is-sit' : '',
      ]
        .filter(Boolean)
        .join(' ');
      return `<div class="${cls}" ${railAttr} data-top="${top}%" style="top:${top}%">
        <span class="rider-mark-label">${escapeHtml(row.label)}</span>
        <span class="rider-mark-line"></span>
        <span class="rider-mark-px">${escapeHtml(formatPx(row.at))}</span>
      </div>`;
    })
    .join('');

  const jumped = Boolean(ride.jump && ride.jump.jumped);
  const hop = jumped
    ? `<div class="rider-hop is-jump rider-hop-tell" data-hop="1" data-window="${HOP_WINDOW_MS}">
        <span class="rider-hop-kicker">Hopp</span>
        <span class="rider-hop-path">${escapeHtml(formatPx(ride.jump.from))} → ${escapeHtml(formatPx(ride.jump.to))}</span>
        <span class="faint">band+studs · ${HOP_WINDOW_MS / 1000}s</span>
      </div>`
    : `<div class="rider-hop is-hold" data-hop="0">
        <span class="rider-hop-kicker">Håll</span>
        <span class="rider-hop-path">ingen hopp — sitta på grav</span>
      </div>`;

  const sitPrice = rails[sit] ?? ride.grav;
  const toPrice = jumped ? ride.jump.to : sitPrice;
  const sitTop = scale.y(sitPrice);
  const toTop = scale.y(toPrice);
  const coastMuted = ride.coast === null || ride.coast === undefined;

  const coastMs = coastPeriodMs(lev);
  return `<div class="rider-play ${jumped ? 'has-hop' : 'has-hold'}" data-rider-play
      data-leverage="${lev}" data-speed="${speed}" data-lens="${lens}" data-rail="${rail}" data-sit="${sit}"
      style="--rider-speed:${speed};--rider-lens:${lens};--rider-coast-ms:${coastMs}ms;--hop-window:${HOP_WINDOW_MS}ms;"
      role="img" aria-label="Paper-arena">
    <div class="rider-play-hud">
      <span>hävstång <strong data-rider-leverage-hud>${lev}×</strong></span>
      <span>fart <strong data-rider-speed-hud>${speed}×</strong></span>
      <span>räls <strong data-rider-rail-hud>${rails[rail] != null ? escapeHtml(String(rails[rail])) : ''}</strong></span>
      <span class="faint">W/S räls · F fäst · [ ] 1–4× · space lins</span>
    </div>
    <div class="rider-arena-field" data-rider-field style="transform:scale(var(--rider-lens));transform-origin:center;">
      <div class="rider-speed-scan" aria-hidden="true"></div>
      ${markHtml}
      <div class="rider-dot ${jumped ? 'is-jump' : 'is-hold'}" data-rider-dot style="--from:${sitTop}%;--to:${toTop}%;top:${sitTop}%;"></div>
    </div>
    ${hop}
    <p class="faint rider-muted-opt">${coastMuted ? 'coast tyst' : ''} · hävstång HUD = fart · max 4×</p>
  </div>`;
}

export function renderRideResult(ride, play = {}) {
  if (!ride) {
    return `<p class="muted">Minst: tillgång, pilotvolym, entry, max-fel, RR. Grav ger arenan. Resten under Avancerat.</p>
      ${renderPlayArena(ride, play)}`;
  }
  if (!ride.ok) {
    return `<div class="info-banner">saknar_sl_tp — fyll entry, maxFel och RR innan SL/TP kan räknas.</div>
      ${renderPlayArena(ride, play)}`;
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

  return `
    <section class="rider-stage" data-hop-pulse="${hopPulse}">
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
              <input name="pilotVolume" inputmode="decimal" placeholder="piloten sätter" value="${riderVal(draft, 'pilotVolume')}" /></label>
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
        <div id="rider-out" class="rider-out">${renderRideResult(ride, play)}</div>
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
