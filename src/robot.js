/**
 * Paper trading robot — utredning only.
 * Computes SL, TP and optional size. Never fetches quotes. Never places orders.
 */

function num(v) {
  if (v === '' || v === null || v === undefined) return null;
  const x = Number(String(v).replace(',', '.').replace(/\s/g, ''));
  return Number.isFinite(x) ? x : null;
}

export function parseRobotInput(raw) {
  return {
    instrument: String(raw.instrument || '').trim(),
    side: raw.side === 'sälj' ? 'sälj' : 'köp',
    entry: num(raw.entry),
    risk: num(raw.risk),
    riskMode: raw.riskMode === 'procent' ? 'procent' : 'pris',
    rr: num(raw.rr),
    atr: num(raw.atr),
    current: num(raw.current),
    riskSek: num(raw.riskSek),
  };
}

export function slDistance(input) {
  const { entry, risk, riskMode, atr } = input;
  if (entry === null || entry <= 0) return null;
  if (risk !== null && risk > 0) {
    return riskMode === 'procent' ? entry * (risk / 100) : risk;
  }
  if (atr !== null && atr > 0) return atr;
  return null;
}

export function initialLevels(input) {
  const dist = slDistance(input);
  const { entry, side, rr } = input;
  if (dist === null || entry === null || rr === null || rr <= 0) return null;
  const long = side !== 'sälj';
  const sl = long ? entry - dist : entry + dist;
  const tp = long ? entry + dist * rr : entry - dist * rr;
  return { sl, tp, dist, rr, side, entry };
}

export function dynamicLevels(input, initial) {
  const current = input.current;
  if (current === null || !initial) return null;
  const { sl: sl0, tp: tp0, dist, rr, side, entry } = initial;
  const long = side !== 'sälj';

  if (long && current <= sl0) {
    return {
      sl: sl0,
      tp: tp0,
      openR: (current - entry) / dist,
      stopped: true,
      note: 'Kursen är vid eller under initial SL. Papper — ingen order är lagd.',
    };
  }
  if (!long && current >= sl0) {
    return {
      sl: sl0,
      tp: tp0,
      openR: (entry - current) / dist,
      stopped: true,
      note: 'Kursen är vid eller över initial SL. Papper — ingen order är lagd.',
    };
  }

  const openR = long ? (current - entry) / dist : (entry - current) / dist;
  let sl = sl0;

  if (openR > 0 && openR < 1) {
    const frac = openR;
    sl = long ? sl0 + (entry - sl0) * frac : sl0 - (sl0 - entry) * frac;
  } else if (openR >= 1) {
    const lock = (openR - 1) * 0.5;
    sl = long ? entry + lock * dist : entry - lock * dist;
  }

  if (long) sl = Math.max(sl, sl0);
  else sl = Math.min(sl, sl0);

  const newRisk = long ? current - sl : sl - current;
  let tp = tp0;
  if (newRisk > 0) {
    const tpFromRr = long ? current + newRisk * rr : current - newRisk * rr;
    tp = long ? Math.max(tp0, tpFromRr) : Math.min(tp0, tpFromRr);
  }

  const heldRr = newRisk > 0 ? Math.abs(tp - current) / newRisk : null;
  return {
    sl,
    tp,
    openR,
    heldRr,
    stopped: false,
    note:
      openR <= 0
        ? 'Ingen medvind ännu. Initial SL/TP ligger kvar.'
        : openR < 1
          ? 'SL dras mot nollpunkt. TP håller eller förbättrar RR.'
          : 'SL låser del av öppen R. TP håller eller förbättrar RR.',
  };
}

export function positionSize(input, dist) {
  if (input.riskSek === null || input.riskSek <= 0 || !dist || dist <= 0) return null;
  return input.riskSek / dist;
}

export function computeRobot(raw) {
  const input = parseRobotInput(raw);
  const errors = [];
  if (!input.instrument) errors.push('Ange instrument.');
  if (input.entry === null || input.entry <= 0) errors.push('Ange entry (kurs).');
  if (input.rr === null || input.rr <= 0) errors.push('Ange mål-RR (t.ex. 1,5 / 2 / 3).');
  const dist = slDistance(input);
  if (dist === null) errors.push('Ange riskavstånd (pris eller %) eller ATR.');
  if (errors.length) {
    return { ok: false, errors, input, initial: null, dynamic: null, size: null };
  }
  const initial = initialLevels(input);
  const dynamic = dynamicLevels(input, initial);
  const size = positionSize(input, dist);
  return { ok: true, errors: [], input, initial, dynamic, size, dist };
}

export function formatPx(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  const abs = Math.abs(v);
  const digits = abs >= 1000 ? 2 : abs >= 1 ? 4 : 6;
  return new Intl.NumberFormat('sv-SE', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(v);
}

export function formatSize(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return '';
  return new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 4 }).format(v);
}

export const ROBOT_STORAGE_KEY = 'dirigentverket.robot.v1';

export function emptyRobotDraft() {
  return {
    instrument: '',
    side: 'köp',
    entry: '',
    risk: '',
    riskMode: 'pris',
    rr: '2',
    atr: '',
    current: '',
    riskSek: '',
  };
}

export function loadRobotDraft() {
  try {
    const raw = localStorage.getItem(ROBOT_STORAGE_KEY);
    if (!raw) return emptyRobotDraft();
    const parsed = JSON.parse(raw);
    return { ...emptyRobotDraft(), ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch {
    return emptyRobotDraft();
  }
}

export function saveRobotDraft(draft) {
  localStorage.setItem(ROBOT_STORAGE_KEY, JSON.stringify({ ...emptyRobotDraft(), ...draft }));
}
