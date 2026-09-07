import { escapeHtml, emptyFigure } from './format.js';
import { NYHETSSELE_SOURCES, RECEPT_PATH } from './nyhetssele.js';

export function nyhetsVal(draft, name) {
  const v = draft[name];
  return v === undefined || v === null ? '' : escapeHtml(String(v));
}

function sourcesText(draft) {
  if (Array.isArray(draft.sources)) return draft.sources.join(', ');
  return draft.sources == null ? '' : String(draft.sources);
}

export function renderNyhetsseleResult(result) {
  if (!result) {
    return `<p class="muted">Fyll remmar. Olja och guld får vara tomma (saknas). Ingen utskicksknapp.</p>`;
  }
  const missing = (result.missing || []).map((k) => escapeHtml(k)).join(', ');
  const missingBlock = result.missing && result.missing.length
    ? `<div class="info-banner">saknas: ${missing}</div>`
    : '';
  const oil = result.sele.oil ? escapeHtml(result.sele.oil) : emptyFigure('saknas');
  const gold = result.sele.gold ? escapeHtml(result.sele.gold) : emptyFigure('saknas');
  return `
    ${missingBlock}
    <p class="muted">Paper-remsa · ${result.ok ? 'remmar ok' : 'remmar ofullständiga'} · skicka = false</p>
    <div class="kalkyl-live">
      <div class="card"><div class="metric-label">Olja</div><div class="metric-value">${oil}</div></div>
      <div class="card"><div class="metric-label">Guld</div><div class="metric-value">${gold}</div></div>
    </div>
    <p class="faint">${result.namedReady ? 'namngivet ja + lista finns — appen skickar ändå inte' : 'paper tills namngivet ja och mottagarlista'}</p>
  `;
}

export function renderNyhetssele(draft, result) {
  const sourceHints = NYHETSSELE_SOURCES.join(', ');
  return `
    <section class="nyhetssele-stub" id="nyhetssele">
      <header>
        <p class="sele-kicker">Nyhetssele · recept</p>
        <h3 class="section-title">Nyhetssele</h3>
        <p class="muted">Binder remmar för vardagsmorgon (<span class="faint">${escapeHtml(RECEPT_PATH)}</span>). Paper. Ingen live-mejl.</p>
      </header>
      <div class="rider-badge-paper" role="status">PAPER · skicka = false · ingen e-post</div>
      <form id="nyhetssele-form">
        <div class="form-grid">
          <label>Datum
            <input name="date" placeholder="saknas" value="${nyhetsVal(draft, 'date')}" /></label>
          <label>Ämne
            <input name="subject" placeholder="saknas" value="${nyhetsVal(draft, 'subject')}" /></label>
          <label class="full">Källor <span class="hint">${escapeHtml(sourceHints)}</span>
            <input name="sources" placeholder="SVT, DI, Avanza" value="${escapeHtml(sourcesText(draft))}" /></label>
          <label>Olja <span class="hint">tom = saknas</span>
            <input name="oil" placeholder="saknas" value="${nyhetsVal(draft, 'oil')}" /></label>
          <label>Guld <span class="hint">tom = saknas</span>
            <input name="gold" placeholder="saknas" value="${nyhetsVal(draft, 'gold')}" /></label>
          <label class="full">Disclaimer
            <input name="disclaimer" placeholder="saknas" value="${nyhetsVal(draft, 'disclaimer')}" /></label>
          <label class="full">Sökväg
            <input name="filePath" placeholder="marknad/…" value="${nyhetsVal(draft, 'filePath')}" /></label>
          <label class="full sele-skip">
            <input name="provaForst" type="checkbox" value="true" ${draft.provaForst === false ? '' : 'checked'} /> Prova först
          </label>
          <label class="full sele-skip">
            <input name="namedYes" type="checkbox" value="true" ${draft.namedYes ? 'checked' : ''} /> Namngivet ja (ÖB)
          </label>
          <label class="full">Mottagare <span class="hint">saknas i git — fyll inte kund-PII här</span>
            <input name="recipients" placeholder="saknas" value="${escapeHtml(
              Array.isArray(draft.recipients) ? draft.recipients.join(', ') : String(draft.recipients || ''),
            )}" /></label>
        </div>
        <div class="btn-row">
          <button class="btn btn-gold" type="submit">Validera remmar</button>
          <button class="btn btn-ghost" type="button" data-action="nyhetssele-clear">Rensa</button>
        </div>
        <p class="faint">Ingen skicka-knapp. Live-mejl finns inte i den här ytan.</p>
      </form>
      <div id="nyhetssele-out">${renderNyhetsseleResult(result)}</div>
    </section>
  `;
}

export function readNyhetsseleForm(form) {
  const fd = new FormData(form);
  return {
    date: String(fd.get('date') || ''),
    subject: String(fd.get('subject') || ''),
    sources: String(fd.get('sources') || ''),
    oil: String(fd.get('oil') || ''),
    gold: String(fd.get('gold') || ''),
    provaForst: fd.get('provaForst') === 'true',
    disclaimer: String(fd.get('disclaimer') || ''),
    filePath: String(fd.get('filePath') || ''),
    namedYes: fd.get('namedYes') === 'true',
    recipients: String(fd.get('recipients') || ''),
    paper: true,
  };
}
