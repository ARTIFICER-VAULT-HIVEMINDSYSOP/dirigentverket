import './style.css';
import { TYP_LABEL, STATUS_LABEL, TYP_OPTIONS, STATUS_OPTIONS } from './seed.js';
import { loadState, saveState, resetToSeed, newProjectDraft } from './store.js';
import { projectMetrics, portfolioMetrics } from './calc.js';
import { detectSynergies, totalSynergyValue, KIND_LABEL } from './synergy.js';
import {
  formatSek,
  formatNumber,
  formatPct,
  formatPeriod,
  escapeHtml,
  parseList,
  formatSekShortOrEmpty,
  emptyFigure,
} from './format.js';
import {
  computeRobot,
  formatPx,
  formatSize,
  loadRobotDraft,
  saveRobotDraft,
  emptyRobotDraft,
} from './robot.js';

const root = document.getElementById('app-root');

let state = loadState();
let portfolioMode = 'cards';
let robotDraft = loadRobotDraft();
let robotResult = null;

function persist() {
  saveState(state);
}

function go(hash) {
  window.location.hash = hash;
}

function parseRoute() {
  const raw = (window.location.hash || '#/portfolj').replace(/^#/, '');
  const parts = raw.split('/').filter(Boolean);
  let view = parts[0] || 'portfolj';
  const id = parts[1] || null;
  if (view === 'projekt') view = 'verksamhet';
  return { view, id };
}

function avvikelseClass(v) {
  if (v > 0) return 'neg';
  if (v < 0) return 'pos';
  return '';
}

function statusBadge(status) {
  const label = STATUS_LABEL[status] || status;
  return `<span class="badge status-${escapeHtml(status)}">${escapeHtml(label)}</span>`;
}

function typLabel(typ) {
  return TYP_LABEL[typ] || typ;
}

function chips(list) {
  if (!list || !list.length) return `<span class="faint">—</span>`;
  return `<div class="chips">${list.map((x) => `<span class="chip">${escapeHtml(x)}</span>`).join('')}</div>`;
}

function moneyCell(value, filled) {
  if (!filled) return emptyFigure('fyll i');
  return escapeHtml(formatSek(value));
}

function derivedCell(has, value, extra = '') {
  if (!has) return emptyFigure('saknar utfall');
  return `${escapeHtml(formatSek(value))}${extra}`;
}

function renderShell(inner) {
  const port = portfolioMetrics(state.projects);
  const findings = detectSynergies(state.projects);
  const synVal = totalSynergyValue(findings);
  const { view } = parseRoute();
  const nav = (href, label, key) =>
    `<a href="${href}" class="${view === key ? 'is-active' : ''}">${label}</a>`;

  return `
    <div class="shell">
      <header class="masthead">
        <div>
          <p class="brand-kicker">Kluster · verksamheter</p>
          <h1 class="brand-title">Dirigent<span>verket</span></h1>
          <p class="brand-tag">Bok för det första vinstdrivande klustret — struktur, kalkyl och synergihypoteser.</p>
        </div>
        <div class="mast-meta">
          lokal lagring · dirigentverket.kluster.v1<br />
          ${state.projects.length} verksamheter i boken
        </div>
      </header>

      <div class="command-strip" role="note">
        ÖB Daniel · Stab Dirigentverket · utförare får utreda och föreslå, inte binda pengar/avtal
      </div>

      <div class="banner-struktur" role="status">
        Struktur för klustret, inte bokföring. Tom kalkyl är inte ett resultat — fyll i utfall när de finns.
      </div>

      <div class="strip">
        <div class="strip-cell">
          <div class="strip-label">Antal verksamheter</div>
          <div class="strip-value">${port.antal}</div>
        </div>
        <div class="strip-cell">
          <div class="strip-label">Total budget</div>
          <div class="strip-value">${port.hasUtfall ? escapeHtml(formatSekShortOrEmpty(port.budget)) : 'saknar utfall'}</div>
        </div>
        <div class="strip-cell">
          <div class="strip-label">Hittade synergier</div>
          <div class="strip-value">${findings.length}</div>
        </div>
        <div class="strip-cell">
          <div class="strip-label">Estimerad samordning</div>
          <div class="strip-value">${synVal > 0 ? escapeHtml(formatSekShortOrEmpty(synVal)) : 'saknar utfall'}</div>
        </div>
      </div>

      <nav class="nav">
        ${nav('#/portfolj', 'Portfölj', 'portfolj')}
        ${nav('#/kalkyl', 'Kalkyl', 'kalkyl')}
        ${nav('#/synergier', 'Synergier', 'synergier')}
        ${nav('#/robot', 'Artificer AI', 'robot')}
        <span class="spacer"></span>
        <a class="btn btn-gold" href="#/nytt">+ Ny verksamhet</a>
      </nav>

      <main>${inner}</main>

      <footer class="footer-bar">
        <span>Dirigentverket · klusterbok. Ändringar sparas i webbläsaren. Artificer AI är paper / utredning.</span>
        <button class="btn btn-ghost" type="button" data-action="reset-seed">Återställ klustret</button>
      </footer>
    </div>
  `;
}

function renderPortfolio() {
  const rows = state.projects.map((p) => {
    const m = projectMetrics(p);
    return { p, m };
  });

  const toggle = `
    <div class="view-toggle">
      <button class="btn ${portfolioMode === 'cards' ? 'btn-gold' : ''}" type="button" data-action="mode-cards">Kort</button>
      <button class="btn ${portfolioMode === 'table' ? 'btn-gold' : ''}" type="button" data-action="mode-table">Tabell</button>
    </div>
  `;

  if (portfolioMode === 'table') {
    const body = rows
      .map(
        ({ p, m }) => `
        <tr data-href="#/verksamhet/${encodeURIComponent(p.id)}">
          <td>${escapeHtml(p.namn)}</td>
          <td>${escapeHtml(typLabel(p.typ))}</td>
          <td>${escapeHtml(p.plats) || '<span class="faint">—</span>'}</td>
          <td>${statusBadge(p.status)}</td>
          <td class="num">${moneyCell(m.budget, m.budget > 0)}</td>
          <td class="num">${moneyCell(m.kostnad, m.kostnad > 0)}</td>
          <td class="num ${m.hasUtfall ? avvikelseClass(m.avvikelse) : ''}">${
            m.hasUtfall
              ? `${escapeHtml(formatSek(m.avvikelse))}<br /><span class="faint">${escapeHtml(formatPct(m.avvikelse_pct))}</span>`
              : emptyFigure('saknar utfall')
          }</td>
        </tr>`
      )
      .join('');
    return `
      ${toggle}
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Verksamhet</th><th>Typ</th><th>Plats</th><th>Status</th>
              <th class="num">Budget</th><th class="num">Kostnad</th>
              <th class="num">Avvikelse</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    `;
  }

  const cards = rows
    .map(({ p, m }) => {
      const risk = m.risk ? `<span class="badge risk">Risk &gt; 8 %</span>` : '';
      const avvikelse = m.hasUtfall
        ? `<div class="metric-value ${avvikelseClass(m.avvikelse)}">${escapeHtml(formatSek(m.avvikelse))} · ${escapeHtml(formatPct(m.avvikelse_pct))}</div>`
        : emptyFigure('saknar utfall');
      return `
        <article class="card clickable" data-href="#/verksamhet/${encodeURIComponent(p.id)}">
          <div class="card-top">
            <div>
              <h3>${escapeHtml(p.namn)}</h3>
              <div class="muted">${escapeHtml(typLabel(p.typ))}${p.plats ? ` · ${escapeHtml(p.plats)}` : ''}</div>
            </div>
            <div>${statusBadge(p.status)} ${risk}</div>
          </div>
          <div class="metrics">
            <div>
              <div class="metric-label">Budget</div>
              <div class="metric-value">${m.budget > 0 ? escapeHtml(formatSek(m.budget)) : emptyFigure('fyll i')}</div>
            </div>
            <div>
              <div class="metric-label">Kostnad</div>
              <div class="metric-value">${m.kostnad > 0 ? escapeHtml(formatSek(m.kostnad)) : emptyFigure('fyll i')}</div>
            </div>
            <div>
              <div class="metric-label">Avvikelse</div>
              ${avvikelse}
            </div>
            <div>
              <div class="metric-label">Täckningsbidrag</div>
              ${
                m.hasUtfall
                  ? `<div class="metric-value ${avvikelseClass(-m.tackningsbidrag)}">${escapeHtml(formatSek(m.tackningsbidrag))}</div>`
                  : emptyFigure('saknar utfall')
              }
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  return `${toggle}<div class="grid-cards">${cards || '<p class="empty">Inga verksamheter ännu.</p>'}</div>`;
}

function currentProject(routeId) {
  const id = routeId || state.selectedId;
  return state.projects.find((p) => p.id === id) || state.projects[0] || null;
}

function renderProject(routeId) {
  const p = currentProject(routeId);
  if (!p) {
    return `<p class="empty">Ingen verksamhet vald. <a href="#/nytt">Lägg till en.</a></p>`;
  }
  state.selectedId = p.id;
  persist();
  const m = projectMetrics(p);
  const options = state.projects
    .map((x) => `<option value="${escapeHtml(x.id)}" ${x.id === p.id ? 'selected' : ''}>${escapeHtml(x.namn)}</option>`)
    .join('');

  const robotLink =
    p.id === 'tradingskolan' || p.typ === 'utbildning'
      ? `<p class="page-lead">Artificer AI för Tradingskolan: <a href="#/robot">öppna Artificer AI</a> — föreslår SL/TP, lägger inga ordrar.</p>`
      : '';

  const derivedCards = m.hasUtfall
    ? `
      <div class="card">
        <div class="metric-label">Avvikelse</div>
        <div class="metric-value ${avvikelseClass(m.avvikelse)}">${escapeHtml(formatSek(m.avvikelse))}</div>
        <div class="faint">${escapeHtml(formatPct(m.avvikelse_pct))}</div>
      </div>
      <div class="card">
        <div class="metric-label">Täckningsbidrag</div>
        <div class="metric-value ${avvikelseClass(-m.tackningsbidrag)}">${escapeHtml(formatSek(m.tackningsbidrag))}</div>
        <div class="faint">budget − kostnad</div>
      </div>
      <div class="card">
        <div class="metric-label">Marginal</div>
        <div class="metric-value ${m.marginal_pct < 0 ? 'neg' : 'pos'}">${escapeHtml(formatPct(m.marginal_pct))}</div>
        <div class="faint">av budget</div>
      </div>`
    : `
      <div class="card">
        <div class="metric-label">Avvikelse</div>
        ${emptyFigure('saknar utfall')}
        <div class="faint">kräver budget och kostnad</div>
      </div>
      <div class="card">
        <div class="metric-label">Täckningsbidrag</div>
        ${emptyFigure('saknar utfall')}
        <div class="faint">fyll i båda beloppen</div>
      </div>
      <div class="card">
        <div class="metric-label">Marginal</div>
        ${emptyFigure('saknar utfall')}
        <div class="faint">inte ett nollresultat</div>
      </div>`;

  return `
    <div class="detail-head">
      <div>
        <h2>${escapeHtml(p.namn)}</h2>
        <div class="muted">${escapeHtml(typLabel(p.typ))}${p.plats ? ` · ${escapeHtml(p.plats)}` : ''} · ${formatPeriod(p.start, p.slut)}</div>
      </div>
      <select class="picker" data-action="select-project">${options}</select>
    </div>
    <div>${statusBadge(p.status)} ${m.risk ? '<span class="badge risk">Avvikelse över 8 %</span>' : ''}</div>
    ${robotLink}

    <div class="kalkyl-live">
      ${derivedCards}
      <div class="card">
        <div class="metric-label">Period</div>
        <div class="metric-value">${m.duration_days > 0 ? `${escapeHtml(formatNumber(m.duration_days))} dagar` : emptyFigure('saknar period')}</div>
        <div class="faint">${escapeHtml(formatPeriod(p.start, p.slut))}</div>
      </div>
    </div>

    <h3 class="section-title">Uppgift</h3>
    <dl class="dl-grid">
      <div><dt>Budget</dt><dd>${m.budget > 0 ? escapeHtml(formatSek(p.budget_sek)) : emptyFigure('fyll i')}</dd></div>
      <div><dt>Kostnad (utfall/prognos)</dt><dd>${m.kostnad > 0 ? escapeHtml(formatSek(p.kostnad_sek)) : emptyFigure('fyll i')}</dd></div>
    </dl>

    <h3 class="section-title">Kompetens</h3>
    ${chips(p.kompetens)}
    <h3 class="section-title">Kanaler</h3>
    ${chips(p.leverantörer)}
    <h3 class="section-title">Datakällor</h3>
    ${chips(p.material)}

    <h3 class="section-title">Anteckningar</h3>
    <p class="notes">${escapeHtml(p.anteckningar) || '<span class="faint">Inga anteckningar.</span>'}</p>

    <div class="btn-row">
      <a class="btn btn-gold" href="#/redigera/${encodeURIComponent(p.id)}">Redigera</a>
      <button class="btn btn-danger" type="button" data-action="delete-project" data-id="${escapeHtml(p.id)}">Ta bort</button>
    </div>
  `;
}

function renderForm(existing) {
  const p = existing || newProjectDraft();
  const isNew = !existing;
  const opt = (arr, cur) => arr.map((v) => `<option value="${escapeHtml(v)}" ${v === cur ? 'selected' : ''}>${escapeHtml(TYP_LABEL[v] || STATUS_LABEL[v] || v)}</option>`).join('');
  return `
    <h2 class="section-title" style="margin-top:0">${isNew ? 'Ny verksamhet' : 'Redigera verksamhet'}</h2>
    <p class="page-lead">Alla fält sparas lokalt. Kompetens, kanaler och datakällor anges kommaseparerat. Lämna belopp tomma tills det finns utfall — 0 är inte ett resultat.</p>
    <form id="project-form" data-id="${escapeHtml(p.id)}" data-new="${isNew ? '1' : '0'}">
      <div class="form-grid">
        <label>Namn<input name="namn" required value="${escapeHtml(p.namn)}" /></label>
        <label>Typ<select name="typ">${opt(TYP_OPTIONS, p.typ)}</select></label>
        <label>Plats / marknad<input name="plats" value="${escapeHtml(p.plats)}" /></label>
        <label>Status<select name="status">${opt(STATUS_OPTIONS, p.status)}</select></label>
        <label>Budget, kr<input name="budget_sek" type="number" min="0" step="1" value="${p.budget_sek ? escapeHtml(p.budget_sek) : ''}" placeholder="fyll i" /></label>
        <label>Kostnad, kr<input name="kostnad_sek" type="number" min="0" step="1" value="${p.kostnad_sek ? escapeHtml(p.kostnad_sek) : ''}" placeholder="fyll i" /></label>
        <label>Start<input name="start" type="date" value="${escapeHtml(p.start)}" /></label>
        <label>Slut<input name="slut" type="date" value="${escapeHtml(p.slut)}" /></label>
        <label class="full">Kompetens <span class="hint">t.ex. kapital, rådgivning, utbildning, fastighet</span>
          <input name="kompetens" value="${escapeHtml((p.kompetens || []).join(', '))}" /></label>
        <label class="full">Kanaler
          <input name="leverantörer" value="${escapeHtml((p.leverantörer || []).join(', '))}" /></label>
        <label class="full">Datakällor
          <input name="material" value="${escapeHtml((p.material || []).join(', '))}" /></label>
        <label class="full">Anteckningar
          <textarea name="anteckningar">${escapeHtml(p.anteckningar)}</textarea></label>
      </div>
      <div class="btn-row">
        <button class="btn btn-gold" type="submit">Spara</button>
        <a class="btn" href="#/verksamhet/${encodeURIComponent(p.id)}">Avbryt</a>
      </div>
    </form>
  `;
}
