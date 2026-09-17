/** Verktygslåda helpers — paper. Empty cell = saknas. Never invent kronor, names, or counts. */

export const CRYSTAL_STORE_KEY = 'dirigentverket.crystalHud.v1';
export const LIVE_LAMP_ON = false;
export const DEFAULT_DESK = 'daniel';

export const CALENDAR_URL = 'https://calendar.google.com/calendar/u/0/r';
export const JAMFORELSE_PATH = '/utskick/kundjamforelse-verktyg.html';
export const DEPOSITION_PATH = '/utskick/deposition-mall.html';
export const KAMPANJ_STATUS_PATH = '/utskick/kampanj-status.json';
export const MAGASIN_JSON_PATH = '/magasin.json';
export const ONLINEKUNDER_PATH = '/api/onlinekunder';
export const MAGASIN_KOMMENTAR_PATH = '/api/kommentar';
export const MAGASIN_TOUCH_PATH = '/api/touch';
export const DEFAULT_FORCEX_URL = 'https://crm1.forcex.software';

export const PARK_ACTIONS = Object.freeze([
  { id: 'NA', label: 'NA', kind: 'NA' },
  { id: 'VM', label: 'VM', kind: 'VM' },
  { id: 'RECOVERY', label: 'Recovery', kind: 'RECOVERY' },
  { id: 'BOOKED', label: 'Bokat', kind: 'BOOKED' },
]);

const SECRET_KEYS = /token|secret|password|cookie|authorization|pat|apikey|api_key|sessionid/i;

export function emptyLabel(value, fallback = 'saknas') {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number' && !Number.isFinite(value)) return fallback;
  const s = String(value).trim();
  return s ? s : fallback;
}

export function countOrSaknas(value) {
  if (value === null || value === undefined || value === '') return 'saknas';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 'saknas';
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 'saknas';
}

export function publicPath(path) {
  const raw = String(path || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw) || raw.startsWith('mailto:')) return raw;
  return raw.startsWith('/') ? raw : `/${raw.replace(/^\.\//, '')}`;
}

export function toolboxBrand(tenant) {
  const skin = tenant && typeof tenant === 'object' ? tenant.skin : null;
  const toolbox = tenant && typeof tenant === 'object' ? tenant.toolbox : null;
  const name = String((skin && skin.name) || (toolbox && toolbox.brand) || '').trim();
  return {
    name: name || 'Dirigentverket',
    desk: String((toolbox && toolbox.desk) || DEFAULT_DESK),
    lang: String((skin && skin.lang) || 'sv'),
  };
}

export function chipLinks(tenant) {
  const toolbox = tenant && typeof tenant === 'object' ? tenant.toolbox : null;
  const calendars = tenant && Array.isArray(tenant.calendars) ? tenant.calendars : [];
  const williamCal = String(
    (toolbox && toolbox.williamCalendarUrl) ||
      (calendars.find((c) => /william/i.test(String(c && (c.id || c.name || c.owner || '')))) || {})
        .url ||
      '',
  ).trim();
  return {
    calendar: {
      id: 'kalender',
      label: 'Kalender',
      href: String((toolbox && toolbox.calendarUrl) || CALENDAR_URL),
      title: 'Daniel kalender (öppnar Google Calendar)',
    },
    williamCalendar: williamCal
      ? {
          id: 'william-kalender',
          label: 'William kalender',
          href: williamCal,
          title: 'William kalender',
        }
      : null,
    jamforelse: {
      id: 'jamforelse',
      label: 'Jämförelse',
      href: publicPath((toolbox && toolbox.jamforelsePath) || JAMFORELSE_PATH),
      title: 'Kontotyps-jämförelse · North Brons/Silver/Guld',
    },
    deposition: {
      id: 'deposition',
      label: 'Deposition',
      href: publicPath((toolbox && toolbox.depositionPath) || DEPOSITION_PATH),
      title: 'Öppnar depositionsmall (utkast). Skickar inte.',
    },
    kampanj: {
      id: 'kampanj',
      label: 'Kampanj',
      href: publicPath((toolbox && toolbox.kampanjStatusPath) || KAMPANJ_STATUS_PATH),
      title: 'Mailkampanj-status. Skickar inte.',
    },
  };
}

export function forcexShortcut(tenant) {
  const crm = tenant && typeof tenant === 'object' ? tenant.crm : null;
  const url = String((crm && (crm.url || crm.baseUrl)) || DEFAULT_FORCEX_URL).trim();
  return {
    label: 'ForceX CRM',
    href: url || DEFAULT_FORCEX_URL,
    external: true,
  };
}

