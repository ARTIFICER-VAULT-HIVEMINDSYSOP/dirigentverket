import './style.css';
import { TYP_LABEL, STATUS_LABEL, TYP_OPTIONS, STATUS_OPTIONS } from './seed.js';
import { loadState, saveState, resetToSeed, newProjectDraft } from './store.js';
import { projectMetrics, portfolioMetrics } from './calc.js';
import { detectSynergies, totalSynergyValue, KIND_LABEL } from './synergy.js';
import {
  formatSek,
  formatSekShort,
  formatNumber,
  formatPct,
  formatPeriod,
  escapeHtml,
  parseList,
} from './format.js';

const root = document.getElementById('app-root');

let state = loadState();
let portfolioMode = 'cards'; // cards | table

function persist() {
  saveState(state);
}

function go(hash) {
  window.location.hash = hash;
}

function parseRoute() {
  const raw = (window.location.hash || '#/portfolj').replace(/^#/, '');
  const parts = raw.split('/').filter(Boolean);
  const view = parts[0] || 'portfolj';
  const id = parts[1] || null;
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
          <p class="brand-kicker">Utredning · portfölj</p>
          <h1 class="brand-title">Dirigent<span>verket</span></h1>
          <p class="brand-tag">Utredningsverktyg för byggprojekt — kalkyl och synergi.</p>
        </div>
        <div class="mast-meta">
          lokal lagring · dirigentverket.v1<br />
          ${state.projects.length} uppdrag i boken
        </div>
      </header>

      <div class="strip">
        <div class="strip-cell">
          <div class="strip-label">Antal projekt</div>
          <div class="strip-value">${port.antal}</div>
        </div>
        <div class="strip-cell">
          <div class="strip-label">Total budget</div>
          <div class="strip-value">${escapeHtml(formatSekShort(port.budget))}</div>
        </div>
        <div class="strip-cell">
          <div class="strip-label">Hittade synergier</div>
          <div class="strip-value">${findings.length}</div>
        </div>
        <div class="strip-cell">
          <div class="strip-label">Estimerad samordningsvinst</div>
          <div class="strip-value">${escapeHtml(formatSekShort(synVal))}</div>
        </div>
      </div>

      <nav class="nav">
        ${nav('#/portfolj', 'Portfölj', 'portfolj')}
        ${nav('#/projekt', 'Projekt', 'projekt')}
        ${nav('#/kalkyl', 'Kalkyl', 'kalkyl')}
        ${nav('#/synergier', 'Synergier', 'synergier')}
        <span class="spacer"></span>
        <a class="btn btn-gold" href="#/nytt">+ Nytt projekt</a>
      </nav>

      <main>${inner}</main>

      <footer class="footer-bar">
        <span>Dirigentverket · kalkyl och synergi. Ändringar sparas i webbläsaren.</span>
        <button class="btn btn-ghost" type="button" data-action="reset-seed">Återställ testdata</button>
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
        <tr data-href="#/projekt/${encodeURIComponent(p.id)}">
          <td>${escapeHtml(p.namn)}</td>
          <td>${escapeHtml(typLabel(p.typ))}</td>
          <td>${escapeHtml(p.plats)}</td>
          <td>${statusBadge(p.status)}</td>
          <td class="num">${escapeHtml(formatSek(m.budget))}</td>
          <td class="num">${escapeHtml(formatSek(m.kostnad))}</td>
          <td class="num">${escapeHtml(formatSek(m.m2_pris))}</td>
          <td class="num ${avvikelseClass(m.avvikelse)}">${escapeHtml(formatSek(m.avvikelse))}<br /><span class="faint">${escapeHtml(formatPct(m.avvikelse_pct))}</span></td>
        </tr>`
      )
      .join('');
    return `
      ${toggle}
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Projekt</th><th>Typ</th><th>Ort</th><th>Status</th>
              <th class="num">Budget</th><th class="num">Kostnad</th>
              <th class="num">m²-pris</th><th class="num">Avvikelse</th>
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
      return `
        <article class="card clickable" data-href="#/projekt/${encodeURIComponent(p.id)}">
          <div class="card-top">
            <div>
              <h3>${escapeHtml(p.namn)}</h3>
              <div class="muted">${escapeHtml(typLabel(p.typ))} · ${escapeHtml(p.plats)}</div>
            </div>
            <div>${statusBadge(p.status)} ${risk}</div>
          </div>
          <div class="metrics">
            <div>
              <div class="metric-label">Budget</div>
              <div class="metric-value">${escapeHtml(formatSek(m.budget))}</div>
            </div>
            <div>
              <div class="metric-label">m²-pris</div>
              <div class="metric-value">${escapeHtml(formatSek(m.m2_pris))}</div>
            </div>
            <div>
              <div class="metric-label">Kostnad</div>
              <div class="metric-value">${escapeHtml(formatSek(m.kostnad))}</div>
            </div>
            <div>
              <div class="metric-label">Avvikelse</div>
              <div class="metric-value ${avvikelseClass(m.avvikelse)}">${escapeHtml(formatSek(m.avvikelse))} · ${escapeHtml(formatPct(m.avvikelse_pct))}</div>
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  return `${toggle}<div class="grid-cards">${cards || '<p class="empty">Inga projekt ännu.</p>'}</div>`;
}

function currentProject(routeId) {
  const id = routeId || state.selectedId;
  return state.projects.find((p) => p.id === id) || state.projects[0] || null;
}

function renderProject(routeId) {
  const p = currentProject(routeId);
  if (!p) {
    return `<p class="empty">Inget projekt valt. <a href="#/nytt">Lägg till ett.</a></p>`;
  }
  state.selectedId = p.id;
  persist();
  const m = projectMetrics(p);
  const options = state.projects
    .map((x) => `<option value="${escapeHtml(x.id)}" ${x.id === p.id ? 'selected' : ''}>${escapeHtml(x.namn)}</option>`)
    .join('');

  return `
    <div class="detail-head">
      <div>
        <h2>${escapeHtml(p.namn)}</h2>
        <div class="muted">${escapeHtml(typLabel(p.typ))} · ${escapeHtml(p.plats)} · ${formatPeriod(p.start, p.slut)}</div>
      </div>
      <select class="picker" data-action="select-project">${options}</select>
    </div>
    <div>${statusBadge(p.status)} ${m.risk ? '<span class="badge risk">Avvikelse över 8 %</span>' : ''}</div>

    <div class="kalkyl-live">
      <div class="card">
        <div class="metric-label">Avvikelse</div>
        <div class="metric-value ${avvikelseClass(m.avvikelse)}">${escapeHtml(formatSek(m.avvikelse))}</div>
        <div class="faint">${escapeHtml(formatPct(m.avvikelse_pct))}</div>
      </div>
      <div class="card">
        <div class="metric-label">m²-pris</div>
        <div class="metric-value">${escapeHtml(formatSek(m.m2_pris))}</div>
        <div class="faint">${escapeHtml(formatNumber(m.yta))} m²</div>
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
      </div>
      <div class="card">
        <div class="metric-label">Varaktighet</div>
        <div class="metric-value">${escapeHtml(formatNumber(m.duration_days))} dagar</div>
        <div class="faint">${escapeHtml(formatPeriod(p.start, p.slut))}</div>
      </div>
    </div>

    <h3 class="section-title">Uppgift</h3>
    <dl class="dl-grid">
      <div><dt>Budget</dt><dd>${escapeHtml(formatSek(p.budget_sek))}</dd></div>
      <div><dt>Kostnad (utfall/prognos)</dt><dd>${escapeHtml(formatSek(p.kostnad_sek))}</dd></div>
      <div><dt>Yta</dt><dd>${escapeHtml(formatNumber(p.yta_m2))} m²</dd></div>
      <div><dt>Besättning</dt><dd>${escapeHtml(formatNumber(p.besättning))} personer</dd></div>
    </dl>

    <h3 class="section-title">Kompetens</h3>
    ${chips(p.kompetens)}
    <h3 class="section-title">Leverantörer</h3>
    ${chips(p.leverantörer)}
    <h3 class="section-title">Material</h3>
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
    <h2 class="section-title" style="margin-top:0">${isNew ? 'Nytt projekt' : 'Redigera projekt'}</h2>
    <p class="page-lead">Alla fält sparas lokalt. Kompetens, leverantörer och material anges kommaseparerat.</p>
    <form id="project-form" data-id="${escapeHtml(p.id)}" data-new="${isNew ? '1' : '0'}">
      <div class="form-grid">
        <label>Namn<input name="namn" required value="${escapeHtml(p.namn)}" /></label>
        <label>Typ<select name="typ">${opt(TYP_OPTIONS, p.typ)}</select></label>
        <label>Plats / ort<input name="plats" required value="${escapeHtml(p.plats)}" /></label>
        <label>Status<select name="status">${opt(STATUS_OPTIONS, p.status)}</select></label>
        <label>Yta, m²<input name="yta_m2" type="number" min="0" step="1" value="${escapeHtml(p.yta_m2)}" /></label>
        <label>Besättning, antal<input name="besättning" type="number" min="0" step="1" value="${escapeHtml(p.besättning)}" /></label>
        <label>Budget, kr<input name="budget_sek" type="number" min="0" step="1000" value="${escapeHtml(p.budget_sek)}" /></label>
        <label>Kostnad, kr<input name="kostnad_sek" type="number" min="0" step="1000" value="${escapeHtml(p.kostnad_sek)}" /></label>
        <label>Start<input name="start" type="date" value="${escapeHtml(p.start)}" /></label>
        <label>Slut<input name="slut" type="date" value="${escapeHtml(p.slut)}" /></label>
        <label class="full">Kompetens <span class="hint">t.ex. mark, stomme, el, VS, plattsättning</span>
          <input name="kompetens" value="${escapeHtml((p.kompetens || []).join(', '))}" /></label>
        <label class="full">Leverantörer
          <input name="leverantörer" value="${escapeHtml((p.leverantörer || []).join(', '))}" /></label>
        <label class="full">Material
          <input name="material" value="${escapeHtml((p.material || []).join(', '))}" /></label>
        <label class="full">Anteckningar
          <textarea name="anteckningar">${escapeHtml(p.anteckningar)}</textarea></label>
      </div>
      <div class="btn-row">
        <button class="btn btn-gold" type="submit">Spara</button>
        <a class="btn" href="#/projekt/${encodeURIComponent(p.id)}">Avbryt</a>
      </div>
    </form>
  `;
}

function renderKalkyl() {
  const port = portfolioMetrics(state.projects);
  const typRows = Object.values(port.byTyp)
    .sort((a, b) => b.budget - a.budget)
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(typLabel(row.typ))}</td>
        <td class="num">${row.antal}</td>
        <td class="num">${escapeHtml(formatSek(row.budget))}</td>
        <td class="num">${escapeHtml(formatSek(row.kostnad))}</td>
        <td class="num ${avvikelseClass(row.avvikelse)}">${escapeHtml(formatSek(row.avvikelse))}<br /><span class="faint">${escapeHtml(formatPct(row.avvikelse_pct))}</span></td>
        <td class="num">${escapeHtml(formatSek(row.m2_pris))}</td>
      </tr>`
    )
    .join('');

  const riskBanner = port.riskFlag
    ? `<div class="risk-banner">Riskflagga: ${port.riskCount} projekt har avvikelse över 8 % mot budget. Se Portfölj och Projekt för detaljer.</div>`
    : `<p class="muted">Ingen projektavvikelse över 8 %. Portföljen ligger inom tolerans på projektnivå.</p>`;

  return `
    <p class="page-lead">Portföljkalkylen räknas om live från aktuella projekt. Avvikelse = kostnad − budget. Viktat m²-pris = total kostnad / total yta. Täckningsbidrag = budget − kostnad.</p>
    ${riskBanner}
    <div class="kalkyl-live">
      <div class="card"><div class="metric-label">Total budget</div><div class="metric-value">${escapeHtml(formatSek(port.budget))}</div></div>
      <div class="card"><div class="metric-label">Total kostnad</div><div class="metric-value">${escapeHtml(formatSek(port.kostnad))}</div></div>
      <div class="card"><div class="metric-label">Total avvikelse</div><div class="metric-value ${avvikelseClass(port.avvikelse)}">${escapeHtml(formatSek(port.avvikelse))}<br /><span class="faint">${escapeHtml(formatPct(port.avvikelse_pct))}</span></div></div>
      <div class="card"><div class="metric-label">Viktat m²-pris</div><div class="metric-value">${escapeHtml(formatSek(port.viktat_m2_pris))}</div><div class="faint">${escapeHtml(formatNumber(port.yta))} m²</div></div>
      <div class="card"><div class="metric-label">Täckningsbidrag</div><div class="metric-value ${port.tackningsbidrag < 0 ? 'neg' : 'pos'}">${escapeHtml(formatSek(port.tackningsbidrag))}</div><div class="faint">${escapeHtml(formatPct(port.marginal_pct))} marginal</div></div>
    </div>

    <h3 class="section-title">Per typ</h3>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Typ</th><th class="num">Antal</th><th class="num">Budget</th>
            <th class="num">Kostnad</th><th class="num">Avvikelse</th><th class="num">m²-pris</th>
          </tr>
        </thead>
        <tbody>${typRows}</tbody>
      </table>
    </div>

    <h3 class="section-title">Överlapp i tid</h3>
    <div class="kalkyl-live">
      <div class="card">
        <div class="metric-label">Kalenderdagar med ≥2 projekt</div>
        <div class="metric-value">${escapeHtml(formatNumber(port.overlap.concurrentDays))}</div>
      </div>
      <div class="card">
        <div class="metric-label">Parvisa överlappsdygn (summa)</div>
        <div class="metric-value">${escapeHtml(formatNumber(port.overlap.pairwiseSum))}</div>
        <div class="faint">${port.overlap.pairCount} par överlappar</div>
      </div>
      <div class="card">
        <div class="metric-label">Max samtidig beläggning</div>
        <div class="metric-value">${port.overlap.maxConcurrent} projekt</div>
      </div>
    </div>
  `;
}

