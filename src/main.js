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
