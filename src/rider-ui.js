import { formatPx, TILLGANGAR, hasRideTemplate } from './rider.js';
import { escapeHtml, emptyFigure } from './format.js';

export function riderVal(draft, name) {
  const v = draft[name];
  return v === undefined || v === null ? '' : escapeHtml(String(v));
}

function arenaLevels(ride) {
  if (!ride || !ride.ok) return [];
  const rows = [];
  const push = (kind, at, label) => {
    if (at === null || at === undefined) return;
    rows.push({ kind, at, label });
  };
  push('tp', ride.tp, 'TP');
  for (const line of ride.horizon || []) {
    push('trend', line.at, 'paper-trendlinje');
  }
  push('grav', ride.grav, 'grav');
  push('coast', ride.coast, 'coast');
  if (ride.jump && ride.jump.jumped) {
    push('from', ride.jump.from, 'från');
    push('to', ride.jump.to, 'till');
  }
  push('sl', ride.sl, 'SL');
  return rows;
}

function arenaScale(rows) {
  const nums = rows.map((r) => r.at).filter((n) => Number.isFinite(n));
  if (!nums.length) return { y: () => 50, lo: 0, hi: 1 };
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min;
  const pad = span > 0 ? span * 0.18 : Math.max(Math.abs(min) * 0.02, 1);
  const lo = min - pad;
  const hi = max + pad;
  const range = hi - lo || 1;
  return {
    lo,
    hi,
    y(v) {
      return ((hi - v) / range) * 100;
    },
  };
}

function renderArena(ride) {
  if (!ride) {
    return `<div class="rider-arena rider-arena-idle" role="img" aria-label="Tom arena">
      <p class="rider-arena-hint">Första ride: fyll entry, maxFel och RR. Grav och övre är valfria.</p>
    </div>`;
  }
  if (!ride.ok) {
    return `<div class="rider-arena rider-arena-block" role="status">
      <p class="rider-arena-hint">saknar_sl_tp — arena väntar på entry, maxFel och RR.</p>
    </div>`;
  }

  const rows = arenaLevels(ride);
  const scale = arenaScale(rows);
  const marks = rows
    .map((row) => {
      const top = scale.y(row.at);
      return `<div class="rider-mark rider-mark-${escapeHtml(row.kind)}" style="top:${top}%">
        <span class="rider-mark-label">${escapeHtml(row.label)}</span>
        <span class="rider-mark-line"></span>
        <span class="rider-mark-px">${escapeHtml(formatPx(row.at))}</span>
      </div>`;
    })
    .join('');

  const jumped = Boolean(ride.jump && ride.jump.jumped);
  const hop = jumped
    ? `<div class="rider-hop is-jump" data-hop="1">
        <span class="rider-hop-kicker">Hopp</span>
        <span class="rider-hop-path">${escapeHtml(formatPx(ride.jump.from))} → ${escapeHtml(formatPx(ride.jump.to))}</span>
      </div>`
    : `<div class="rider-hop is-hold" data-hop="0">
        <span class="rider-hop-kicker">Håll</span>
        <span class="rider-hop-path">ingen hopp — sitta på grav</span>
      </div>`;

  const sitTop = scale.y(ride.grav);
  const toTop = jumped ? scale.y(ride.jump.to) : sitTop;

  return `<div class="rider-arena ${jumped ? 'has-hop' : 'has-hold'}" role="img" aria-label="Paper-arena">
    <div class="rider-arena-field">
      ${marks}
      <div class="rider-dot ${jumped ? 'is-jump' : 'is-hold'}" style="--from:${sitTop}%;--to:${toTop}%;"></div>
    </div>
    ${hop}
  </div>`;
}

