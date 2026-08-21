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
import {
  loadNews,
  saveNews,
  fetchRss,
  importRssItems,
  updateModuleUrl,
  addManualItem,
  attachCompliantImage,
} from './news.js';
import { renderNews } from './news-ui.js';

const root = document.getElementById('app-root');

let state = loadState();
let portfolioMode = 'cards';
let robotDraft = loadRobotDraft();
let robotResult = null;
let news = loadNews();

function persist() {
  saveState(state);
}

function persistNews() {
  saveNews(news);
}

function readNewsBild(form) {
  const fd = new FormData(form);
  return {
    kalla: String(fd.get('kalla') || '').trim(),
    credit: String(fd.get('credit') || '').trim(),
    license: String(fd.get('license') || '').trim(),
    src: String(fd.get('src') || '').trim(),
  };
}

function nearbyNewsUrl(btn, id) {
  const card = btn.closest('[data-module-id], .card');
  const input = (card && card.querySelector('[data-news-url], input[name="url"]'))
    || document.querySelector(`[data-news-url="${id}"]`);
  return input ? String(input.value || '').trim() : '';
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
  else if (view === 'nyheter') inner = renderNews(news, { selectedModuleId: id });
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
  } else if (action === 'news-save-url') {
    const nid = btn.getAttribute('data-id');
    updateModuleUrl(news, nid, nearbyNewsUrl(btn, nid));
    news.error = '';
    persistNews();
    render();
  } else if (action === 'news-fetch') {
    const nid = btn.getAttribute('data-id');
    const url = nearbyNewsUrl(btn, nid);
    updateModuleUrl(news, nid, url);
    persistNews();
    fetchRss(url).then((res) => {
      if (!res.ok) {
        news.error = res.error;
      } else {
        news.error = '';
        importRssItems(nid, res.items, news);
      }
      persistNews();
      render();
    });
  } else if (action === 'news-attach') {
    if (btn.type === 'submit') return;
    const form = btn.closest('form');
    const itemId = btn.getAttribute('data-id') || form?.dataset.itemId;
    if (!form || !itemId) return;
    const r = attachCompliantImage(itemId, readNewsBild(form), news);
    news.error = r.ok ? '' : r.error;
    persistNews();
    render();
  } else if (action === 'news-add') {
    if (btn.type === 'submit') return;
    const form = btn.closest('#news-manual-form') || document.getElementById('news-manual-form');
    if (!form) return;
    const fd = new FormData(form);
    const r = addManualItem(news, String(fd.get('moduleId') || ''), {
      title: String(fd.get('title') || ''),
      lead: String(fd.get('lead') || ''),
      link: String(fd.get('link') || ''),
    });
    news.error = r.ok ? '' : r.error;
    persistNews();
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
    return;
  }
  const manual = ev.target.closest('#news-manual-form');
  if (manual) {
    ev.preventDefault();
    const fd = new FormData(manual);
    const r = addManualItem(news, String(fd.get('moduleId') || ''), {
      title: String(fd.get('title') || ''),
      lead: String(fd.get('lead') || ''),
      link: String(fd.get('link') || ''),
    });
    news.error = r.ok ? '' : r.error;
    persistNews();
    render();
    return;
  }
  const bildForm = ev.target.closest('#news-bild-form, .news-bild-form');
  if (bildForm) {
    ev.preventDefault();
    const itemId = bildForm.dataset.itemId || String(new FormData(bildForm).get('itemId') || '');
    const r = attachCompliantImage(itemId, readNewsBild(bildForm), news);
    news.error = r.ok ? '' : r.error;
    persistNews();
    render();
  }
});

window.addEventListener('hashchange', render);
if (!window.location.hash) window.location.hash = '#/portfolj';
render();
