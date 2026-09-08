/**
 * Trade Rider — paper arena only.
 * Computes SL/TP from entry + maxFel + RR. Never fetches quotes. Never places orders.
 * Optional grav / övre / coast stay empty honestly; they are not invent-filled.
 */

import { formatPx, structureSignal } from './robot.js';

export { formatPx };

export const TILLGANGAR = ['ROBOT', 'AIIND', 'GULDR'];
export const RIDER_DRAFT_KEY = 'dirigentverket.rider.v1';
export const RIDER_TEMPLATE_KEY = 'dirigentverket.rider.templates.v1';
export const RIDER_FIRST_RIDE_KEY = 'dirigentverket.rider.hasCompletedFirstRide';
export const HOP_WINDOW_MS = 2000;
export const LEVERAGE_MIN = 1;
export const LEVERAGE_MAX = 4;
export const LENS_STEPS = [1, 1.5, 2];
export const COAST_PERIOD_MS = 1600;
export const LIVE_LOCKED = true;
/** Nameless dry-run slots. Not prices — empty cells stay empty. */
export const DRY_RUN_SLOTS = 3;

const TEMPLATE_FIELDS = [
  'side',
  'pilotVolume',
  'entry',
  'maxFel',
  'rr',
  'grav',
  'requested',
  'current',
  'rsi',
  'bbLower',
  'bbUpper',
  'bounce',
  'ovre',
  'undre',
  'coast',
  'havstang',
  'cluster',
  'tempo',
];

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

export function clampLeverage(v) {
  const n = num(v);
  if (n === null) return 1;
  return Math.min(LEVERAGE_MAX, Math.max(LEVERAGE_MIN, Math.round(n)));
}

/** HUD factor must equal motion factor. 4× is four times 1×. Never 100×. */
export function leverageSpeed(lev) {
  return clampLeverage(lev);
}

/** Coast scan period. 4× is one quarter of 1×. Hop window stays HOP_WINDOW_MS. */
export function coastPeriodMs(lev) {
  return COAST_PERIOD_MS / leverageSpeed(lev);
}

