import { escapeHtml, emptyFigure } from './format.js';
import { tenantSeleShape, TILLGANGAR } from './sele.js';

export function seleVal(draft, name) {
  const v = draft[name];
  return v === undefined || v === null ? '' : escapeHtml(String(v));
}

function symbolsText(draft) {
  if (Array.isArray(draft.symbols)) return draft.symbols.join(', ');
  return draft.symbols == null ? '' : String(draft.symbols);
}

function datalist(id, values) {
  if (!values || !values.length) return '';
  const opts = values.map((v) => `<option value="${escapeHtml(v)}"></option>`).join('');
  return `<datalist id="${escapeHtml(id)}">${opts}</datalist>`;
}

export function renderSeleResult(result) {
  if (!result) {
    return `<p class="muted">Fyll namn, varumärke, tilldelad, symboler, volym %, SL % och TP %. Tom cell = saknas. Ingen saldo hämtas.</p>`;
  }

  const missing = (result.missing || []).map((k) => escapeHtml(k)).join(', ');
  const missingBlock = result.missing && result.missing.length
    ? `<div class="info-banner">${escapeHtml('saknas')}: ${missing}</div>`
    : '';

  if (!result.ok || result.saknar_sl_tp) {
    return `${missingBlock}<div class="info-banner">saknar_sl_tp — SL % och TP % krävs innan selen kan bindas.</div>`;
  }

  const s = result.sele;
  const vol =
    s.volumePct === '' || s.volumePct === null || s.volumePct === undefined
      ? emptyFigure('saknas')
      : `<div class="metric-value">${escapeHtml(String(s.volumePct))} %</div>`;
  const sl = `<div class="metric-value">${escapeHtml(String(s.slPct))} %</div>`;
  const tp = `<div class="metric-value">${escapeHtml(String(s.tpPct))} %</div>`;
  const symbols = s.symbols.length
    ? s.symbols.map((x) => `<span class="chip">${escapeHtml(x)}</span>`).join('')
    : emptyFigure('saknas');
  const brand = s.clientFilter.brand ? escapeHtml(s.clientFilter.brand) : emptyFigure('saknas');
  const assigned = s.clientFilter.assigned ? escapeHtml(s.clientFilter.assigned) : emptyFigure('saknas');

  return `
    ${missingBlock}
    <h3 class="section-title">Bunden sele</h3>
    <p class="muted">${escapeHtml(s.name || 'Pilotsele')} · ${escapeHtml(s.tillgang || 'ROBOT')} · ${escapeHtml(s.cluster || '')} · ${s.side} · paper. Älvor ärver volym, höjer aldrig.</p>
    <div class="kalkyl-live">
      <div class="card"><div class="metric-label">Varumärke</div><div class="metric-value">${brand}</div><div class="faint">clientFilter · tenant</div></div>
      <div class="card"><div class="metric-label">Tilldelad</div><div class="metric-value">${assigned}</div><div class="faint">ingen kund-PII i git</div></div>
      <div class="card"><div class="metric-label">Pilotvolym</div>${vol}<div class="faint">älva ärver, höjer aldrig</div></div>
      <div class="card"><div class="metric-label">SL</div>${sl}<div class="faint">procent · krävs</div></div>
      <div class="card"><div class="metric-label">TP</div>${tp}<div class="faint">procent · krävs</div></div>
    </div>
    <div class="chips sele-symbols">${symbols}</div>
    <p class="faint">${s.skipIfSymbolOpen ? 'hoppa om symbolen redan är öppen' : 'öppen symbol stoppar inte'} · live = false · ingen ForceX-hämtning</p>
  `;
}

