import {
  emptyHudState,
  fireOutcome,
  magazineView,
} from './contact-queue.js';
import { renderCrystalHud } from './verktygslada-ui.js';
import {
  DEFAULT_DESK,
  KAMPANJ_STATUS_PATH,
  LIVE_LAMP_ON,
  MAGASIN_JSON_PATH,
  MAGASIN_KOMMENTAR_PATH,
  ONLINEKUNDER_PATH,
  bookedNeedsTime,
  campaignStatusView,
  forcexSessionHint,
  loadHudUiState,
  magasinHealthFromPayload,
  magasinSignals,
  overlayRoute,
  parkPayload,
  prBlockerPlaceholder,
  sanitizeOnlineCustomers,
  saveHudUiState,
} from './verktygslada.js';

const HOST_ID = 'crystal-hud-host';

function tenantFromWindow() {
  return (typeof window !== 'undefined' && window.TENANT) || {};
}

async function fetchJson(url) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return { ok: false, status: res.status, data: null };
    const data = await res.json();
    return { ok: true, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

export function createCrystalController(opts = {}) {
  const storage = opts.storage || (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
  const ui = { ...loadHudUiState(storage) };
  if (opts.hash && overlayRoute(opts.hash)) ui.expanded = true;
  if (opts.expanded === true) ui.expanded = true;

  const state = {
    ui,
    tenant: opts.tenant || tenantFromWindow(),
    rows: [],
    hud: emptyHudState(),
    magasinWired: false,
    magasinHealth: magasinHealthFromPayload(null, false),
    magasinFlash: '',
    parkPulse: '',
    online: sanitizeOnlineCustomers(null),
    forcex: forcexSessionHint(opts.forcex || null),
    pr: prBlockerPlaceholder(opts.pr || null),
    campaign: campaignStatusView(null),
    live: LIVE_LAMP_ON,
  };

  function viewNow() {
    return magazineView(state.rows, state.hud, Date.now(), DEFAULT_DESK, 'queue');
  }

  function model() {
    const view = viewNow();
    return {
      expanded: state.ui.expanded,
      drawer: state.ui.drawer,
      x: state.ui.x,
      y: state.ui.y,
      tenant: state.tenant,
      live: state.live,
      parkPulse: state.parkPulse,
      magasin: {
        health: state.magasinHealth,
        signals: magasinSignals(view),
        view,
        wired: state.magasinWired,
        flash: state.magasinFlash,
      },
      online: state.online,
      forcex: state.forcex,
      pr: state.pr,
      campaign: state.campaign,
    };
  }

  function persist() {
    saveHudUiState(storage, state.ui);
  }

  return {
    state,
    model,
    persist,
    viewNow,
    setExpanded(on) {
      state.ui.expanded = Boolean(on);
      persist();
    },
    toggle() {
      state.ui.expanded = !state.ui.expanded;
      persist();
    },
    openKampanj() {
      state.ui.expanded = true;
      state.ui.drawer = state.ui.drawer === 'kampanj' ? '' : 'kampanj';
      persist();
    },
    setPos(x, y) {
      state.ui.x = x;
      state.ui.y = y;
      persist();
    },
    applyMagasin(payload, httpOk) {
      state.magasinHealth = magasinHealthFromPayload(payload, httpOk);
      state.magasinWired = Boolean(httpOk && payload && Array.isArray(payload.rows));
      state.rows = state.magasinWired ? payload.rows.filter((r) => r && typeof r === 'object') : [];
    },
    applyOnline(payload, httpOk) {
      state.online = sanitizeOnlineCustomers(httpOk ? payload : null);
    },
    applyCampaign(payload, httpOk) {
      state.campaign = campaignStatusView(httpOk ? payload : null);
    },
    applyForcex(raw) {
      state.forcex = forcexSessionHint(raw);
    },
    flash(msg) {
      state.magasinFlash = msg || '';
    },
    park(kind, extra) {
      const payload = parkPayload(kind, extra);
      if (!payload) {
        state.magasinFlash = 'saknar utfall';
        return { ok: false, payload: null };
      }
      if (bookedNeedsTime(payload)) {
        state.magasinFlash = 'saknar tid';
        return { ok: false, payload };
      }
      const view = viewNow();
      const id = view.focusId || view.cockedId || magasinSignals(view).nextId;
      if (!id) {
        state.magasinFlash = 'saknas';
        return { ok: false, payload };
      }
      fireOutcome(state.hud, state.rows, id, Date.now(), payload.kind === 'BOOKED' ? 'BOOK' : payload.park);
      state.parkPulse = payload.kind;
      state.magasinFlash = 'utfall lokalt · paper';
      return { ok: true, payload, id };
    },
  };
}

async function postMagasin(path, body) {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    return { ok: Boolean(res.ok && data && data.ok !== false), data };
  } catch {
    return { ok: false, data: null };
  }
}

export function mountVerktygslada(opts = {}) {
  if (typeof document === 'undefined') return null;
  const existing = document.getElementById(HOST_ID);
  if (existing && existing.dataset.mounted === '1' && !opts.force) {
    return existing.controller || null;
  }

  const host = existing || document.createElement('div');
  host.id = HOST_ID;
  host.dataset.mounted = '1';
  if (!existing) {
    const target = opts.target || document.body;
    target.appendChild(host);
  }

  const ctrl = createCrystalController({
    storage: opts.storage,
    tenant: opts.tenant || tenantFromWindow(),
    hash: typeof location !== 'undefined' ? location.hash : '',
    forcex: opts.forcex,
    pr: opts.pr,
    expanded: opts.expanded,
  });
  host.controller = ctrl;

  let drag = null;
  let pollTimer = 0;

  function paint() {
    host.innerHTML = renderCrystalHud(ctrl.model());
  }

  async function refreshMagasin() {
    const mag = await fetchJson(opts.magasinJson || MAGASIN_JSON_PATH);
    ctrl.applyMagasin(mag.data, mag.ok);
    if (!mag.ok) ctrl.flash(ctrl.state.magasinWired ? '' : 'koppla till magasin_server');
  }

  async function refreshOnline() {
    const online = await fetchJson(opts.onlinePath || ONLINEKUNDER_PATH);
    ctrl.applyOnline(online.data, online.ok);
  }

  async function refreshCampaign() {
    const camp = await fetchJson(opts.kampanjPath || KAMPANJ_STATUS_PATH);
    ctrl.applyCampaign(camp.data, camp.ok);
  }

  async function refreshAll() {
    await Promise.all([refreshMagasin(), refreshOnline(), refreshCampaign()]);
    const tenant = tenantFromWindow();
    ctrl.state.tenant = tenant;
    const crm = tenant && tenant.crm ? { url: tenant.crm.url || tenant.crm.baseUrl } : null;
    ctrl.applyForcex(opts.forcex || crm);
    paint();
  }

  async function onPark(kind, form) {
    const extra = {
      dag: form ? String(new FormData(form).get('dag') || '') : '',
      tid: form ? String(new FormData(form).get('tid') || '') : '',
    };
    const result = ctrl.park(kind, extra);
    paint();
    if (!result.ok) return;
    const body = {
      magasin: DEFAULT_DESK,
      id: result.id,
      park: result.payload.park,
      dag: result.payload.dag,
      tid: result.payload.tid,
      text: '',
      outcome: true,
    };
    const saved = await postMagasin(MAGASIN_KOMMENTAR_PATH, body);
    if (saved.ok) {
      ctrl.flash('utfall sparat · magasin_server');
      window.dispatchEvent(new CustomEvent('magasin:reload'));
      await refreshMagasin();
    } else {
      ctrl.flash('utfall lokalt · koppla till magasin_server');
    }
    paint();
  }

  host.addEventListener('click', (ev) => {
    const toggle = ev.target.closest('[data-action="crystal-toggle"]');
    if (toggle) {
      ev.preventDefault();
      ctrl.toggle();
      paint();
      return;
    }
    const kampanj = ev.target.closest('[data-action="crystal-kampanj"]');
    if (kampanj) {
      ev.preventDefault();
      ctrl.openKampanj();
      paint();
      refreshCampaign().then(paint);
      return;
    }
    const refresh = ev.target.closest('[data-action="crystal-kampanj-refresh"]');
    if (refresh) {
      ev.preventDefault();
      refreshCampaign().then(paint);
      return;
    }
    const parkBtn = ev.target.closest('[data-action="crystal-park"]');
    if (parkBtn) {
      ev.preventDefault();
      const form = parkBtn.closest('[data-crystal-park]');
      onPark(parkBtn.getAttribute('data-park'), form);
    }
  });

  host.addEventListener('pointerdown', (ev) => {
    const handle = ev.target.closest('[data-drag-handle]');
    if (!handle || ev.target.closest('button,a,input,label')) return;
    const hud = host.querySelector('[data-crystal-hud]');
    if (!hud) return;
    const rect = hud.getBoundingClientRect();
    drag = {
      dx: ev.clientX - rect.left,
      dy: ev.clientY - rect.top,
    };
    hud.setPointerCapture?.(ev.pointerId);
  });

  host.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    const x = Math.max(8, ev.clientX - drag.dx);
    const y = Math.max(8, ev.clientY - drag.dy);
    ctrl.setPos(x, y);
    const hud = host.querySelector('[data-crystal-hud]');
    if (hud) {
      hud.style.left = `${x}px`;
      hud.style.top = `${y}px`;
      hud.style.right = 'auto';
      hud.style.bottom = 'auto';
    }
  });

  host.addEventListener('pointerup', () => {
    drag = null;
  });

  document.addEventListener('click', (ev) => {
    const open = ev.target.closest('[data-action="crystal-open"]');
    if (!open) return;
    ev.preventDefault();
    ctrl.setExpanded(true);
    paint();
  });

  window.addEventListener('hashchange', () => {
    if (overlayRoute(location.hash)) {
      ctrl.setExpanded(true);
      paint();
    }
  });

  window.addEventListener('crystal-hud:open', () => {
    ctrl.setExpanded(true);
    paint();
  });

  paint();
  refreshAll();
  pollTimer = window.setInterval(refreshAll, 12000);

  ctrl.destroy = () => {
    window.clearInterval(pollTimer);
    host.remove();
  };

  return ctrl;
}

export default { mountVerktygslada, createCrystalController };