export function parseRideInput(raw) {
  return {
    tillgang: normalizeTillgang(raw.tillgang),
    side: raw.side === 'sälj' ? 'sälj' : 'köp',
    pilotVolume: num(raw.pilotVolume),
    entry: num(raw.entry),
    maxFel: num(raw.maxFel),
    rr: num(raw.rr),
    grav: num(raw.grav),
    requested: num(raw.requested),
    current: num(raw.current),
    rsi: num(raw.rsi),
    bbLower: num(raw.bbLower),
    bbUpper: num(raw.bbUpper),
    bounce: raw.bounce,
    ovre: parsePriceList(raw.ovre),
    undre: parsePriceList(raw.undre),
    coast: num(raw.coast),
    havstang: clampLeverage(raw.havstang),
    cluster: String(raw.cluster || '').trim(),
    tempo: String(raw.tempo || '').trim(),
    midAir: Boolean(raw.midAir),
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

function stampHorizon(lines, label) {
  lines.prices = lines.map((l) => l.at);
  lines.label = label;
  return lines;
}

/**
 * Paper horizon. Empty övre + typed grav → [grav], «en paper-linje · grav».
 * Empty övre + empty grav → entry as sole paper-trendlinje (first ride).
 */
export function rideHorizon(input) {
  const ovre = input.ovre || [];
  const undre = input.undre || [];
  if (ovre.length || undre.length) {
    const lines = [
      ...undre.map((at) => ({ kind: 'paper-trendlinje', at, band: 'undre' })),
      ...ovre.map((at) => ({ kind: 'paper-trendlinje', at, band: 'övre' })),
    ];
    return stampHorizon(lines, 'ifyllda linjer');
  }
  if (input.grav !== null) {
    return stampHorizon([{ kind: 'paper-trendlinje', at: input.grav, band: 'grav' }], 'en paper-linje · grav');
  }
  if (input.entry !== null && input.entry > 0) {
    return stampHorizon([{ kind: 'paper-trendlinje', at: input.entry }], 'paper-trendlinje');
  }
  return stampHorizon([], '');
}

/**
 * Hop only on band+bounce (structure.trail). Same window every time.
 * Mid-air refuses a stolen second hop. Never invent RSI/BB.
 */
export function rideJump(input, grav, structure) {
  const hold = {
    jumped: false,
    from: grav,
    to: grav,
    windowMs: HOP_WINDOW_MS,
    tell: false,
  };
  if (input.midAir) {
    return { ...hold, stolen: false, reason: 'mid-air' };
  }
  if (!structure || !structure.trail || !structure.band) {
    return hold;
  }
  const to = structure.band === 'övre' ? input.bbUpper : structure.band === 'nedre' ? input.bbLower : null;
  if (to === null) return hold;
  return {
    jumped: true,
    from: grav,
    to,
    windowMs: HOP_WINDOW_MS,
    tell: true,
    band: structure.band,
  };
}

function rideStructure(input) {
  const s = structureSignal({
    rsi: input.rsi,
    bbLower: input.bbLower,
    bbUpper: input.bbUpper,
    bounce: input.bounce,
    current: input.current,
    side: input.side,
  });
  return {
    ...s,
    rsi: input.rsi,
    bbLower: input.bbLower,
    bbUpper: input.bbUpper,
  };
}

/**
 * First ride needs entry + maxFel + RR for SL/TP.
 * grav empty → sit at entry. övre empty → horizon from grav or entry.
 * coast / hävstång empty stay muted. RSI/BB never invented.
 */
export function computeRide(raw) {
  const input = parseRideInput(raw);
  const required = missingRequired(input);
  const saknar_sl_tp = required.length > 0;
  const levels = rideLevels(input);
  const structure = rideStructure(input);

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
      horizon: stampHorizon([], ''),
      coast: null,
      havstang: input.havstang,
      jump: { jumped: false, from: null, to: null, windowMs: HOP_WINDOW_MS, tell: false },
      tillgang: input.tillgang,
      pilotVolume: inheritPilotVolume(input.pilotVolume, null),
      input,
      structure,
    });
  }

  const grav = input.grav !== null ? input.grav : input.entry;
  const horizon = rideHorizon(input);
  const jump = rideJump(input, grav, structure);
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
    havstang: input.havstang,
    jump,
    tillgang: input.tillgang,
    pilotVolume: inheritPilotVolume(input.pilotVolume, null),
    input,
    structure,
  });
}

/**
 * Pilot volume is never invented. Robot may inherit or cut, never raise.
 * Empty stays empty.
 */
export function inheritPilotVolume(pilot, proposed) {
  if (pilot === null || pilot === undefined) return null;
  if (proposed === null || proposed === undefined) return pilot;
  const guess = Number(proposed);
  if (!Number.isFinite(guess)) return pilot;
  return guess > pilot ? pilot : guess;
}

/**
 * First successful paper ride unlocks «små belopp» hint mode.
 * LIVE_LOCKED stays true either way.
 */
export function hasCompletedFirstRide(store) {
  try {
    const raw = storeApi(store).getItem(RIDER_FIRST_RIDE_KEY);
    return raw === 'true' || raw === '1';
  } catch {
    return false;
  }
}

export function markFirstRideComplete(store) {
  try {
    storeApi(store).setItem(RIDER_FIRST_RIDE_KEY, 'true');
    return true;
  } catch {
    return false;
  }
}

export function smaBeloppUnlocked(store) {
  return hasCompletedFirstRide(store);
}

export function smaBeloppHint(store) {
  if (!smaBeloppUnlocked(store)) {
    return { unlocked: false, mode: '', note: '' };
  }
  return {
    unlocked: true,
    mode: 'sma-belopp',
    note: 'Små belopp · risken stannar. Pilotvolym får vara liten. Robot höjer aldrig. Paper.',
  };
}

export const RIDER_IMPULSE_NOTE =
  'Process före fart. Impulse syns mjukt. Tomma rutor fylls inte.';

/**
 * Gentle impulse: process before speed. No invented prices.
 * Visible when leverage >1× or volume exists but kärna/SL+TP is still missing —
 * before and after Räkna. Empty cells stay empty.
 */
