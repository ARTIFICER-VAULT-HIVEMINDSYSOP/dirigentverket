/**
 * Trade Rider — paper arena only.
 * Computes SL/TP from entry + maxFel + RR. Never fetches quotes. Never places orders.
 * Optional grav / övre / coast stay empty honestly; they are not invent-filled.
 */

import { formatPx, structureSignal, seasonPlan } from './robot.js';
import { measureFrequency, parseMinFrequency, proposeMittHedge } from './hedge.js';

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
/** Soft band-fade both ways: giltig → saknas (out) and saknas → giltig (in). Feel, not a cut. */
export const HEDGE_FADE_MS = 1100;
/** One-shot mid-pip pulse after fade-in lands. Same 32-bit ease-out family. */
export const HEDGE_MID_PULSE_MS = 900;
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
  'prognos',
  'prognosRr',
  'hallaRr',
  'nastaSasong',
  'priceSeries',
  'minFrequency',
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
    prognos: String(raw.prognos || '').trim(),
    prognosRr: num(raw.prognosRr),
    hallaRr: num(raw.hallaRr),
    nastaSasong: String(raw.nastaSasong || '').trim(),
    priceSeries: raw.priceSeries,
    minFrequency: raw.minFrequency,
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

function emptyRideTrail(sl = null) {
  return {
    trailed: false,
    tell: false,
    sl,
    sl0: sl,
    from: sl,
    to: sl,
    note: '',
  };
}

/**
 * Structure trail: same Artificer lock (RSI + Bollinger + budstuds).
 * SL may only shrink. Never invents current/RSI/BB. No volume raise.
 */