/** No secrets in UI. Presence only. */
export function forcexSessionHint(raw) {
  if (!raw || typeof raw !== 'object') {
    return { connected: false, label: 'saknas' };
  }
  const leaked = Object.keys(raw).filter((k) => SECRET_KEYS.test(k));
  const url = String(raw.url || raw.crmUrl || '').trim();
  const present = raw.present === true || raw.connected === true || raw.ok === true;
  if (present) {
    return {
      connected: true,
      label: 'session märkt · inga nycklar visas',
      leaked: leaked.length > 0,
    };
  }
  if (url) {
    return { connected: false, label: 'CRM-adress ifylld · session saknas', leaked: leaked.length > 0 };
  }
  return { connected: false, label: 'saknas', leaked: leaked.length > 0 };
}

export function magasinHealthFromPayload(payload, httpOk = false) {
  if (!httpOk || !payload || typeof payload !== 'object') {
    return { lamp: 'gul', label: 'saknas', wired: false, stub: 'koppla till magasin_server' };
  }
  const rows = Array.isArray(payload.rows) ? payload.rows : null;
  if (!rows) {
    return { lamp: 'gul', label: 'saknas', wired: true, stub: '' };
  }
  if (!rows.length) {
    return { lamp: 'gron', label: 'väntar kö', wired: true, stub: '' };
  }
  return { lamp: 'gron', label: 'kö kopplad', wired: true, stub: '' };
}

export function magasinSignals(view) {
  const cartridges = Array.isArray(view && view.cartridges) ? view.cartridges : [];
  const cocked = cartridges.find((c) => c.isCocked) || null;
  const lit = cartridges.find((c) => c.isLit) || null;
  const firing = cartridges.find((c) => c.isFiring) || null;
  const waiting = cartridges.filter((c) => c.inRing && c.status === 'väntar');
  const recovery = cartridges.filter((c) => c.status === 'recovery');
  const empty = !cartridges.length;
  return {
    nextId: cocked && cocked.id ? cocked.id : '',
    nextName: cocked && cocked.name ? cocked.name : 'saknas',
    litId: lit && lit.id ? lit.id : '',
    litName: lit && lit.name ? lit.name : '',
    firingId: firing && firing.id ? firing.id : '',
    firingName: firing && firing.name ? firing.name : '',
    waitLabel: empty ? 'saknas' : waiting.length ? `${waiting.length} väntar` : 'väntar kö',
    recoveryLabel: recovery.length ? `${recovery.length} recovery` : '',
    cap: (view && view.cap) || (empty ? 'saknas' : 'väntar kö'),
    empty,
    chips: [
      {
        id: 'cocked',
        label: 'Nästa',
        pulse: Boolean(cocked),
        text: cocked && cocked.name ? cocked.name : 'saknas',
      },
      {
        id: 'lit',
        label: 'Tänd',
        pulse: Boolean(lit),
        text: lit && lit.name ? lit.name : 'saknas',
      },
      {
        id: 'firing',
        label: 'Avfyrad',
        pulse: Boolean(firing),
        text: firing && firing.name ? firing.name : 'saknas',
      },
      {
        id: 'wait',
        label: 'Kö',
        pulse: waiting.length > 0,
        text: empty ? 'saknas' : waiting.length ? `${waiting.length} väntar` : 'väntar kö',
      },
    ],
  };
}

export function parkPayload(kind, extra = {}) {
  const k = String(kind || '').toUpperCase();
  if (k === 'BOOKED' || k === 'BOKAT' || k === 'BOOK') {
    const dag = String(extra.dag || '').trim();
    const tid = String(extra.tid || '').trim();
    return { park: null, dag, tid, outcome: true, kind: 'BOOKED' };
  }
  if (k === 'NA' || k === 'VM' || k === 'RECOVERY') {
    return { park: k, dag: '', tid: '', outcome: true, kind: k };
  }
  return null;
}

export function bookedNeedsTime(payload) {
  return Boolean(payload && payload.kind === 'BOOKED' && !payload.tid);
}

export function sanitizeOnlineCustomers(payload) {
  if (!payload || typeof payload !== 'object') {
    return { customers: [], label: 'saknas', wired: false };
  }
  const list = Array.isArray(payload.customers) ? payload.customers : [];
  const customers = [];
  for (const row of list) {
    if (!row || typeof row !== 'object') continue;
    const namn = String(row.namn || row.name || '').trim();
    const id = String(row.id || '').trim();
    if (!namn && !id) continue;
    customers.push({ id: id || 'saknas', namn: namn || 'saknas' });
  }
  if (!customers.length) {
    return { customers: [], label: 'saknas', wired: payload.ok === true };
  }
  return { customers, label: 'online', wired: true };
}