export function rideImpulse(raw = {}, play = {}, opts = {}) {
  const input = parseRideInput(raw);
  const missing = missingRequired(input);
  const processMissing = missing.length > 0 || coreIncomplete(raw);
  const lev = clampLeverage(play.leverage ?? input.havstang ?? 1);
  const volumeBeforeProcess = input.pilotVolume !== null && processMissing;
  const speedBeforeProcess = lev > 1 && processMissing;
  const visible = Boolean(volumeBeforeProcess || speedBeforeProcess);
  let kind = '';
  if (speedBeforeProcess) kind = 'fart';
  else if (volumeBeforeProcess) kind = 'volym';
  return {
    visible,
    kind,
    note: visible ? RIDER_IMPULSE_NOTE : '',
  };
}

/** Keep the soft impulse strip in sync when leverage/volume changes without a full render. */
export function applyImpulseDom(impulse, root = globalThis.document) {
  if (!root) return impulse;
  const stage = root.querySelector('[data-impulse]');
  if (stage) {
    stage.dataset.impulse = impulse.visible ? '1' : '0';
    stage.classList.toggle('has-impulse', Boolean(impulse.visible));
  }
  const el = root.querySelector('[data-rider-impulse]');
  if (el) {
    if (impulse.visible) el.removeAttribute('hidden');
    else el.setAttribute('hidden', '');
    const note = el.querySelector('[data-rider-impulse-note]');
    if (note) note.textContent = impulse.note || '';
  }
  return impulse;
}

export function emptyRideDraft() {
  return {
    tillgang: 'ROBOT',
    side: 'köp',
    pilotVolume: '',
    entry: '',
    maxFel: '',
    rr: '',
    grav: '',
    requested: '',
    current: '',
    rsi: '',
    bbLower: '',
    bbUpper: '',
    bounce: 'nej',
    ovre: '',
    undre: '',
    coast: '',
    havstang: '',
    cluster: '',
    tempo: '',
  };
}

export function coreIncomplete(draft) {
  const filled = (k) => String(draft?.[k] ?? '').trim() !== '';
  return !filled('pilotVolume') || !filled('entry') || !filled('maxFel') || !filled('rr') || !filled('grav');
}

export function firstEmptyCoreName(draft) {
  for (const name of ['pilotVolume', 'entry', 'maxFel', 'rr', 'grav']) {
    if (String(draft?.[name] ?? '').trim() === '') return name;
  }
  return null;
}

export function emptyPlayState() {
  return {
    rail: 0,
    sit: 0,
    leverage: 1,
    lens: 1,
    hopping: false,
    hopUntil: 0,
    robbanOpen: false,
  };
}

export function rideRails(ride) {
  const prices = new Set();
  if (ride && ride.ok) {
    for (const p of ride.horizon?.prices || []) prices.add(p);
    if (ride.grav != null) prices.add(ride.grav);
  }
  return [...prices].sort((a, b) => a - b);
}

/**
 * Play rails: real prices after a successful ride, nameless slots before Räkna.
 * Dry-run never invents kronor or quotes.
 */
export function dryRunRails() {
  return Array.from({ length: DRY_RUN_SLOTS }, () => '');
}

export function playRails(ride) {
  if (ride && ride.ok) return rideRails(ride);
  return dryRunRails();
}

/** Vertical tops for nameless dry-run slots. Index 0 sits low; W steps up. */
export function dryRunSlotTop(index) {
  const i = Math.min(DRY_RUN_SLOTS - 1, Math.max(0, Number(index) || 0));
  return 78 - i * 24;
}

export function commitRail(play, rails, dir) {
  if (!rails.length) return { ...play };
  const next = Math.min(rails.length - 1, Math.max(0, (play.rail || 0) + dir));
  return { ...play, rail: next };
}

export function commitFollow(play) {
  return { ...play, sit: play.rail };
}

export function commitLeverage(play, delta) {
  return { ...play, leverage: clampLeverage((play.leverage || 1) + delta) };
}

export function cycleLens(play) {
  const i = LENS_STEPS.indexOf(play.lens);
  const next = LENS_STEPS[(i < 0 ? 0 : i + 1) % LENS_STEPS.length];
  return { ...play, lens: next };
}

export function reservedRiderKey(key) {
  const k = String(key).length === 1 ? String(key).toLowerCase() : String(key);
  return k === 'w' || k === 's' || k === 'f' || k === '[' || k === ']' || k === ' ' || k === 'Spacebar';
}