export function renderRideResult(ride) {
  if (!ride) {
    return `<p class="muted">Paper-ride. Skriv entry, maxFel och RR. Kurser hämtas inte. RSI/BB krävs inte.</p>`;
  }
  if (!ride.ok) {
    return `<div class="info-banner">saknar_sl_tp — fyll entry, maxFel och RR innan SL/TP kan räknas.</div>
      ${renderArena(ride)}`;
  }

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

  return `
    ${renderArena(ride)}
    <h3 class="section-title">Paper-plan</h3>
    <div class="kalkyl-live">
      <div class="card"><div class="metric-label">SL</div><div class="metric-value">${escapeHtml(formatPx(ride.sl))}</div><div class="faint">entry ± maxFel</div></div>
      <div class="card"><div class="metric-label">TP</div><div class="metric-value">${escapeHtml(formatPx(ride.tp))}</div><div class="faint">maxFel × RR ${escapeHtml(formatPx(ride.rr))}</div></div>
      <div class="card"><div class="metric-label">Grav</div><div class="metric-value">${escapeHtml(formatPx(ride.grav))}</div><div class="faint">${ride.input.grav === null ? 'tom ruta → entry' : 'ifylld'}</div></div>
      <div class="card"><div class="metric-label">Coast</div>${coastCell}<div class="faint">valfri — tom är ärlig</div></div>
    </div>
    <div class="rider-horizon-card">
      <div class="metric-label">Horisont</div>
      <ul class="rider-horizon-list">${horizonList}</ul>
      <p class="faint">${ride.input.ovre.length ? 'ifyllda övre-linjer' : 'övre tom → entry som enda paper-trendlinje'}</p>
    </div>
    <p class="muted">Hopp: ${escapeHtml(hopNote)}. Struktur RSI/BB: inte ifylld, inte påhittad.</p>
  `;
}

export function renderRider(draft, ride, hopPulse = 0) {
  const tillgang = draft.tillgang || 'ROBOT';
  const options = TILLGANGAR.map(
    (t) => `<option value="${t}" ${tillgang === t ? 'selected' : ''}>${t}</option>`,
  ).join('');
  const hasTpl = typeof localStorage !== 'undefined' && hasRideTemplate(tillgang);

  return `
    <section class="rider-stage" data-hop-pulse="${hopPulse}">
      <header class="rider-hero">
        <p class="rider-kicker">Trade Rider · paper</p>
        <h2 class="rider-title">Trade Rider</h2>
        <p class="rider-lead">Första ride med tre rutor. Grav, övre och coast är valfria. Inget lamp-läger.</p>
      </header>

      <div class="rider-mode" role="status">
        <span class="rider-mode-paper">paper</span>
        <span class="rider-mode-live" aria-hidden="true">live = false</span>
      </div>
      <p class="banner-rider">Paper. live = false. Inga kurser hämtas. Ingen live-order. SL+TP bara när entry, maxFel och RR är ifyllda.</p>

      <div class="rider-tablet">
        <form id="rider-form">
          <div class="form-grid">
            <label>Tillgång
              <select name="tillgang">
                ${options}
              </select></label>
            <label>Sida
              <select name="side">
                <option value="köp" ${draft.side !== 'sälj' ? 'selected' : ''}>Köp</option>
                <option value="sälj" ${draft.side === 'sälj' ? 'selected' : ''}>Sälj</option>
              </select></label>
            <label>Entry
              <input name="entry" inputmode="decimal" placeholder="skriv själv" value="${riderVal(draft, 'entry')}" /></label>
            <label>maxFel
              <input name="maxFel" inputmode="decimal" placeholder="SL-avstånd" value="${riderVal(draft, 'maxFel')}" /></label>
            <label>RR
              <input name="rr" inputmode="decimal" placeholder="t.ex. 2" value="${riderVal(draft, 'rr')}" /></label>
            <label>Grav <span class="hint">valfritt — tom = entry</span>
              <input name="grav" inputmode="decimal" placeholder="tom = entry" value="${riderVal(draft, 'grav')}" /></label>
            <label class="full">Övre paper-trendlinjer <span class="hint">valfritt — tom = entry som enda linje</span>
              <input name="ovre" placeholder="t.ex. 102, 104" value="${riderVal(draft, 'ovre')}" /></label>
            <label>Coast <span class="hint">valfritt — får vara tom</span>
              <input name="coast" inputmode="decimal" placeholder="tom är ärlig" value="${riderVal(draft, 'coast')}" /></label>
            <label>Hopp till <span class="hint">valfritt — tom = håll</span>
              <input name="hopp" inputmode="decimal" placeholder="tom = håll" value="${riderVal(draft, 'hopp')}" /></label>
          </div>
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
        <div id="rider-out" class="rider-out">${renderRideResult(ride)}</div>
      </div>
    </section>
  `;
}

export function readRiderForm(form) {
  const fd = new FormData(form);
  return {
    tillgang: String(fd.get('tillgang') || 'ROBOT').trim(),
    side: String(fd.get('side') || 'köp'),
    entry: String(fd.get('entry') || ''),
    maxFel: String(fd.get('maxFel') || ''),
    rr: String(fd.get('rr') || ''),
    grav: String(fd.get('grav') || ''),
    ovre: String(fd.get('ovre') || ''),
    coast: String(fd.get('coast') || ''),
    hopp: String(fd.get('hopp') || ''),
  };
}
