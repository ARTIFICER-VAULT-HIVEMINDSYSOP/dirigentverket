/**
 * Trade Rider — paper arena only.
 * Computes SL/TP from entry + maxFel + RR. Never fetches quotes. Never places orders.
 * Optional grav / övre / coast stay empty honestly; they are not invent-filled.
 */

import { formatPx } from './robot.js';

export { formatPx };

export const TILLGANGAR = ['ROBOT', 'AIIND', 'GULDR'];
export const RIDER_DRAFT_KEY = 'dirigentverket.rider.v1';
export const RIDER_TEMPLATE_KEY = 'dirigentverket.rider.templates.v1';

const TEMPLATE_FIELDS = ['side', 'entry', 'maxFel', 'rr', 'grav', 'ovre', 'coast', 'hopp'];

function num(v) {
  if (v === '' || v === null || v === undefined) return null;
  const x = Number(String(v).replace(',', '.').replace(/\s/g, ''));
  return Number.isFinite(x) ? x : null;
}

function paperStamp(obj) {
  return { ...obj, paper: true, live: false, advice: false };
}

export function normalizeTillgang(raw) {
  const s = String(raw || '').trim().toUpperCase();
  return TILLGANGAR.includes(s) ? s : 'ROBOT';
}

/** Parse typed prices. Empty text stays empty — no invented levels. */
export function parsePriceList(raw) {
  if (Array.isArray(raw)) {
    return raw.map(num).filter((x) => x !== null);
  }
  const text = String(raw || '').trim();
  if (!text) return [];
  return text
    .split(/[,;\s]+/)
    .map(num)
    .filter((x) => x !== null);
}

export function parseRideInput(raw) {
  return {
    tillgang: normalizeTillgang(raw.tillgang),
    side: raw.side === 'sälj' ? 'sälj' : 'köp',
    entry: num(raw.entry),
    maxFel: num(raw.maxFel),
    rr: num(raw.rr),
    grav: num(raw.grav),
    ovre: parsePriceList(raw.ovre),
    coast: num(raw.coast),
    hopp: num(raw.hopp),
  };
}

function missingRequired(input) {
  const keys = [];
  if (input.entry === null || input.entry <= 0) keys.push('entry');
  if (input.maxFel === null || input.maxFel <= 0) keys.push('maxFel');
  if (input.rr === null || input.rr <= 0) keys.push('rr');
  return keys;
}

export function rideLevels(input) {
  const { entry, maxFel, rr, side } = input;
  if (entry === null || entry <= 0 || maxFel === null || maxFel <= 0 || rr === null || rr <= 0) {
    return null;
  }
  const long = side !== 'sälj';
  const sl = long ? entry - maxFel : entry + maxFel;
  const tp = long ? entry + maxFel * rr : entry - maxFel * rr;
  return { sl, tp, dist: maxFel, rr, side, entry };
}

/**
 * Paper horizon. Empty övre is not a failure: entry is the sole paper-trendlinje.
 */
export function rideHorizon(input) {
  const entry = input.entry;
  if (entry === null || entry <= 0) return [];
  const lines = input.ovre && input.ovre.length ? input.ovre : [entry];
  return lines.map((at) => ({ kind: 'paper-trendlinje', at }));
}

/**
 * Hop only when the user typed a hopp that differs from sit (grav).
 * No hopp → hold. Never invent a jump.
 */
export function rideJump(input, grav) {
  const hopp = input.hopp;
  if (hopp === null || grav === null || hopp === grav) {
    return { jumped: false, from: grav, to: grav };
  }
  return { jumped: true, from: grav, to: hopp };
}

/**
 * First ride needs entry + maxFel + RR.
 * grav empty → sit at entry. övre empty → horizon = [entry].
 * coast empty stays null. RSI/BB are never invented or required.
 */
export function computeRide(raw) {
  const input = parseRideInput(raw);
  const required = missingRequired(input);
  const saknar_sl_tp = required.length > 0;
  const levels = rideLevels(input);
  const structure = { known: false, rsi: null, bbLower: null, bbUpper: null };

  if (saknar_sl_tp || !levels) {
    return paperStamp({
      ok: false,
      saknar_sl_tp: true,
      missing: ['saknar_sl_tp'],
      errors: ['saknar_sl_tp'],
      sl: null,
      tp: null,
      dist: null,
      rr: input.rr,
      grav: null,
      horizon: [],
      coast: null,
      jump: { jumped: false, from: null, to: null },
      tillgang: input.tillgang,
      input,
      structure,
    });
  }

  const grav = input.grav !== null ? input.grav : input.entry;
  const horizon = rideHorizon(input);
  const jump = rideJump(input, grav);
  const coast = input.coast;

  return paperStamp({
    ok: true,
    saknar_sl_tp: false,
    missing: [],
    errors: [],
    sl: levels.sl,
    tp: levels.tp,
    dist: levels.dist,
    rr: levels.rr,
    grav,
    horizon,
    coast,
    jump,
    tillgang: input.tillgang,
    input,
    structure,
  });
}

export function emptyRideDraft() {
  return {
    tillgang: 'ROBOT',
    side: 'köp',
    entry: '',
    maxFel: '',
    rr: '',
    grav: '',
    ovre: '',
    coast: '',
    hopp: '',
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

function writeJson(store, key, value) {
  storeApi(store).setItem(key, JSON.stringify(value));
}

export function loadRideDraft(store) {
  const parsed = readJson(store, RIDER_DRAFT_KEY);
  return { ...emptyRideDraft(), ...(parsed || {}) };
}

export function saveRideDraft(draft, store) {
  writeJson(store, RIDER_DRAFT_KEY, { ...emptyRideDraft(), ...draft });
}

function templatePayload(draft) {
  const out = {};
  for (const key of TEMPLATE_FIELDS) {
    const v = draft[key];
    out[key] = v === undefined || v === null ? '' : String(v);
  }
  return out;
}

export function loadRideTemplates(store) {
  const parsed = readJson(store, RIDER_TEMPLATE_KEY);
  return parsed && typeof parsed === 'object' ? parsed : {};
}

/**
 * Persist typed fields for one tillgång. Empty stays empty — never invent numbers.
 */
export function saveRideTemplate(tillgang, draft, store) {
  const key = normalizeTillgang(tillgang);
  const all = loadRideTemplates(store);
  all[key] = templatePayload(draft);
  writeJson(store, RIDER_TEMPLATE_KEY, all);
  return all[key];
}

/**
 * Load a saved template. Missing template or empty fields stay empty.
 */
export function loadRideTemplate(tillgang, store) {
  const key = normalizeTillgang(tillgang);
  const all = loadRideTemplates(store);
  const saved = all[key];
  if (!saved || typeof saved !== 'object') {
    return { ...emptyRideDraft(), tillgang: key };
  }
  return { ...emptyRideDraft(), tillgang: key, ...templatePayload(saved) };
}

export function hasRideTemplate(tillgang, store) {
  const key = normalizeTillgang(tillgang);
  const all = loadRideTemplates(store);
  return Boolean(all[key] && typeof all[key] === 'object');
}