/** Tempo is lens only. Unknown / empty → null (do not invent a fill or RR). */
export function tempoToLens(tempo) {
  const n = num(String(tempo || '').replace(',', '.'));
  if (n === 1 || n === 1.5 || n === 2) return n;
  return null;
}

/**
 * One key → new play state. Synchronous. No timers, no rail delay.
 * Space is lens, never fill.
 */
export function handleRiderKey(play, rails, key) {
  const k = String(key).length === 1 ? String(key).toLowerCase() : String(key);
  if (k === 'w') return { ...commitRail(play, rails, 1), commit: 'rail' };
  if (k === 's') return { ...commitRail(play, rails, -1), commit: 'rail' };
  if (k === 'f') return { ...commitFollow(play), commit: 'follow' };
  if (k === '[') return { ...commitLeverage(play, -1), commit: 'leverage' };
  if (k === ']') return { ...commitLeverage(play, 1), commit: 'leverage' };
  if (k === ' ' || k === 'Spacebar') return { ...cycleLens(play), commit: 'lens' };
  return { ...play, commit: '' };
}

export function applyPlayDom(play, rails, root = globalThis.document, ctx = {}) {
  if (!root) return play;
  if (ctx && ctx.draft) {
    applyImpulseDom(
      rideImpulse(ctx.draft, play, { hasCompletedFirstRide: ctx.hasCompletedFirstRide }),
      root,
    );
  }
  const host = root.querySelector('[data-rider-play]');
  if (!host) return play;
  const speed = leverageSpeed(play.leverage);
  host.dataset.rail = String(play.rail);
  host.dataset.sit = String(play.sit);
  host.dataset.leverage = String(play.leverage);
  host.dataset.speed = String(speed);
  host.dataset.lens = String(play.lens);
  host.style.setProperty('--rider-speed', String(speed));
  host.style.setProperty('--rider-lens', String(play.lens));
  host.style.setProperty('--rider-coast-ms', `${coastPeriodMs(play.leverage)}ms`);
  const levHud = host.querySelector('[data-rider-leverage-hud]');
  if (levHud) levHud.textContent = `${play.leverage}×`;
  const speedHud = host.querySelector('[data-rider-speed-hud]');
  if (speedHud) speedHud.textContent = `${speed}×`;
  const railHud = host.querySelector('[data-rider-rail-hud]');
  const railPrice = rails[play.rail];
  if (railHud) railHud.textContent = railPrice !== '' && railPrice != null ? String(railPrice) : '';
  const levSil = host.querySelector('[data-rider-lev-sil]');
  if (levSil) levSil.dataset.lev = String(play.leverage);
  host.querySelectorAll('[data-lev-bar]').forEach((el) => {
    const n = Number(el.getAttribute('data-lev-bar'));
    el.classList.toggle('is-on', n <= play.leverage);
  });
  host.querySelectorAll('[data-rail-sil]').forEach((el) => {
    const idx = Number(el.getAttribute('data-rail-sil'));
    el.classList.toggle('is-rail', idx === play.rail);
    el.classList.toggle('is-sit', idx === play.sit);
  });
  const marks = host.querySelectorAll('[data-rail-index]');
  marks.forEach((el) => {
    const idx = Number(el.getAttribute('data-rail-index'));
    el.classList.toggle('is-rail', idx === play.rail);
    el.classList.toggle('is-sit', idx === play.sit);
    el.classList.remove('is-commit');
  });
  if (play.commit === 'rail' || play.commit === 'follow') {
    const active = host.querySelector(`[data-rail-index="${play.rail}"]`);
    if (active) {
      void active.offsetWidth;
      active.classList.add('is-commit');
    }
  }
  const sitIdx = play.sit ?? play.rail;
  const price = rails[sitIdx] ?? rails[play.rail];
  const dot = host.querySelector('[data-rider-dot]');
  const mark =
    host.querySelector(`[data-rail-index="${sitIdx}"]`) ||
    (price !== '' && price != null ? host.querySelector(`[data-rail-price="${price}"]`) : null);
  if (dot && mark) {
    dot.style.transition = 'none';
    dot.style.top = mark.style.top || mark.getAttribute('data-top') || '';
  }
  const field = host.querySelector('[data-rider-field]');
  if (field) field.style.transform = `scale(${play.lens || 1})`;
  return play;
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