export function rideTrail(input, levels, structure) {
  const sl0 = levels?.sl ?? null;
  const hold = emptyRideTrail(sl0);
  if (!levels || sl0 === null) return hold;
  if (!structure || !structure.trail) {
    return { ...hold, note: 'ingen trail — struktur saknas.' };
  }
  const current = input.current;
  if (current === null || current === undefined) {
    return { ...hold, note: 'aktuell kurs saknas.' };
  }
  const { dist, side, entry } = levels;
  if (dist === null || dist <= 0 || entry === null) return hold;
  const long = side !== 'sälj';
  if (long && current <= sl0) return { ...hold, note: 'vid initial SL.' };
  if (!long && current >= sl0) return { ...hold, note: 'vid initial SL.' };

  const openR = long ? (current - entry) / dist : (entry - current) / dist;
  let sl = sl0;
  if (openR > 0 && openR < 1) {
    sl = long ? sl0 + (entry - sl0) * openR : sl0 - (sl0 - entry) * openR;
  } else if (openR >= 1) {
    const lock = (openR - 1) * 0.5;
    sl = long ? entry + lock * dist : entry - lock * dist;
  }
  if (long) sl = Math.max(sl, sl0);
  else sl = Math.min(sl, sl0);

  const shrunk = long ? sl > sl0 : sl < sl0;
  if (!shrunk) {
    return { ...hold, note: 'struktur ja, SL ligger kvar.' };
  }
  return {
    trailed: true,
    tell: true,
    sl,
    sl0,
    from: sl0,
    to: sl,
    note: 'struktur-trail · SL krymper. Process före fart.',
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
      trail: emptyRideTrail(null),
      rokad: rideRokad(raw),
      hedge: rideHedge(raw),
      tillgang: input.tillgang,
      pilotVolume: inheritPilotVolume(input.pilotVolume, null),
      input,
      structure,
    });
  }

  const grav = input.grav !== null ? input.grav : input.entry;
  const horizon = rideHorizon(input);
  const jump = rideJump(input, grav, structure);
  const trail = rideTrail(input, levels, structure);
  const rokad = rideRokad(raw);
  const hedge = rideHedge(raw);
  const coast = input.coast;

  return paperStamp({
    ok: true,
    saknar_sl_tp: false,
    missing: [],
    errors: [],
    sl: trail.trailed ? trail.sl : levels.sl,
    sl0: levels.sl,
    tp: levels.tp,
    dist: levels.dist,
    rr: levels.rr,
    grav,
    horizon,
    coast,
    havstang: input.havstang,
    jump,
    trail,
    rokad,
    hedge,
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

export const RIDER_ROKAD_NOTE =
  'rokadläge: byt håll, volym −25 %. ÖB godkänner. Ingen order lagd.';
export const RIDER_ROKAD_GATE = 'ÖB godkänner. Paper. Ingen order.';

/** −25 % of pilot volume. Empty stays empty. Never raises. */
export function rokadVolume(pilot) {
  if (pilot === null || pilot === undefined) return null;
  const n = Number(pilot);
  if (!Number.isFinite(n) || n <= 0) return null;
  return inheritPilotVolume(n, n * 0.75);
}

export function emptyRideHedge() {
  return {
    tell: false,
    proposed: false,
    freqPip: false,
    freqProgress: false,
    freqNeed: null,
    freqHave: null,
    saknas: true,
    saknasKind: 'serie',
    mode: null,
    entry: null,
    count: null,
    lastSide: null,
    lower: null,
    upper: null,
    ghosts: [],
    bandRails: [],
    midPip: null,
    sidePips: [],
    note: 'saknas',
    paper: true,
    live: false,
  };
}

function hedgeGhosts(frequency, proposed) {
  if (!proposed) return [];
  const mid = frequency.mid;
  const lower = frequency.lower;
  const upper = frequency.upper;
  if (mid == null || lower == null || upper == null) return [];
  if (frequency.width == null || frequency.width <= 0) return [];
  return [
    { kind: 'nedre', at: lower },
    { kind: 'mid', at: mid },
    { kind: 'övre', at: upper },
  ];
}

/** Weak silhouette rails + mid pip only when a mitt-hedge plan exists. Never invents levels. */
function hedgeBandFeel(frequency, proposed) {
  const ghosts = hedgeGhosts(frequency, proposed);
  return {
    ghosts,
    bandRails: ghosts.filter((g) => g.kind === 'nedre' || g.kind === 'övre'),
    midPip: ghosts.find((g) => g.kind === 'mid') || null,
  };
}

function knownPlanPx(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Twin side-pips from the proposed plan only: köp.tp (övre) + sälj.tp (nedre).
 * Never invents levels. Missing kop/salj/tp → none.
 */
export function hedgeSidePips(kop, salj) {
  const kopTp = kop && knownPlanPx(kop.tp);
  const saljTp = salj && knownPlanPx(salj.tp);
  if (kopTp == null || saljTp == null) return [];
  return [
    { kind: 'köp', at: kopTp },
    { kind: 'sälj', at: saljTp },
  ];
}

/**
 * Soft mitt-hedge tell. Same Artificer lock: user-typed series + bands.
 * Empty series or invalid band = saknas. Never invents OHLC. Never places an order.
 */
export function rideHedge(raw = {}) {
  const input = parseRideInput(raw);
  const hold = emptyRideHedge();
  const frequency = measureFrequency(input.priceSeries, input.bbLower, input.bbUpper);
  const hedge = proposeMittHedge(frequency, {
    minFrequency: input.minFrequency,
    stopDist: input.maxFel,
  });
  const freqPip = Boolean(frequency.known);
  const saknas = Boolean(!frequency.known || frequency.error || frequency.saknas);
  const saknasKind = frequency.error ? 'band' : saknas ? 'serie' : null;
  const minN = parseMinFrequency(input.minFrequency);
  const have = frequency.known ? frequency.count : null;
  const freqProgress = Boolean(
    frequency.known &&
      !frequency.error &&
      !saknas &&
      !hedge.proposed &&
      have != null &&
      have >= 1 &&
      minN != null &&
      have < minN,
  );
  const base = {
    ...hold,
    freqPip,
    freqProgress,
    freqNeed: freqProgress ? minN : null,
    freqHave: freqProgress ? have : null,
    saknas,
    saknasKind,
    count: frequency.known ? frequency.count : null,
    lastSide: frequency.lastSide,
    lower: frequency.known || frequency.width != null ? frequency.lower : null,
    upper: frequency.known || frequency.width != null ? frequency.upper : null,
    ghosts: [],
    bandRails: [],
    midPip: null,
    sidePips: [],
    note: saknas ? 'saknas' : frequency.note || '',
  };
  if (!hedge.proposed) return base;
  const feel = hedgeBandFeel(frequency, true);
  return {
    ...base,
    tell: true,
    proposed: true,
    freqProgress: false,
    freqNeed: null,
    freqHave: null,
    saknas: false,
    saknasKind: null,
    mode: 'mitt_hedge',
    entry: hedge.entry,
    count: hedge.count,
    kop: hedge.kop,
    salj: hedge.salj,
    ghosts: feel.ghosts,
    bandRails: feel.bandRails,
    midPip: feel.midPip,
    sidePips: hedgeSidePips(hedge.kop, hedge.salj),
    note: 'mitt-hedge · köp + sälj i mitten. Process före fart. Ingen order.',
  };
}

export function emptyHedgeFade() {
  return {
    fading: false,
    fadingIn: false,
    ghosts: [],
    bandRails: [],
    midPip: null,
    sidePips: [],
    progressFade: false,
    progressFadeIn: false,
    freqHave: null,
    freqNeed: null,
    count: null,
    ms: HEDGE_FADE_MS,
    paper: true,
  };
}

export function emptyHedgeProgressFade() {
  return {
    fading: false,
    fadingIn: false,
    freqHave: null,
    freqNeed: null,
    count: null,
    ms: HEDGE_FADE_MS,
    paper: true,
  };
}

function knownProgressSlot(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.round(n);
}

/**
 * Soft HUD handoff: progress-pip fade-out only when a visible grind-progress
 * becomes a proposed mitt-hedge with giltiga band.
 * Copies last known have/need — never invents. Tom serie / saknas-band /
 * under grind / !proposed = no progress fade.
 */
export function hedgeProgressFade(prev, next) {
  const hold = emptyHedgeProgressFade();
  if (!prev || !prev.freqProgress) return hold;
  if (!next || !next.proposed) return hold;
  const ghosts = copyKnownHedgeGhosts(next.ghosts);
  const bandRails = ghosts.filter((g) => g.kind === 'nedre' || g.kind === 'övre');
  const midPip = ghosts.find((g) => g.kind === 'mid') || null;
  if (bandRails.length < 2 || !midPip) return hold;
  const have = knownProgressSlot(prev.freqHave);
  const need = knownProgressSlot(prev.freqNeed);
  if (have == null || need == null || have >= need) return hold;
  const count = knownProgressSlot(prev.count);
  return {
    fading: true,
    fadingIn: false,
    freqHave: have,
    freqNeed: need,
    count: count != null ? count : have,
    ms: HEDGE_FADE_MS,
    paper: true,
  };
}

/**
 * Soft HUD handoff omvänd: progress-pip fade-in only when a proposed mitt-hedge
 * becomes saknas and grind-progress still applies (svängar räknas, under minFrequency).
 * Copies next have/need — never invents. Tom serie / saknas-band / !freqProgress = no fade-in.
 */
export function hedgeProgressFadeIn(prev, next) {
  const hold = emptyHedgeProgressFade();
  if (!prev || !prev.proposed) return hold;
  if (!next || next.proposed || !next.freqProgress) return hold;
  const have = knownProgressSlot(next.freqHave);
  const need = knownProgressSlot(next.freqNeed);
  if (have == null || need == null || have >= need) return hold;
  const count = knownProgressSlot(next.count);
  const ghosts = copyKnownHedgeGhosts(prev.ghosts);
  const midPip = ghosts.find((g) => g.kind === 'mid') || null;
  const sidePips = copyKnownSidePips(prev.sidePips);
  return {
    fading: true,
    fadingIn: true,
    freqHave: have,
    freqNeed: need,
    count: count != null ? count : have,
    ghosts,
    midPip,
    sidePips,
    kop: prev.kop,
    salj: prev.salj,
    ms: HEDGE_FADE_MS,
    paper: true,
  };
}

export function emptyHedgeProgressPulse() {
  return {
    pulsing: false,
    freqHave: null,
    freqNeed: null,
    count: null,
    ms: HEDGE_MID_PULSE_MS,
    paper: true,
  };
}

function progressFadeInStarted(fade) {
  if (!fade || !fade.fading) return false;
  const have = knownProgressSlot(fade.freqHave);
  const need = knownProgressSlot(fade.freqNeed);
  if (have == null || need == null || have >= need) return false;
  if (fade.progressFadeIn) return true;
  return Boolean(fade.fadingIn) && !fade.progressFade;
}

function progressFadeOutStarted(fade) {
  if (!fade || !fade.fading) return false;
  const have = knownProgressSlot(fade.freqHave);
  const need = knownProgressSlot(fade.freqNeed);
  if (have == null || need == null || have >= need) return false;
  if (fade.progressFade) return true;
  return !fade.fadingIn && !fade.progressFadeIn;
}

function progressPulseFromSlots(have, need, count) {
  return {
    pulsing: true,
    freqHave: have,
    freqNeed: need,
    count: count != null ? count : have,
    ms: HEDGE_MID_PULSE_MS,
    paper: true,
  };
}

/**
 * Soft one-shot progress-pip pulse on HUD handoff start:
 * - fade-in proposed→grind (arrival on grind progress)
 * - fade-out grind→proposed (exit/handoff as progress yields to mid+twin)
 * Opposite directions never pulse together.
 * Same 32-bit ease-out family as mitt-pip / twin-pip (~900ms).
 * Copies overlay/real have/need — never invents.
 * Tom serie / saknas-band / under grind / !freqProgress / already proposed without fade-out = no pulse.
 */
export function hedgeProgressPulse(fade, next) {
  const hold = emptyHedgeProgressPulse();
  const fadeIn = progressFadeInStarted(fade);
  const fadeOut = progressFadeOutStarted(fade);
  if (fadeIn === fadeOut) return hold;
  const fadeHave = knownProgressSlot(fade.freqHave);
  const fadeNeed = knownProgressSlot(fade.freqNeed);
  if (fadeHave == null || fadeNeed == null || fadeHave >= fadeNeed) return hold;
  if (fadeIn) {
    if (!next || next.proposed || !next.freqProgress) return hold;
    const have = knownProgressSlot(next.freqHave);
    const need = knownProgressSlot(next.freqNeed);
    if (have == null || need == null || have >= need) return hold;
    if (fadeHave !== have || fadeNeed !== need) return hold;
    const count = knownProgressSlot(next.count);
    return progressPulseFromSlots(have, need, count);
  }
  if (!next || !next.proposed) return hold;
  const count = knownProgressSlot(fade.count);
  return progressPulseFromSlots(fadeHave, fadeNeed, count);
}

/**
 * Soft one-shot mitt-pip pulse only when fade-out grind→proposed starts.
 * Landing tell — mirror of progress-pip pulse on proposed→grind.
 * Same 32-bit ease-out family (~900ms). Copies next user-typed mid — never invents.
 * Tom serie / saknas-band / !proposed / already proposed without progress = no pulse.
 */
export function hedgeMidHandoffPulse(fade, next) {
  const hold = emptyHedgePulse();
  if (!progressFadeOutStarted(fade)) return hold;
  if (!next || !next.proposed) return hold;
  const ghosts = copyKnownHedgeGhosts(next.ghosts);
  const bandRails = ghosts.filter((g) => g.kind === 'nedre' || g.kind === 'övre');
  const midPip = ghosts.find((g) => g.kind === 'mid') || null;
  if (bandRails.length < 2 || !midPip) return hold;
  const fadeMid = fade.midPip != null ? Number(fade.midPip.at) : NaN;
  if (Number.isFinite(fadeMid) && fadeMid !== Number(midPip.at)) return hold;
  return {
    pulsing: true,
    midPip,
    sidePips: [],
    ms: HEDGE_MID_PULSE_MS,
    paper: true,
  };
}

/**
 * Soft one-shot mitt-pip pulse only when fade-in proposed→grind starts.
 * Exit/handoff tell — mirror of mitt landing-puls grind→proposed.
 * Same 32-bit ease-out family (~900ms). Copies last known fade mid — never invents.
 * Tom serie / saknas-band / under grind already / !freqProgress / missing mitt / already grind without fade = no pulse.
 * Never stacks with mitt landing-puls in the same transition.
 */
export function hedgeMidExitPulse(fade, next) {
  const hold = emptyHedgePulse();
  if (hedgeMidHandoffPulse(fade, next).pulsing) return hold;
  if (!progressFadeInStarted(fade)) return hold;
  if (!next || next.proposed || !next.freqProgress) return hold;
  const have = knownProgressSlot(next.freqHave);
  const need = knownProgressSlot(next.freqNeed);
  if (have == null || need == null || have >= need) return hold;
  const fadeHave = knownProgressSlot(fade.freqHave);
  const fadeNeed = knownProgressSlot(fade.freqNeed);
  if (fadeHave == null || fadeNeed == null || fadeHave !== have || fadeNeed !== need) return hold;
  const ghosts = copyKnownHedgeGhosts(fade.ghosts);
  const bandRails = ghosts.filter((g) => g.kind === 'nedre' || g.kind === 'övre');
  const midFromGhosts = ghosts.find((g) => g.kind === 'mid') || null;
  const fadeMid = fade.midPip != null ? Number(fade.midPip.at) : NaN;
  const midPip = Number.isFinite(fadeMid) ? { kind: 'mid', at: fadeMid } : midFromGhosts;
  if (bandRails.length < 2 || !midPip) return hold;
  if (midFromGhosts && Number(midFromGhosts.at) !== Number(midPip.at)) return hold;
  return {
    pulsing: true,
    midPip,
    sidePips: [],
    ms: HEDGE_MID_PULSE_MS,
    paper: true,
  };
}

function knownTwinSides(next, fade) {
  if (!next || !next.proposed) return [];
  const fromPlan = hedgeSidePips(next.kop, next.salj);
  const sidePips = copyKnownSidePips(next.sidePips);
  if (fromPlan.length !== 2 || sidePips.length !== 2) return [];
  if (!sidePips.some((p) => p.kind === 'köp') || !sidePips.some((p) => p.kind === 'sälj')) return [];
  const planMatch = fromPlan.every((fp) =>
    sidePips.some((sp) => sp.kind === fp.kind && Number(sp.at) === Number(fp.at)),
  );
  if (!planMatch) return [];
  const fadeSides = copyKnownSidePips(fade && fade.sidePips);
  if (fadeSides.length === 2) {
    const fadeMatch = fadeSides.every((fp) =>
      sidePips.some((sp) => sp.kind === fp.kind && Number(sp.at) === Number(fp.at)),
    );
    if (!fadeMatch) return [];
  }
  return sidePips;
}

/**
 * Soft one-shot twin side-pip pulse only when fade-out grind→proposed starts.
 * Landing tell — mirror of mitt-pip landing. Same 32-bit ease-out family (~900ms).
 * Copies next kop.tp / salj.tp — never invents.
 * Tom serie / saknas-band / under grind / !proposed / saknar tp / already proposed = no pulse.
 */
export function hedgeTwinHandoffPulse(fade, next) {
  const hold = emptyHedgePulse();
  if (!progressFadeOutStarted(fade)) return hold;
  const sidePips = knownTwinSides(next, fade);
  if (sidePips.length !== 2) return hold;
  return {
    pulsing: true,
    midPip: null,
    sidePips,
    ms: HEDGE_MID_PULSE_MS,
    paper: true,
  };
}

function knownTwinExitSides(fade) {
  const sidePips = copyKnownSidePips(fade && fade.sidePips);
  if (sidePips.length !== 2) return [];
  if (!sidePips.some((p) => p.kind === 'köp') || !sidePips.some((p) => p.kind === 'sälj')) return [];
  const fromPlan = hedgeSidePips(fade && fade.kop, fade && fade.salj);
  if (fromPlan.length === 2) {
    const planMatch = fromPlan.every((fp) =>
      sidePips.some((sp) => sp.kind === fp.kind && Number(sp.at) === Number(fp.at)),
    );
    if (!planMatch) return [];
  }
  return sidePips;
}

/**
 * Soft one-shot twin side-pip pulse only when fade-in proposed→grind starts.
 * Exit/handoff tell — mirror of twin landing-puls grind→proposed and mitt exit-puls.
 * Same 32-bit ease-out family (~900ms). Copies last known fade kop.tp / salj.tp — never invents.
 * Tom serie / saknas-band / under grind already / !freqProgress / saknar tp / already grind without fade = no pulse.
 * Never stacks with twin landing-puls or mitt landing-puls in the same transition.
 */
export function hedgeTwinExitPulse(fade, next) {
  const hold = emptyHedgePulse();
  if (hedgeTwinHandoffPulse(fade, next).pulsing) return hold;
  if (hedgeMidHandoffPulse(fade, next).pulsing) return hold;
  if (!progressFadeInStarted(fade)) return hold;
  if (!next || next.proposed || !next.freqProgress) return hold;
  const have = knownProgressSlot(next.freqHave);
  const need = knownProgressSlot(next.freqNeed);
  if (have == null || need == null || have >= need) return hold;
  const fadeHave = knownProgressSlot(fade.freqHave);
  const fadeNeed = knownProgressSlot(fade.freqNeed);
  if (fadeHave == null || fadeNeed == null || fadeHave !== have || fadeNeed !== need) return hold;
  const ghosts = copyKnownHedgeGhosts(fade.ghosts);
  const bandRails = ghosts.filter((g) => g.kind === 'nedre' || g.kind === 'övre');
  if (bandRails.length < 2) return hold;
  const sidePips = knownTwinExitSides(fade);
  if (sidePips.length !== 2) return hold;
  return {
    pulsing: true,
    midPip: null,
    sidePips,
    ms: HEDGE_MID_PULSE_MS,
    paper: true,
  };
}

function copyKnownHedgeGhosts(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const g of list) {
    if (!g) continue;
    const kind = g.kind;
    const at = Number(g.at);
    if ((kind !== 'nedre' && kind !== 'övre' && kind !== 'mid') || !Number.isFinite(at)) continue;
    out.push({ kind, at });
  }
  return out;
}

function copyKnownSidePips(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const p of list) {
    if (!p) continue;
    const kind = p.kind;
    const at = Number(p.at);
    if ((kind !== 'köp' && kind !== 'sälj') || !Number.isFinite(at)) continue;
    out.push({ kind, at });
  }
  return out;
}

/**
 * Soft fade only when a known plan becomes invalid.
 * Copies last user-typed band levels and last known twin side-pips
 * (kop.tp övre / salj.tp nedre) — never invents mid/OHLC/sides.
 */
export function hedgeBandFade(prev, next) {
  const hold = emptyHedgeFade();
  if (!prev || !prev.proposed) return hold;
  if (next && next.proposed) return hold;
  const ghosts = copyKnownHedgeGhosts(prev.ghosts);
  const bandRails = ghosts.filter((g) => g.kind === 'nedre' || g.kind === 'övre');
  const midPip = ghosts.find((g) => g.kind === 'mid') || null;
  const sidePips = copyKnownSidePips(prev.sidePips);
  if (bandRails.length < 2 || !midPip) return hold;
  const progressIn = hedgeProgressFadeIn(prev, next);
  return {
    fading: true,
    fadingIn: false,
    ghosts,
    bandRails,
    midPip,
    sidePips,
    kop: prev.kop,
    salj: prev.salj,
    progressFade: false,
    progressFadeIn: progressIn.fading,
    freqHave: progressIn.freqHave,
    freqNeed: progressIn.freqNeed,
    count: progressIn.count,
    ms: HEDGE_FADE_MS,
    paper: true,
  };
}

/**
 * Soft fade-in only when a missing/invalid plan becomes giltig.
 * Copies next user-typed band levels and next known twin side-pips
 * (kop.tp övre / salj.tp nedre) — never invents mid/OHLC/sides.
 * Tom serie / saknas-band / övre≤nedre / under grind / !proposed = no fade-in.
 */
export function hedgeBandFadeIn(prev, next) {
  const hold = emptyHedgeFade();
  if (prev && prev.proposed) return hold;
  if (!next || !next.proposed) return hold;
  const ghosts = copyKnownHedgeGhosts(next.ghosts);
  const bandRails = ghosts.filter((g) => g.kind === 'nedre' || g.kind === 'övre');
  const midPip = ghosts.find((g) => g.kind === 'mid') || null;
  const sidePips = copyKnownSidePips(next.sidePips);
  if (bandRails.length < 2 || !midPip) return hold;
  const progress = hedgeProgressFade(prev, next);
  return {
    fading: true,
    fadingIn: true,
    ghosts,
    bandRails,
    midPip,
    sidePips,
    progressFade: progress.fading,
    progressFadeIn: false,
    freqHave: progress.freqHave,
    freqNeed: progress.freqNeed,
    count: progress.count,
    ms: HEDGE_FADE_MS,
    paper: true,
  };
}

export function emptyHedgePulse() {
  return {
    pulsing: false,
    midPip: null,
    sidePips: [],
    ms: HEDGE_MID_PULSE_MS,
    paper: true,
  };
}

/**
 * Soft one-shot mid-pip pulse only after fade-in saknas→giltig.
 * Copies next user-typed mid — never invents. Tom serie / saknas-band / under grind = no pulse.
 */
export function hedgeMidPulse(fade, next) {
  const hold = emptyHedgePulse();
  if (!fade || !fade.fading || !fade.fadingIn) return hold;
  if (!next || !next.proposed) return hold;
  const ghosts = copyKnownHedgeGhosts(next.ghosts);
  const midPip = ghosts.find((g) => g.kind === 'mid') || null;
  if (!midPip) return hold;
  return {
    pulsing: true,
    midPip,
    sidePips: [],
    ms: HEDGE_MID_PULSE_MS,
    paper: true,
  };
}

/**
 * Soft one-shot twin side-pip pulse only after fade-in saknas→giltig.
 * Same 32-bit ease-out family as mitt-pip pulse. Copies next kop.tp / salj.tp — never invents.
 * Tom serie / saknas-band / under grind / !proposed = no twin pulse.
 */
export function hedgeTwinPulse(fade, next) {
  const hold = emptyHedgePulse();
  if (!fade || !fade.fading || !fade.fadingIn) return hold;
  if (!next || !next.proposed) return hold;
  const sidePips = copyKnownSidePips(next.sidePips);
  if (sidePips.length !== 2) return hold;
  if (!sidePips.some((p) => p.kind === 'köp') || !sidePips.some((p) => p.kind === 'sälj')) return hold;
  return {
    pulsing: true,
    midPip: null,
    sidePips,
    ms: HEDGE_MID_PULSE_MS,
    paper: true,
  };
}

/**
 * After fade-in saknas→giltig, skip twin if grind→proposed landing or proposed→grind
 * exit already pulsed. One clear one-shot — never two stacked in the same overlay.
 */
export function hedgeTwinAfterFade(fade, next, handoffTwin) {
  if (handoffTwin && handoffTwin.pulsing) return emptyHedgePulse();
  if (hedgeTwinExitPulse(fade, next).pulsing) return emptyHedgePulse();
  return hedgeTwinPulse(fade, next);
}

export function emptyRideRokad(side = 'köp') {
  const from = side === 'sälj' ? 'sälj' : 'köp';
  return {
    available: false,
    tell: false,
    rokad: false,
    action: 'ingen',
    reverseTo: null,
    from,
    to: from,
    volymFaktor: null,
    nyVolym: null,
    flattenNow: false,
    note: '',
    gate: '',
    paper: true,
    live: false,
  };
}

/**
 * Artificer-locked paper rokad: reverse side, volume −25 %.
 * Decision point — ÖB godkänner. Does not place an order. Empty volume stays empty.
 */
export function rideRokad(raw = {}) {
  const input = parseRideInput(raw);
  const from = input.side;
  const hold = emptyRideRokad(from);
  const season = seasonPlan({
    side: from,
    prognos: input.prognos,
    prognosRr: input.prognosRr,
    hallaRr: input.hallaRr,
    nastaSasong: input.nastaSasong,
    openSize: input.pilotVolume,
    volym: input.pilotVolume,
  });
  if (!season.rokad) {
    return { ...hold, action: season.action || 'ingen' };
  }
  const to = season.reverseTo === 'sälj' || season.reverseTo === 'köp' ? season.reverseTo : from;
  return {
    available: true,
    tell: true,
    rokad: true,
    action: season.action,
    reverseTo: to,
    from,
    to,
    volymFaktor: 0.75,
    nyVolym: rokadVolume(input.pilotVolume),
    flattenNow: Boolean(season.flattenNow),
    note: RIDER_ROKAD_NOTE,
    gate: RIDER_ROKAD_GATE,
    paper: true,
    live: false,
  };
}

export function emptyRokadFade() {
  return {
    fading: false,
    fadingIn: false,
    from: null,
    to: null,
    ms: HEDGE_MID_PULSE_MS,
    paper: true,
  };
}

export function emptyRokadPulse() {
  return {
    pulsing: false,
    from: null,
    to: null,
    ms: HEDGE_MID_PULSE_MS,
    paper: true,
  };
}

function knownRokadSide(v) {
  return v === 'köp' || v === 'sälj' ? v : null;
}

function copyKnownRokadPath(rokad) {
  if (!rokad || !rokad.tell) return null;
  const from = knownRokadSide(rokad.from);
  const to = knownRokadSide(rokad.to);
  if (!from || !to || from === to) return null;
  return { from, to };
}

/**
 * Soft rokad-tell fade only when a known paper-rokad becomes absent.
 * Copies last known from→to — never invents sides or volume.
 * Still present / already absent / missing path = no fade.
 */
export function rokadFade(prev, next) {
  const hold = emptyRokadFade();
  const path = copyKnownRokadPath(prev);
  if (!path) return hold;
  if (next && next.tell) return hold;
  return {
    fading: true,
    fadingIn: false,
    from: path.from,
    to: path.to,
    ms: HEDGE_MID_PULSE_MS,
    paper: true,
  };
}

/**
 * Soft rokad-tell fade-in only when a known paper-rokad becomes present.
 * Copies next from→to — never invents sides or volume.
 * Already present / still absent / missing path = no fade-in.
 */
export function rokadFadeIn(prev, next) {
  const hold = emptyRokadFade();
  if (prev && prev.tell) return hold;
  const path = copyKnownRokadPath(next);
  if (!path) return hold;
  return {
    fading: true,
    fadingIn: true,
    from: path.from,
    to: path.to,
    ms: HEDGE_MID_PULSE_MS,
    paper: true,
  };
}

function hedgeOneShotInFlight(hedgeFade, nextHedge) {
  if (hedgeMidHandoffPulse(hedgeFade, nextHedge).pulsing) return true;
  if (hedgeMidExitPulse(hedgeFade, nextHedge).pulsing) return true;
  if (hedgeTwinHandoffPulse(hedgeFade, nextHedge).pulsing) return true;
  if (hedgeTwinExitPulse(hedgeFade, nextHedge).pulsing) return true;
  return false;
}

/**
 * Soft one-shot rokad-tell pulse only when rokad fade present→absent starts.
 * Same 32-bit ease-out family as mitt/twin exit (~900ms).
 * Copies last known from→to — never invents.
 * Quiet when no real rokad fade, no plan, under grind, still present, or already absent.
 * Never stacks with twin/mitt landing/exit in the same transition — one one-shot.
 */
export function rokadExitPulse(fade, next, hedgeFade, nextHedge) {
  const hold = emptyRokadPulse();
  if (hedgeOneShotInFlight(hedgeFade, nextHedge)) return hold;
  if (!fade || !fade.fading || fade.fadingIn) return hold;
  if (next && next.tell) return hold;
  if (nextHedge && nextHedge.freqProgress) return hold;
  const from = knownRokadSide(fade.from);
  const to = knownRokadSide(fade.to);
  if (!from || !to || from === to) return hold;
  return {
    pulsing: true,
    from,
    to,
    ms: HEDGE_MID_PULSE_MS,
    paper: true,
  };
}

/**
 * Soft one-shot rokad-tell pulse only when rokad fade-in absent→present starts.
 * Same 32-bit ease-out family as mitt/twin enter/landing (~900ms).
 * Copies next from→to — never invents.
 * Quiet when no real rokad fade-in, no plan, under grind, already present, or still absent.
 * Never stacks with twin/mitt landing/exit in the same transition — one one-shot.
 */
export function rokadEnterPulse(fade, next, hedgeFade, nextHedge) {
  const hold = emptyRokadPulse();
  if (hedgeOneShotInFlight(hedgeFade, nextHedge)) return hold;
  if (!fade || !fade.fading || !fade.fadingIn) return hold;
  if (!next || !next.tell) return hold;
  if (nextHedge && nextHedge.freqProgress) return hold;
  const from = knownRokadSide(fade.from);
  const to = knownRokadSide(fade.to);
  if (!from || !to || from === to) return hold;
  const path = copyKnownRokadPath(next);
  if (!path || path.from !== from || path.to !== to) return hold;
  return {
    pulsing: true,
    from,
    to,
    ms: HEDGE_MID_PULSE_MS,
    paper: true,
  };
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

export const RIDER_SMA_NOTE =
  'Små belopp · risken stannar. Pilotvolym får vara liten. Robot höjer aldrig. Paper.';
export const RIDER_SMA_UNLOCK_NOTE =
  'Intjänad. Små belopp · risken stannar. Pilotens tal. Robot höjer aldrig.';

export function smaBeloppHint(store, opts = {}) {
  if (!smaBeloppUnlocked(store)) {
    return { unlocked: false, fresh: false, mode: '', note: '' };
  }
  const fresh = opts.fresh === true;
  return {
    unlocked: true,
    fresh,
    mode: 'sma-belopp',
    note: fresh ? RIDER_SMA_UNLOCK_NOTE : RIDER_SMA_NOTE,
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
    prognos: '',
    prognosRr: '',
    hallaRr: '',
    nastaSasong: '',
    priceSeries: '',
    minFrequency: '',
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
    hedgeFade: emptyHedgeFade(),
    hedgePulse: emptyHedgePulse(),
    hedgeProgressPulse: emptyHedgeProgressPulse(),
    rokadFade: emptyRokadFade(),
    rokadPulse: emptyRokadPulse(),
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
