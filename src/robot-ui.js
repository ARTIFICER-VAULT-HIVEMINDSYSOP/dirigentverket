import { computeRobot, formatPx, formatSize } from './robot.js';
import { emptyFigure, escapeHtml } from './format.js';
import { renderKontrollpanel } from './panel-ui.js';

export function val(robotDraft, name) {
  const v = robotDraft[name];
  return v === undefined || v === null ? '' : escapeHtml(String(v));
}

function renderSeasonBanner(season) {
  if (!season) return '';
  const highlight = season.action === 'radda' || season.action === 'byt_hall';
  const title =
    season.action === 'radda'
      ? 'Räddning VIP'
      : season.action === 'byt_hall'
        ? 'Flerår · byt håll'
        : 'Säsongsplan';
  return `
      <div class="season-banner ${highlight ? 'structure-ok' : 'structure-wait'}">
        <div class="metric-label">${escapeHtml(title)}</div>
        <p>${escapeHtml(season.note)}</p>
        ${
          season.rokad
            ? `<p>Ny volym: ${
                season.nyVolym !== null && season.nyVolym !== undefined
                  ? escapeHtml(formatSize(season.nyVolym) || String(season.nyVolym))
                  : 'fyll i volym'
              }</p>`
            : ''
        }
        <p class="faint">Paper. Inte personlig rådgivning. ÖB godkänner.</p>
      </div>`;
}

export function renderRobotResult(robotResult) {
  const r = robotResult;
  if (!r) {
    return `<p class="muted">Fyll i instrument, sida, entry, risk och RR. Kurs hämtas inte — skriv den själv. SL flyttas bara vid RSI+Bollinger+budstuds.</p>`;
  }
  if (!r.ok) {
    return `<div class="info-banner">${r.errors.map((e) => escapeHtml(e)).join(' ')}</div>${renderSeasonBanner(r.season)}`;
  }
  const { initial, dynamic, size, input, structure } = r;
  const sizeBlock =
    size !== null
      ? `<div class="card"><div class="metric-label">Positionsstorlek</div><div class="metric-value">${escapeHtml(formatSize(size))}</div><div class="faint">riskbelopp / SL-avstånd</div></div>`
      : `<div class="card"><div class="metric-label">Positionsstorlek</div>${emptyFigure('fyll i riskbelopp')}<div class="faint">ingen kontostorlek antas</div></div>`;

  const struct = structure || { trail: false, note: 'ingen struktur.' };
  const structureBlock = `
      <div class="structure-banner ${struct.trail ? 'structure-ok' : 'structure-wait'}">
        <div class="metric-label">Struktur</div>
        <p>${escapeHtml(struct.note)}</p>
        <p class="faint">${struct.trail ? 'SL får flyttas.' : 'SL ligger kvar.'}</p>
      </div>`;

  const seasonBlock = renderSeasonBanner(r.season);

  const dyn = dynamic
    ? `
      <h3 class="section-title">Dynamiskt (din ifyllda kurs ${escapeHtml(formatPx(input.current))})</h3>
      <p class="muted">${escapeHtml(dynamic.note)}</p>
      <div class="kalkyl-live">
        <div class="card"><div class="metric-label">Föreslagen SL</div><div class="metric-value">${escapeHtml(formatPx(dynamic.sl))}</div></div>
        <div class="card"><div class="metric-label">Föreslagen TP</div><div class="metric-value">${escapeHtml(formatPx(dynamic.tp))}</div></div>
        <div class="card"><div class="metric-label">Öppen R</div><div class="metric-value">${escapeHtml(formatPx(dynamic.openR))}</div></div>
        <div class="card"><div class="metric-label">Hållet RR</div><div class="metric-value">${dynamic.heldRr !== null && dynamic.heldRr !== undefined ? escapeHtml(formatPx(dynamic.heldRr)) : emptyFigure('—')}</div></div>
      </div>`
    : `<p class="muted">Ange aktuell kurs för att räkna om SL (mot nollpunkt / låst R) och TP. Inga kurser hämtas.</p>`;

  return `
    <h3 class="section-title">Initial plan</h3>
    <div class="kalkyl-live">
      <div class="card"><div class="metric-label">Initial SL</div><div class="metric-value">${escapeHtml(formatPx(initial.sl))}</div><div class="faint">avstånd ${escapeHtml(formatPx(initial.dist))}</div></div>
      <div class="card"><div class="metric-label">Initial TP</div><div class="metric-value">${escapeHtml(formatPx(initial.tp))}</div><div class="faint">TP-avstånd = SL-avstånd × ${escapeHtml(formatPx(initial.rr))}</div></div>
      ${sizeBlock}
    </div>
    ${structureBlock}
    ${seasonBlock}
    ${dyn}
  `;
}

