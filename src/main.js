import './style.css';
import { loadState, saveState, resetToSeed } from './store.js';
import { parseList } from './format.js';
import {
  computeRobot,
  loadRobotDraft,
  saveRobotDraft,
  emptyRobotDraft,
} from './robot.js';
import {
  renderShell,
  renderPortfolio,
  renderProject,
  renderForm,
  renderKalkyl,
  renderSynergier,
} from './cluster-ui.js';
import {
  renderArtificerShell,
  renderRobot,
  readRobotForm,
} from './robot-ui.js';

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

function ctx() {
  return { state, portfolioMode, persist, parseRoute };
}

function render() {
  const { view, id } = parseRoute();
  const c = ctx();
  let inner = '';
  if (view === 'verksamhet') inner = renderProject(id, c);
  else if (view === 'kalkyl') inner = renderKalkyl(c);
  else if (view === 'synergier') inner = renderSynergier(c);
  else if (view === 'robot') inner = renderRobot(robotDraft, robotResult);
  else if (view === 'nytt') inner = renderForm(null, c);
  else if (view === 'redigera') {
    const p = state.projects.find((x) => x.id === id);
    inner = p ? renderForm(p, c) : renderForm(null, c);
  } else inner = renderPortfolio(c);

  document.body.classList.toggle('view-artificer', view === 'robot');
  document.title = view === 'robot' ? 'Artificer AI — WATCHERS' : 'Dirigentverket — klusterbok';
  root.innerHTML = view === 'robot' ? renderArtificerShell(inner, parseRoute) : renderShell(inner, c);
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
    robotDraft = emptyRobotDraft();
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
