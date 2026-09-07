/**
 * Nyhetssele — paper news harness.
 * Binds weekday-morning remmar (RECEPT.md). Never invents oil/gold. Never sends mail.
 */

export const NYHETSSELE_STORAGE_KEY = 'dirigentverket.nyhetssele.v1';
export const NYHETSSELE_SOURCES = ['SVT', 'DI', 'Avanza', 'Nordnet', 'Baha', 'MFN', 'IPO'];
export const CAN_SEND_LIVE = false;
export const RECEPT_PATH = 'marknad/RECEPT.md';

function str(v) {
  return String(v ?? '').trim();
}

function parseBool(v, fallback) {
  if (v === true || v === 'true' || v === '1' || v === 1) return true;
  if (v === false || v === 'false' || v === '0' || v === 0) return false;
  return fallback;
}

function parseList(raw) {
  if (Array.isArray(raw)) return raw.map(str).filter(Boolean);
  return str(raw)
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function canonicalizeSources(list) {
  const known = [];
  const unknown = [];
  for (const token of list) {
    const hit = NYHETSSELE_SOURCES.find((k) => k.toLowerCase() === token.toLowerCase());
    if (hit) {
      if (!known.includes(hit)) known.push(hit);
    } else {
      unknown.push(token);
    }
  }
  return { known, unknown };
}

/** Keep oil/gold as typed text. Empty stays empty — never a price. */
function keepQuote(v) {
  return str(v);
}

export function emptyNyhetssele() {
  return {
    date: '',
    subject: '',
    sources: '',
    oil: '',
    gold: '',
    provaForst: true,
    disclaimer: '',
    filePath: '',
    namedYes: false,
    recipients: '',
    paper: true,
  };
}

export function createNyhetssele(raw = {}, tenant = {}) {
  const news = tenant.nyhetssele && typeof tenant.nyhetssele === 'object' ? tenant.nyhetssele : {};
  const parsed = canonicalizeSources(parseList(raw.sources));
  const recipients = parseList(raw.recipients);
  return {
    kind: 'nyhetssele',
    date: str(raw.date),
    subject: str(raw.subject),
    sources: parsed.known,
    unknownSources: parsed.unknown,
    oil: keepQuote(raw.oil),
    gold: keepQuote(raw.gold),
    provaForst: parseBool(raw.provaForst, true),
    disclaimer: str(raw.disclaimer ?? news.disclaimer),
    filePath: str(raw.filePath),
    namedYes: parseBool(raw.namedYes, false),
    recipients,
    paper: true,
    live: false,
    send: false,
    recept: RECEPT_PATH,
  };
}

/**
 * Validate remmar. oil/gold empty = saknas (ok). Never ready to send live.
 */
export function validateNyhetssele(raw = {}, tenant = {}) {
  const sele = createNyhetssele(raw, tenant);
  const missing = [];
  if (!sele.date) missing.push('date');
  if (!sele.subject) missing.push('subject');
  if (!sele.sources.length) missing.push('sources');
  if (!sele.disclaimer) missing.push('disclaimer');
  if (!sele.filePath) missing.push('filePath');
  if (!sele.oil) missing.push('oil');
  if (!sele.gold) missing.push('gold');
  if (!sele.namedYes) missing.push('namedYes');
  if (!sele.recipients.length) missing.push('recipients');

  const remmarOk = Boolean(sele.date && sele.subject && sele.sources.length && sele.disclaimer && sele.filePath);
  const namedReady = Boolean(sele.namedYes && sele.recipients.length);
  return {
    ok: remmarOk,
    paper: true,
    live: false,
    send: false,
    canSendLive: CAN_SEND_LIVE,
    namedReady,
    missing,
    saknas: missing,
    oil: sele.oil || 'saknas',
    gold: sele.gold || 'saknas',
    sele,
  };
}

function storeApi(store) {
  return store || globalThis.localStorage;
}

function readJson(store, key) {
  try {
    const raw = storeApi(store).getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function loadNyhetsseleDraft(store) {
  const parsed = readJson(store, NYHETSSELE_STORAGE_KEY);
  return { ...emptyNyhetssele(), ...(parsed || {}) };
}

export function saveNyhetsseleDraft(draft, store) {
  storeApi(store).setItem(NYHETSSELE_STORAGE_KEY, JSON.stringify({ ...emptyNyhetssele(), ...draft }));
}