export function renderArtificerShell(inner, parseRoute) {
  const { view } = parseRoute();
  const nav = (href, label, key) =>
    `<a href="${href}" class="${view === key ? 'is-active' : ''}">${label}</a>`;
  return `
    <div class="shell shell-artificer">
      <nav class="nav nav-artificer">
        ${nav('#/portfolj', 'Portfölj', 'portfolj')}
        ${nav('#/kalkyl', 'Kalkyl', 'kalkyl')}
        ${nav('#/synergier', 'Synergier', 'synergier')}
        ${nav('#/nyheter', 'Nyheter', 'nyheter')}
        ${nav('#/robot', 'Artificer AI', 'robot')}
      </nav>
      <main>${inner}</main>
    </div>
  `;
}

export function renderRobot(robotDraft, robotResult) {
  return `
    <section class="artificer-stage">
      <header class="artificer-hero">
        <p class="artificer-kicker">WATCHERS · anden i lampan</p>
        <h2 class="artificer-title">Artificer AI</h2>
        <div class="artificer-ring" aria-hidden="true"></div>
      </header>
      ${renderKontrollpanel()}
      <div class="banner-robot" role="status">Föreslår SL/TP, lägger inga ordrar. Flerårsplan är bara ett förslag. Ingen mäklare, ingen live-exekvering, inga påhittade kurser eller backtest. ÖB godkänner varje drag.</div>
      <div class="stone-tablet">
        <p class="page-lead stone-lead">Modul under Tradingskolan. Skriv instrument och kurser själv. Positionsstorlek räknas bara om du anger riskbelopp i kronor — kontostorlek gissas inte.</p>
        <form id="robot-form">
          <div class="form-grid">
            <label>Instrument
              <input name="instrument" required placeholder="t.ex. OMXS30, EURUSD" value="${val(robotDraft, 'instrument')}" /></label>
            <label>Sida
              <select name="side">
                <option value="köp" ${robotDraft.side !== 'sälj' ? 'selected' : ''}>Köp</option>
                <option value="sälj" ${robotDraft.side === 'sälj' ? 'selected' : ''}>Sälj</option>
              </select></label>
            <label>Entry
              <input name="entry" inputmode="decimal" placeholder="kurs" value="${val(robotDraft, 'entry')}" /></label>
            <label>Riskavstånd
              <input name="risk" inputmode="decimal" placeholder="pris eller %" value="${val(robotDraft, 'risk')}" /></label>
            <label>Risk som
              <select name="riskMode">
                <option value="pris" ${robotDraft.riskMode !== 'procent' ? 'selected' : ''}>Prisavstånd</option>
                <option value="procent" ${robotDraft.riskMode === 'procent' ? 'selected' : ''}>Procent av entry</option>
              </select></label>
            <label>Mål-RR
              <input name="rr" inputmode="decimal" placeholder="1,5 / 2 / 3" value="${val(robotDraft, 'rr')}" /></label>
            <label>ATR <span class="hint">valfritt, används om riskavstånd saknas</span>
              <input name="atr" inputmode="decimal" value="${val(robotDraft, 'atr')}" /></label>
            <label>Aktuell kurs <span class="hint">valfritt, skriv själv — hämtas inte</span>
              <input name="current" inputmode="decimal" value="${val(robotDraft, 'current')}" /></label>
            <label class="full">Riskbelopp, kr <span class="hint">valfritt — utan belopp lämnas storlek tom</span>
              <input name="riskSek" inputmode="decimal" placeholder="fyll i för storlek" value="${val(robotDraft, 'riskSek')}" /></label>
            <label>RSI
              <input name="rsi" inputmode="decimal" placeholder="t.ex. 28" value="${val(robotDraft, 'rsi')}" /></label>
            <label>Bollinger nedre
              <input name="bbLower" inputmode="decimal" value="${val(robotDraft, 'bbLower')}" /></label>
            <label>Bollinger övre
              <input name="bbUpper" inputmode="decimal" value="${val(robotDraft, 'bbUpper')}" /></label>
            <label>Bud studsar mot
              <select name="bounce">
                <option value="nej" ${robotDraft.bounce !== 'nedre' && robotDraft.bounce !== 'övre' ? 'selected' : ''}>Nej</option>
                <option value="nedre" ${robotDraft.bounce === 'nedre' ? 'selected' : ''}>Nedre band</option>
                <option value="övre" ${robotDraft.bounce === 'övre' ? 'selected' : ''}>Övre band</option>
              </select></label>
            <label>Tempo
              <select name="tempo">
                <option value="sasong" ${robotDraft.tempo !== 'snabbare' ? 'selected' : ''}>Säsong</option>
                <option value="snabbare" ${robotDraft.tempo === 'snabbare' ? 'selected' : ''}>Snabbare avkastning</option>
              </select></label>
            <label>Nästa säsong
              <input name="nastaSasong" placeholder="t.ex. 2027" value="${val(robotDraft, 'nastaSasong')}" /></label>
            <label>Prognos nästa säsong
              <select name="prognos">
                <option value="" ${!robotDraft.prognos ? 'selected' : ''}>tom</option>
                <option value="köp" ${robotDraft.prognos === 'köp' ? 'selected' : ''}>köp</option>
                <option value="sälj" ${robotDraft.prognos === 'sälj' ? 'selected' : ''}>sälj</option>
                <option value="neutral" ${robotDraft.prognos === 'neutral' ? 'selected' : ''}>neutral</option>
              </select></label>
            <label>Prognos-RR
              <input name="prognosRr" inputmode="decimal" placeholder="förväntat RR nästa säsong" value="${val(robotDraft, 'prognosRr')}" /></label>
            <label>RR om vi sitter kvar <span class="hint">valfritt</span>
              <input name="hallaRr" inputmode="decimal" placeholder="valfritt" value="${val(robotDraft, 'hallaRr')}" /></label>
            <label>Öppen volym <span class="hint">valfritt — rokad −25 % vid vändning, gissas inte</span>
              <input name="openSize" inputmode="decimal" placeholder="fyll i volym" value="${val(robotDraft, 'openSize')}" /></label>
          </div>
          <div class="btn-row">
            <button class="btn btn-gold" type="submit">Räkna paper-plan</button>
            <button class="btn btn-ghost" type="button" data-action="robot-clear">Rensa</button>
          </div>
        </form>
        <p class="muted stone-lead">SL flyttas bara vid RSI+Bollinger+budstuds.</p>
        <div id="robot-out" class="stone-out">${renderRobotResult(robotResult)}</div>
      </div>
    </section>
  `;
}

export function readRobotForm(form) {
  const fd = new FormData(form);
  return {
    instrument: String(fd.get('instrument') || '').trim(),
    side: String(fd.get('side') || 'köp'),
    entry: String(fd.get('entry') || ''),
    risk: String(fd.get('risk') || ''),
    riskMode: String(fd.get('riskMode') || 'pris'),
    rr: String(fd.get('rr') || ''),
    atr: String(fd.get('atr') || ''),
    current: String(fd.get('current') || ''),
    riskSek: String(fd.get('riskSek') || ''),
    rsi: String(fd.get('rsi') || ''),
    bbLower: String(fd.get('bbLower') || ''),
    bbUpper: String(fd.get('bbUpper') || ''),
    bounce: String(fd.get('bounce') || 'nej'),
    tempo: String(fd.get('tempo') || 'sasong'),
    nastaSasong: String(fd.get('nastaSasong') || ''),
    prognos: String(fd.get('prognos') || ''),
    prognosRr: String(fd.get('prognosRr') || ''),
    hallaRr: String(fd.get('hallaRr') || ''),
    openSize: String(fd.get('openSize') || fd.get('volym') || ''),
    volym: String(fd.get('volym') || fd.get('openSize') || ''),
  };
}
