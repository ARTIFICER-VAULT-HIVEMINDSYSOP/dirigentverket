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
        ${nav('#/robot', 'Robot', 'robot')}
        <span class="spacer"></span>
        <a class="btn btn-gold" href="#/nytt">+ Ny verksamhet</a>
      </nav>

      <main>${inner}</main>

      <footer class="footer-bar">
        <span>Dirigentverket · klusterbok. Ändringar sparas i webbläsaren. Robotten är paper / utredning.</span>
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
      ? `<p class="page-lead">Paper-robot för Tradingskolan: <a href="#/robot">öppna Robot</a> — föreslår SL/TP, lägger inga ordrar.</p>`
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

function renderKalkyl() {
  const port = portfolioMetrics(state.projects);
  const typRows = Object.values(port.byTyp)
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(typLabel(row.typ))}</td>
        <td class="num">${row.antal}</td>
        <td class="num">${row.budget > 0 ? escapeHtml(formatSek(row.budget)) : emptyFigure('fyll i')}</td>
        <td class="num">${row.kostnad > 0 ? escapeHtml(formatSek(row.kostnad)) : emptyFigure('fyll i')}</td>
        <td class="num ${row.hasUtfall ? avvikelseClass(row.avvikelse) : ''}">${
          row.hasUtfall
            ? `${escapeHtml(formatSek(row.avvikelse))}<br /><span class="faint">${escapeHtml(formatPct(row.avvikelse_pct))}</span>`
            : emptyFigure('saknar utfall')
        }</td>
      </tr>`
    )
    .join('');

  const riskBanner = !port.hasUtfall
    ? `<div class="info-banner">Kalkylen saknar utfall. Fyll i budget och kostnad per verksamhet — noll är inte ett resultat.</div>`
    : port.riskFlag
      ? `<div class="risk-banner">Riskflagga: ${port.riskCount} verksamhet${port.riskCount === 1 ? '' : 'er'} har avvikelse över 8 % mot budget.</div>`
      : `<p class="muted">Ingen avvikelse över 8 % bland verksamheter med ifylld kalkyl.</p>`;

  const overlap = port.overlap;
  const overlapInner = overlap.hasPeriod
    ? `
      <div class="card">
        <div class="metric-label">Kalenderdagar med ≥2 verksamheter</div>
        <div class="metric-value">${escapeHtml(formatNumber(overlap.concurrentDays))}</div>
      </div>
      <div class="card">
        <div class="metric-label">Parvisa överlappsdygn (summa)</div>
        <div class="metric-value">${escapeHtml(formatNumber(overlap.pairwiseSum))}</div>
        <div class="faint">${overlap.pairCount} par överlappar</div>
      </div>
      <div class="card">
        <div class="metric-label">Max samtidig beläggning</div>
        <div class="metric-value">${overlap.maxConcurrent} verksamheter</div>
      </div>`
    : `<p class="muted">Saknar period — fyll i start och slut om tidsöverlapp ska räknas.</p>`;

  return `
    <p class="page-lead">Portföljkalkylen räknas om live. Avvikelse och täckningsbidrag visas bara när både budget och kostnad är ifyllda och större än noll. Paper-robot för Tradingskolan finns under <a href="#/robot">Robot</a>.</p>
    ${riskBanner}
    <div class="kalkyl-live">
      <div class="card"><div class="metric-label">Total budget</div><div class="metric-value">${port.budget > 0 ? escapeHtml(formatSek(port.budget)) : emptyFigure('fyll i')}</div></div>
      <div class="card"><div class="metric-label">Total kostnad</div><div class="metric-value">${port.kostnad > 0 ? escapeHtml(formatSek(port.kostnad)) : emptyFigure('fyll i')}</div></div>
      <div class="card"><div class="metric-label">Total avvikelse</div><div class="metric-value ${port.hasUtfall ? avvikelseClass(port.avvikelse) : ''}">${
        port.hasUtfall
          ? `${escapeHtml(formatSek(port.avvikelse))}<br /><span class="faint">${escapeHtml(formatPct(port.avvikelse_pct))}</span>`
          : emptyFigure('saknar utfall')
      }</div></div>
      <div class="card"><div class="metric-label">Täckningsbidrag</div><div class="metric-value ${port.hasUtfall ? (port.tackningsbidrag < 0 ? 'neg' : 'pos') : ''}">${
        port.hasUtfall
          ? `${escapeHtml(formatSek(port.tackningsbidrag))}<br /><span class="faint">${escapeHtml(formatPct(port.marginal_pct))} marginal</span>`
          : emptyFigure('saknar utfall')
      }</div></div>
    </div>

    <h3 class="section-title">Per typ</h3>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Typ</th><th class="num">Antal</th><th class="num">Budget</th>
            <th class="num">Kostnad</th><th class="num">Avvikelse</th>
          </tr>
        </thead>
        <tbody>${typRows}</tbody>
      </table>
    </div>

    <h3 class="section-title">Överlapp i tid</h3>
    <div class="kalkyl-live">
      ${overlapInner}
    </div>
  `;
}

function renderSynergier() {
  const findings = detectSynergies(state.projects);
  const total = totalSynergyValue(findings);
  if (!findings.length) {
    return `<p class="empty">Inga synergihypoteser. Lägg till minst två verksamheter i klustret.</p>`;
  }
  const cards = findings
    .map((f, i) => {
      const idx = String(i + 1).padStart(2, '0');
      const links = f.projectIds
        .map((id, n) => `<a href="#/verksamhet/${encodeURIComponent(id)}">${escapeHtml(f.projectNames[n] || id)}</a>`)
        .join('');
      const value =
        Number(f.estimated_sek) > 0
          ? escapeHtml(formatSek(f.estimated_sek))
          : emptyFigure('saknar utfall');
      return `
        <article class="finding">
          <div class="finding-meta">
            <span class="finding-index">Hypotes ${idx}</span>
            <span class="badge hypotes">Hypotes</span>
            <span class="badge">${escapeHtml(KIND_LABEL[f.kind] || f.kind)}</span>
            <span class="badge conf-${escapeHtml(f.confidence)}">Tillförlitlighet ${escapeHtml(f.confidence)}</span>
          </div>
          <h3>${escapeHtml(f.title)}</h3>
          <p>${escapeHtml(f.explanation)}</p>
          <div class="finding-foot">
            <div class="finding-projects">${links}</div>
            <div>
              <div class="metric-label">Estimerat värde / besparing</div>
              <div class="finding-value">${value}</div>
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  return `
    <p class="page-lead">Motorn läser klustret och skriver kvalitativa hypoteser. Inga belopp tills någon fyller i utfall. Summa av fynden: <strong>${total > 0 ? escapeHtml(formatSek(total)) : 'saknar utfall'}</strong> — läs som utredning, inte som kassa.</p>
    ${cards}
  `;
}