export function renderSele(draft, result, opts = {}) {
  const liveLocked = opts.liveLocked !== false;
  const tenant = tenantSeleShape(opts.tenant || {});
  const brandList = datalist('sele-brands', tenant.brands);
  const assignedList = datalist('sele-assignees', tenant.assignees);
  const brandAttr = tenant.brands.length ? ' list="sele-brands"' : '';
  const assignedAttr = tenant.assignees.length ? ' list="sele-assignees"' : '';

  return `
    <section class="sele-stage">
      <header class="sele-hero">
        <p class="sele-kicker">Nexus · Pilotsele</p>
        <h2 class="sele-title">Pilotsele</h2>
        <p class="sele-lead">Pilotens volym + SL/TP ärvs av ROBOT-klustret. AIIND och GULDR är valbara, skilda. Älvor höjer aldrig. Paper.</p>
      </header>
      <div class="rider-badge-paper" role="status">PAPER · live=false · ingen mäklare · ingen ForceX</div>
      <div class="rider-mode" role="status">
        <span class="rider-mode-paper">paper</span>
        <span class="rider-mode-live" aria-hidden="true">live = false</span>
      </div>
      <p class="banner-rider">Pilotsele är selen mot ROBOT-klustret. SL+TP krävs. Tom cell = saknas. Volym sätter piloten. Robot höjer aldrig. ${
        liveLocked ? 'LIVE_LOCKED.' : 'paper.'
      }</p>

      <div class="rider-tablet">
        <form id="sele-form">
          <div class="form-grid">
            <label>Namn
              <input name="name" placeholder="Pilotsele" value="${seleVal(draft, 'name')}" /></label>
            <label>Tillgång <span class="hint">ROBOT primär · AIIND/GULDR skilda</span>
              <select name="tillgang">
                ${TILLGANGAR.map(
                  (t) => `<option value="${t}" ${(draft.tillgang || 'ROBOT') === t ? 'selected' : ''}>${t}</option>`,
                ).join('')}
              </select></label>
            <label>Kluster
              <input name="cluster" placeholder="ROBOT-TRADER" value="${seleVal(draft, 'cluster')}" /></label>
            <label>Varumärke <span class="hint">tenant, t.ex. North Investment</span>
              <input name="brand" placeholder="varumärke" value="${seleVal(draft, 'brand')}"${brandAttr} /></label>
            <label>Tilldelad <span class="hint">stab, t.ex. Daniel</span>
              <input name="assigned" placeholder="tilldelad" value="${seleVal(draft, 'assigned')}"${assignedAttr} /></label>
            <label class="full">Symboler <span class="hint">valfritt, flera — kluster styrs av tillgång</span>
              <input name="symbols" placeholder="valfritt utöver ROBOT-kluster" value="${escapeHtml(symbolsText(draft))}" /></label>
            <label>Sida
              <select name="side">
                <option value="köp" ${draft.side !== 'sälj' ? 'selected' : ''}>Köp</option>
                <option value="sälj" ${draft.side === 'sälj' ? 'selected' : ''}>Sälj</option>
              </select></label>
            <label>Volym % <span class="hint">piloten sätter</span>
              <input name="volumePct" inputmode="decimal" placeholder="t.ex. 1" value="${seleVal(draft, 'volumePct')}" /></label>
            <label>SL %
              <input name="slPct" inputmode="decimal" placeholder="krävs" value="${seleVal(draft, 'slPct')}" /></label>
            <label>TP %
              <input name="tpPct" inputmode="decimal" placeholder="krävs" value="${seleVal(draft, 'tpPct')}" /></label>
            <label class="full sele-skip">
              <input name="skipIfSymbolOpen" type="checkbox" value="true" ${
                draft.skipIfSymbolOpen === false ? '' : 'checked'
              } /> Hoppa om symbolen redan är öppen
            </label>
          </div>
          ${brandList}
          ${assignedList}
          <div class="btn-row">
            <button class="btn btn-gold" type="submit">Bind Pilotsele</button>
            <button class="btn btn-ghost" type="button" data-action="sele-clear">Rensa</button>
          </div>
        </form>
        <div id="sele-out" class="sele-out">${renderSeleResult(result)}</div>
      </div>
    </section>
  `;
}

export function readSeleForm(form) {
  const fd = new FormData(form);
  return {
    name: String(fd.get('name') || '').trim(),
    tillgang: String(fd.get('tillgang') || 'ROBOT').trim(),
    cluster: String(fd.get('cluster') || ''),
    brand: String(fd.get('brand') || '').trim(),
    assigned: String(fd.get('assigned') || '').trim(),
    symbols: String(fd.get('symbols') || ''),
    side: String(fd.get('side') || 'köp'),
    volumePct: String(fd.get('volumePct') || ''),
    slPct: String(fd.get('slPct') || ''),
    tpPct: String(fd.get('tpPct') || ''),
    skipIfSymbolOpen: fd.get('skipIfSymbolOpen') === 'true',
    paper: true,
  };
}