function renderSynergier() {
  const findings = detectSynergies(state.projects);
  const total = totalSynergyValue(findings);
  if (!findings.length) {
    return `<p class="empty">Inga synergier hittades. Lägg till projekt med delad ort, leverantör eller kompetens.</p>`;
  }
  const cards = findings
    .map((f, i) => {
      const idx = String(i + 1).padStart(2, '0');
      const links = f.projectIds
        .map((id, n) => `<a href="#/projekt/${encodeURIComponent(id)}">${escapeHtml(f.projectNames[n] || id)}</a>`)
        .join('');
      return `
        <article class="finding">
          <div class="finding-meta">
            <span class="finding-index">Fynd ${idx}</span>
            <span class="badge">${escapeHtml(KIND_LABEL[f.kind] || f.kind)}</span>
            <span class="badge conf-${escapeHtml(f.confidence)}">Tillförlitlighet ${escapeHtml(f.confidence)}</span>
          </div>
          <h3>${escapeHtml(f.title)}</h3>
          <p>${escapeHtml(f.explanation)}</p>
          <div class="finding-foot">
            <div class="finding-projects">${links}</div>
            <div>
              <div class="metric-label">Estimerat värde / besparing</div>
              <div class="finding-value">${escapeHtml(formatSek(f.estimated_sek))}</div>
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  return `
    <p class="page-lead">Motorn läser ort (Stockholm–Solna–Sundbyberg och Göteborg–Mölndal som närliggande), delade leverantörer och material, överlappande tid plus kompetens, samt infrastruktur som möjliggör bostäder eller kontor. Summa av fynden: <strong>${escapeHtml(formatSek(total))}</strong> — posterna kan överlappa och ska läsas som utredningshypoteser, inte som en kassa.</p>
    ${cards}
  `;
}

function render() {
  const { view, id } = parseRoute();
  let inner = '';
  if (view === 'projekt') inner = renderProject(id);
  else if (view === 'kalkyl') inner = renderKalkyl();
  else if (view === 'synergier') inner = renderSynergier();
  else if (view === 'nytt') inner = renderForm(null);
  else if (view === 'redigera') {
    const p = state.projects.find((x) => x.id === id);
    inner = p ? renderForm(p) : renderForm(null);
  } else inner = renderPortfolio();

  root.innerHTML = renderShell(inner);
}

function readForm(form) {
  const fd = new FormData(form);
  return {
    id: form.dataset.id,
    namn: String(fd.get('namn') || '').trim(),
    typ: String(fd.get('typ') || 'bostäder'),
    plats: String(fd.get('plats') || '').trim(),
    status: String(fd.get('status') || 'utredning'),
    yta_m2: Number(fd.get('yta_m2')) || 0,
    budget_sek: Number(fd.get('budget_sek')) || 0,
    kostnad_sek: Number(fd.get('kostnad_sek')) || 0,
    start: String(fd.get('start') || ''),
    slut: String(fd.get('slut') || ''),
    besättning: Number(fd.get('besättning')) || 0,
    kompetens: parseList(fd.get('kompetens')),
    leverantörer: parseList(fd.get('leverantörer')),
    material: parseList(fd.get('material')),
    anteckningar: String(fd.get('anteckningar') || ''),
  };
}

root.addEventListener('click', (ev) => {
  const hrefEl = ev.target.closest('[data-href]');
  if (hrefEl && !ev.target.closest('a,button,select,input,textarea,label')) {
    go(hrefEl.getAttribute('data-href'));
    return;
  }
  const btn = ev.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.getAttribute('data-action');
  if (action === 'mode-cards') {
    portfolioMode = 'cards';
    render();
  } else if (action === 'mode-table') {
    portfolioMode = 'table';
    render();
  } else if (action === 'reset-seed') {
    if (confirm('Återställ portföljen till testdata? Egna ändringar raderas.')) {
      state = resetToSeed();
      go('#/portfolj');
      render();
    }
  } else if (action === 'delete-project') {
    const id = btn.getAttribute('data-id');
    const p = state.projects.find((x) => x.id === id);
    if (!p) return;
    if (confirm(`Ta bort ${p.namn}?`)) {
      state.projects = state.projects.filter((x) => x.id !== id);
      if (state.selectedId === id) state.selectedId = state.projects[0]?.id || null;
      persist();
      go('#/portfolj');
      render();
    }
  }
});

root.addEventListener('change', (ev) => {
  const sel = ev.target.closest('[data-action="select-project"]');
  if (!sel) return;
  state.selectedId = sel.value;
  persist();
  go(`#/projekt/${encodeURIComponent(sel.value)}`);
});

root.addEventListener('submit', (ev) => {
  const form = ev.target.closest('#project-form');
  if (!form) return;
  ev.preventDefault();
  const project = readForm(form);
  if (!project.namn) return;
  const isNew = form.dataset.new === '1';
  if (isNew) {
    state.projects.push(project);
  } else {
    const i = state.projects.findIndex((p) => p.id === project.id);
    if (i >= 0) state.projects[i] = project;
    else state.projects.push(project);
  }
  state.selectedId = project.id;
  persist();
  go(`#/projekt/${encodeURIComponent(project.id)}`);
});

window.addEventListener('hashchange', render);
if (!window.location.hash) window.location.hash = '#/portfolj';
render();