function val(name) {
  const v = robotDraft[name];
  return v === undefined || v === null ? '' : escapeHtml(String(v));
}

function renderRobotResult() {
  const r = robotResult;
  if (!r) {
    return `<p class="muted">Fyll i instrument, sida, entry, risk och RR. Kurs hämtas inte — skriv den själv.</p>`;
  }
  if (!r.ok) {
    return `<div class="info-banner">${r.errors.map((e) => escapeHtml(e)).join(' ')}</div>`;
  }
  const { initial, dynamic, size, input } = r;
  const sizeBlock =
    size !== null
      ? `<div class="card"><div class="metric-label">Positionsstorlek</div><div class="metric-value">${escapeHtml(formatSize(size))}</div><div class="faint">riskbelopp / SL-avstånd</div></div>`
      : `<div class="card"><div class="metric-label">Positionsstorlek</div>${emptyFigure('fyll i riskbelopp')}<div class="faint">ingen kontostorlek antas</div></div>`;

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
    ${dyn}
  `;
}

function renderRobot() {
  return `
    <h2 class="section-title" style="margin-top:0">Robot · paper / utredning</h2>
    <div class="banner-robot" role="status">Föreslår SL/TP, lägger inga ordrar. Ingen mäklare, ingen live-exekvering, inga påhittade kurser eller backtest.</div>
    <p class="page-lead">Modul under Tradingskolan. Skriv instrument och kurser själv. Positionsstorlek räknas bara om du anger riskbelopp i kronor — kontostorlek gissas inte.</p>
    <form id="robot-form">
      <div class="form-grid">
        <label>Instrument
          <input name="instrument" required placeholder="t.ex. OMXS30, EURUSD" value="${val('instrument')}" /></label>
        <label>Sida
          <select name="side">
            <option value="köp" ${robotDraft.side !== 'sälj' ? 'selected' : ''}>Köp</option>
            <option value="sälj" ${robotDraft.side === 'sälj' ? 'selected' : ''}>Sälj</option>
          </select></label>
        <label>Entry
          <input name="entry" inputmode="decimal" placeholder="kurs" value="${val('entry')}" /></label>
        <label>Riskavstånd
          <input name="risk" inputmode="decimal" placeholder="pris eller %" value="${val('risk')}" /></label>
        <label>Risk som
          <select name="riskMode">
            <option value="pris" ${robotDraft.riskMode !== 'procent' ? 'selected' : ''}>Prisavstånd</option>
            <option value="procent" ${robotDraft.riskMode === 'procent' ? 'selected' : ''}>Procent av entry</option>
          </select></label>
        <label>Mål-RR
          <input name="rr" inputmode="decimal" placeholder="1,5 / 2 / 3" value="${val('rr')}" /></label>
        <label>ATR <span class="hint">valfritt, används om riskavstånd saknas</span>
          <input name="atr" inputmode="decimal" value="${val('atr')}" /></label>
        <label>Aktuell kurs <span class="hint">valfritt, skriv själv — hämtas inte</span>
          <input name="current" inputmode="decimal" value="${val('current')}" /></label>
        <label class="full">Riskbelopp, kr <span class="hint">valfritt — utan belopp lämnas storlek tom</span>
          <input name="riskSek" inputmode="decimal" placeholder="fyll i för storlek" value="${val('riskSek')}" /></label>
      </div>
      <div class="btn-row">
        <button class="btn btn-gold" type="submit">Räkna paper-plan</button>
        <button class="btn btn-ghost" type="button" data-action="robot-clear">Rensa</button>
      </div>
    </form>
    <div id="robot-out">${renderRobotResult()}</div>
  `;
}

function render() {
  const { view, id } = parseRoute();
  let inner = '';
  if (view === 'verksamhet') inner = renderProject(id);
  else if (view === 'kalkyl') inner = renderKalkyl();
  else if (view === 'synergier') inner = renderSynergier();
  else if (view === 'robot') inner = renderRobot();
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
    typ: String(fd.get('typ') || 'kapital'),
    plats: String(fd.get('plats') || '').trim(),
    status: String(fd.get('status') || 'utredning'),
    yta_m2: 0,
    budget_sek: Number(fd.get('budget_sek')) || 0,
    kostnad_sek: Number(fd.get('kostnad_sek')) || 0,
    start: String(fd.get('start') || ''),
    slut: String(fd.get('slut') || ''),
    besättning: 0,
    kompetens: parseList(fd.get('kompetens')),
    leverantörer: parseList(fd.get('leverantörer')),
    material: parseList(fd.get('material')),
    anteckningar: String(fd.get('anteckningar') || ''),
  };
}

function readRobotForm(form) {
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
    if (confirm('Återställ klustret till de fyra verksamheterna? Egna ändringar raderas.')) {
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
  } else if (action === 'robot-clear') {
    robotDraft = {
      instrument: '',
      side: 'köp',
      entry: '',
      risk: '',
      riskMode: 'pris',
      rr: '2',
      atr: '',
      current: '',
      riskSek: '',
    };
    robotResult = null;
    saveRobotDraft(robotDraft);
    render();
  }
});

root.addEventListener('change', (ev) => {
  const sel = ev.target.closest('[data-action="select-project"]');
  if (!sel) return;
  state.selectedId = sel.value;
  persist();
  go(`#/verksamhet/${encodeURIComponent(sel.value)}`);
});

root.addEventListener('submit', (ev) => {
  const form = ev.target.closest('#project-form');
  if (form) {
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
    go(`#/verksamhet/${encodeURIComponent(project.id)}`);
    return;
  }
  const robotForm = ev.target.closest('#robot-form');
  if (robotForm) {
    ev.preventDefault();
    robotDraft = readRobotForm(robotForm);
    saveRobotDraft(robotDraft);
    robotResult = computeRobot(robotDraft);
    render();
  }
});

window.addEventListener('hashchange', render);
if (!window.location.hash) window.location.hash = '#/portfolj';
render();
