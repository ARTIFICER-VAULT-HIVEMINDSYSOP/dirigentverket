import './style.css';
import { loadState, saveState, resetToSeed } from './store.js';
import { parseList } from './format.js';
import {
  computeRobot,
  loadRobotDraft,
  saveRobotDraft,
  emptyRobotDraft,
  LIVE_LOCKED as ROBOT_LIVE_LOCKED,
} from './robot.js';
import { resolveWatchersSkin, applyWatchersChamber } from './tenant.js';
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
  computeRide,
  loadRideDraft,
  saveRideDraft,
  emptyRideDraft,
  saveRideTemplate,
  loadRideTemplate,
  emptyPlayState,
  playRails,
  reservedRiderKey,
  applyPlayDom,
  handleRiderKey,
  tempoToLens,
  HOP_WINDOW_MS,
  LIVE_LOCKED,
  hasCompletedFirstRide,
  markFirstRideComplete,
} from './rider.js';
import { renderRider, readRiderForm, focusRiderCore } from './rider-ui.js';
import {
  validateSele,
  loadSeleDraft,
  saveSeleDraft,
  emptySele,
} from './sele.js';
import { renderSele, readSeleForm } from './sele-ui.js';
import {
  validateNyhetssele,
  loadNyhetsseleDraft,
  saveNyhetsseleDraft,
  emptyNyhetssele,
} from './nyhetssele.js';
import { renderNyhetssele, readNyhetsseleForm } from './nyhetssele-ui.js';
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
let riderDraft = loadRideDraft();
let riderResult = null;
let riderHopPulse = 0;
let riderPlay = emptyPlayState();
let riderFirstHint = '';
let riderJustUnlocked = false;
let seleDraft = loadSeleDraft();
let seleResult = null;
let nyhetsseleDraft = loadNyhetsseleDraft();
let nyhetsseleResult = null;
let news = loadNews();
let tenant = {};

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
  else if (view === 'nyheter') {
    inner = renderNews(news, {
      selectedModuleId: id,
      nyhetsseleHtml: renderNyhetssele(nyhetsseleDraft, nyhetsseleResult),
    });
  }
  else if (view === 'robot') {
    inner = renderRobot(robotDraft, robotResult, {
      liveLocked: ROBOT_LIVE_LOCKED,
      tenant,
    });
  }
  else if (view === 'rider') {
    inner = renderRider(riderDraft, riderResult, riderHopPulse, riderPlay, {
      firstHint: riderFirstHint,
      liveLocked: LIVE_LOCKED,
      hasCompletedFirstRide: hasCompletedFirstRide(),
      justUnlocked: riderJustUnlocked,
    });
  }
  else if (view === 'sele') {
    inner = renderSele(seleDraft, seleResult, { liveLocked: LIVE_LOCKED });
  }
  else if (view === 'nytt') inner = renderForm(null, c);
  else if (view === 'redigera') {
    const p = state.projects.find((x) => x.id === id);
    inner = p ? renderForm(p, c) : renderForm(null, c);
  } else inner = renderPortfolio(c);

  document.body.classList.toggle('view-artificer', view === 'robot');
  document.body.classList.toggle('view-rider', view === 'rider');
  document.body.classList.toggle('view-sele', view === 'sele');
  if (view === 'robot') {
    applyWatchersChamber(document.documentElement, resolveWatchersSkin(tenant).chamber);
  } else {
    applyWatchersChamber(document.documentElement, '');
  }
  document.title =
    view === 'rider'
      ? 'Trade Rider — paper'
      : view === 'sele'
        ? 'Pilotsele — paper'
        : view === 'robot'
          ? 'Artificer AI — WATCHERS'
          : 'Dirigentverket — klusterbok';
  root.innerHTML =
    view === 'robot' || view === 'rider' || view === 'sele'
      ? renderArtificerShell(inner, parseRoute)
      : renderShell(inner, c);
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
  } else if (action === 'nyhetssele-clear') {
    nyhetsseleDraft = emptyNyhetssele();
    nyhetsseleResult = null;
    saveNyhetsseleDraft(nyhetsseleDraft);
    render();
  } else if (action === 'sele-clear') {
    seleDraft = emptySele();
    seleResult = null;
    saveSeleDraft(seleDraft);
    render();
  } else if (action === 'rider-clear') {
    riderDraft = emptyRideDraft();
    riderResult = null;
    riderHopPulse = 0;
    riderPlay = emptyPlayState();
    riderFirstHint = '';
    saveRideDraft(riderDraft);
    render();
  } else if (action === 'rider-first') {
    const form = document.getElementById('rider-form');
    if (form) riderDraft = readRiderForm(form);
    saveRideDraft(riderDraft);
    const name = focusRiderCore(riderDraft);
    riderFirstHint = name ? `Kärnan: fyll ${name}. Inga påhittade tal.` : '';
    render();
    focusRiderCore(riderDraft);
  } else if (action === 'rider-live-ask') {
    window.confirm('Live-order är låst. Paper. ÖB godkänner live. Detta stannar paper.');
    riderPlay = { ...riderPlay, robbanOpen: true };
    render();
  } else if (action === 'rider-save-tpl') {
    const form = document.getElementById('rider-form');
    if (form) riderDraft = readRiderForm(form);
    saveRideDraft(riderDraft);
    saveRideTemplate(riderDraft.tillgang, riderDraft);
    render();
  } else if (action === 'rider-load-tpl') {
    const form = document.getElementById('rider-form');
    const tillgang = form ? readRiderForm(form).tillgang : riderDraft.tillgang;
    riderDraft = loadRideTemplate(tillgang);
    riderResult = null;
    riderHopPulse = 0;
    saveRideDraft(riderDraft);
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
  if (sel) {
    state.selectedId = sel.value;
    persist();
    go(`#/verksamhet/${encodeURIComponent(sel.value)}`);
    return;
  }
  const tillgangSel = ev.target.closest('#rider-form [name="tillgang"]');
  if (tillgangSel) {
    const form = tillgangSel.closest('#rider-form');
    if (form) {
      riderDraft = readRiderForm(form);
      saveRideDraft(riderDraft);
      render();
    }
  }
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
  const nyhetsForm = ev.target.closest('#nyhetssele-form');
  if (nyhetsForm) {
    ev.preventDefault();
    nyhetsseleDraft = readNyhetsseleForm(nyhetsForm);
    saveNyhetsseleDraft(nyhetsseleDraft);
    nyhetsseleResult = validateNyhetssele(nyhetsseleDraft);
    render();
    return;
  }
  const seleForm = ev.target.closest('#sele-form');
  if (seleForm) {
    ev.preventDefault();
    seleDraft = readSeleForm(seleForm);
    saveSeleDraft(seleDraft);
    seleResult = validateSele(seleDraft);
    render();
    return;
  }
  const riderForm = ev.target.closest('#rider-form');
  if (riderForm) {
    ev.preventDefault();
    riderDraft = readRiderForm(riderForm);
    saveRideDraft(riderDraft);
    const now = Date.now();
    const midAir = riderPlay.hopping && now < riderPlay.hopUntil;
    riderResult = computeRide({ ...riderDraft, midAir });
    if (riderResult.ok) {
      const wasDone = hasCompletedFirstRide();
      markFirstRideComplete();
      if (!wasDone) riderJustUnlocked = true;
    }
    if (riderResult.ok && riderResult.havstang) {
      riderPlay = { ...riderPlay, leverage: riderResult.havstang };
    }
    const lens = tempoToLens(riderDraft.tempo);
    if (lens != null) riderPlay = { ...riderPlay, lens };
    if (riderResult.ok && riderResult.jump && riderResult.jump.jumped && !midAir) {
      riderHopPulse += 1;
      riderPlay = { ...riderPlay, hopping: true, hopUntil: now + HOP_WINDOW_MS };
      window.setTimeout(() => {
        riderPlay = { ...riderPlay, hopping: false, hopUntil: 0 };
      }, HOP_WINDOW_MS);
    } else {
      riderHopPulse = 0;
    }
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

function riderTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

window.addEventListener(
  'keydown',
  (ev) => {
    if (parseRoute().view !== 'rider') return;
    if (!reservedRiderKey(ev.key)) return;
    const inRobban = Boolean(ev.target && ev.target.closest && ev.target.closest('#rider-robban'));
    if (riderTypingTarget(ev.target) && !inRobban) return;
    ev.preventDefault();
    ev.stopPropagation();
    const rails = playRails(riderResult);
    const key = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    riderPlay = handleRiderKey(riderPlay, rails, ev.key);
    applyPlayDom(riderPlay, rails, document, {
      draft: riderDraft,
      hasCompletedFirstRide: hasCompletedFirstRide(),
    });
  },
  true,
);

window.addEventListener('hashchange', render);
if (!window.location.hash) window.location.hash = '#/portfolj';
render();

fetch('./tenant.json', { cache: 'no-store' })
  .then((r) => (r.ok ? r.json() : null))
  .then((t) => {
    if (!t || typeof t !== 'object') return;
    tenant = t;
    render();
  })
  .catch(() => {});