export function prBlockerPlaceholder(raw) {
  if (!raw || typeof raw !== 'object') {
    return { open: 'saknas', blockers: 'saknas' };
  }
  return {
    open: countOrSaknas(raw.open),
    blockers: countOrSaknas(raw.blockers),
  };
}

export function normalizeCampaign(row) {
  if (!row || typeof row !== 'object') {
    return {
      id: '',
      namn: 'saknas',
      status: 'saknas',
      sentBatches: 'saknas',
      blockedBatch: 'saknas',
      blocker: '',
      sent: 'saknas',
      clean: 'saknas',
      batches: 'saknas',
      subject: '',
      note: '',
      openRate: 'saknas',
    };
  }
  return {
    id: String(row.id || ''),
    namn: emptyLabel(row.namn),
    status: emptyLabel(row.status),
    sentBatches: emptyLabel(row.sentBatches),
    blockedBatch: emptyLabel(row.blockedBatch),
    blocker: String(row.blocker || '').trim(),
    sent: countOrSaknas(row.sent),
    clean: countOrSaknas(row.clean),
    batches: countOrSaknas(row.batches),
    subject: String(row.subject || '').trim(),
    note: String(row.note || '').trim(),
    drop: String(row.drop || '').trim(),
    openRate: 'saknas',
  };
}

export function campaignStatusView(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.campaigns) || !data.campaigns.length) {
    return { campaigns: [], label: 'saknas', paper: true, live: false };
  }
  return {
    campaigns: data.campaigns.map(normalizeCampaign),
    label: 'kampanjstatus',
    paper: data.paper !== false,
    live: false,
  };
}

export const LOCAL_SHORTCUTS = Object.freeze([
  { id: 'robot', href: '#/robot', namn: 'Artificer · SL/TP', kind: 'local' },
  { id: 'rider', href: '#/rider', namn: 'Trade Rider', kind: 'local' },
  { id: 'panel', href: '#/panel', namn: 'Panel / Älvor', kind: 'local' },
  { id: 'kalkyl', href: '#/kalkyl', namn: 'Kalkyl', kind: 'local' },
  { id: 'synergier', href: '#/synergier', namn: 'Synergier', kind: 'local' },
  { id: 'nyheter', href: '#/nyheter', namn: 'Nyheter', kind: 'local' },
]);

export const CLUSTER_SHORTCUTS = Object.freeze([
  { id: 'magasin', href: '/magasin.html', namn: 'Magasinet', kind: 'cluster' },
  { id: 'william', href: '/william.html', namn: 'William magasin', kind: 'cluster' },
  { id: 'jamforelse', href: JAMFORELSE_PATH, namn: 'Kontotyp / jämförelse', kind: 'cluster' },
]);

export const ROBBAN_CHECKLIST = Object.freeze([
  { id: 'sl', label: 'SL', hint: 'säkerhetsbälte' },
  { id: 'tp', label: 'TP', hint: 'flytväst' },
  { id: 'rr', label: 'RR', hint: 'hjälm · innan storlek' },
]);

export function emptyHudUiState() {
  return {
    expanded: false,
    drawer: '',
    x: null,
    y: null,
  };
}

export function loadHudUiState(storage) {
  const empty = emptyHudUiState();
  if (!storage) return empty;
  try {
    const raw = storage.getItem(CRYSTAL_STORE_KEY);
    if (!raw) return empty;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return empty;
    return {
      expanded: Boolean(data.expanded),
      drawer: String(data.drawer || ''),
      x: Number.isFinite(Number(data.x)) ? Number(data.x) : null,
      y: Number.isFinite(Number(data.y)) ? Number(data.y) : null,
    };
  } catch {
    return empty;
  }
}

export function saveHudUiState(storage, state) {
  if (!storage) return;
  try {
    storage.setItem(CRYSTAL_STORE_KEY, JSON.stringify({
      expanded: Boolean(state && state.expanded),
      drawer: String((state && state.drawer) || ''),
      x: state && Number.isFinite(Number(state.x)) ? Number(state.x) : null,
      y: state && Number.isFinite(Number(state.y)) ? Number(state.y) : null,
    }));
  } catch {
    /* ignore */
  }
}

export function overlayRoute(hash) {
  const raw = String(hash || '').replace(/^#/, '');
  const view = raw.split('/').filter(Boolean)[0] || '';
  return view === 'verktygslada' || view === 'panel';
}
