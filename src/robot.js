/**
 * Paper trading robot — utredning only.
 * Computes SL, TP and optional size. Never fetches quotes. Never places orders.
 */

function num(v) {
  if (v === '' || v === null || v === undefined) return null;
  const x = Number(String(v).replace(',', '.').replace(/\s/g, ''));
  return Number.isFinite(x) ? x : null;
}

function parseBounce(v) {
  const s = String(v || '').trim().toLowerCase();
  if (s === 'nedre' || s.startsWith('nedre')) return 'nedre';
  if (s === 'övre' || s.startsWith('övre')) return 'övre';
  return 'nej';
}

function parseTempo(v) {
  const s = String(v || '').trim().toLowerCase();
  if (s === 'snabbare' || s.startsWith('snabbare')) return 'snabbare';
  return 'sasong';
}

function parsePrognos(v) {
  const s = String(v || '').trim().toLowerCase();
  if (s === 'köp') return 'köp';
  if (s === 'sälj') return 'sälj';
  if (s === 'neutral') return 'neutral';
  return '';
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
    rsi: num(raw.rsi),
    bbLower: num(raw.bbLower),
    bbUpper: num(raw.bbUpper),
    bounce: parseBounce(raw.bounce),
    tempo: parseTempo(raw.tempo),
    nastaSasong: String(raw.nastaSasong || '').trim(),
    prognos: parsePrognos(raw.prognos),
    prognosRr: num(raw.prognosRr),
    hallaRr: num(raw.hallaRr),
    openSize: num(raw.openSize != null && raw.openSize !== '' ? raw.openSize : raw.volym),
  };
}

function paperStamp(obj) {
  return { ...obj, paper: true, advice: false };
}

function rokadCut(input) {
  const openSize = num(input.openSize != null && input.openSize !== '' ? input.openSize : input.volym);
  const filled = openSize !== null && openSize > 0;
  return {
    rokad: true,
    volymFaktor: 0.75,
    nyVolym: filled ? openSize * 0.75 : null,
  };
}

const ROKAD_NOTE = 'rokadläge: byt håll, volym −25 %. ÖB godkänner. Ingen order lagd. Inte personlig rådgivning.';

/**
 * Paper multi-year / VIP season plan. Never invents a forecast or RR.
 * Empty forecast = no reverse. Missing forecast-RR = cannot claim the other side can make money.
 */
export function seasonPlan(input) {
  const prognos = parsePrognos(input.prognos);
  const side = input.side === 'sälj' ? 'sälj' : 'köp';
  const tempo = parseTempo(input.tempo);
  const prognosRr = num(input.prognosRr);
  const hallaRr = num(input.hallaRr);
  const seasonLabel = String(input.nastaSasong || '').trim() || 'nästa säsong';

  if (!prognos) {
    return paperStamp({ action: 'ingen', rokad: false, note: 'prognos saknas — ingen vändning föreslås.' });
  }
  if (prognos === 'neutral') {
    return paperStamp({ action: 'ingen', rokad: false, note: 'prognos neutral — behåll öppen sida tills ÖB säger annat.' });
  }
  if (prognos === side) {
    return paperStamp({ action: 'halla', rokad: false, note: 'prognos samma håll som öppen position. Behåll. Ingen order.' });
  }

  if (prognosRr === null || prognosRr <= 0) {
    return paperStamp({
      action: 'saknar_rr',
      rokad: false,
      note: 'prognos pekar mot andra hållet, men prognos-RR saknas. Fyll i innan vi påstår att nästa säsong kan bära.',
    });
  }
  if (hallaRr !== null && prognosRr <= hallaRr) {
    return paperStamp({ action: 'halla', rokad: false, note: 'prognos-RR slår inte att sitta kvar. Behåll öppen sida.' });
  }
  if (tempo === 'snabbare') {
    return paperStamp({
      action: 'radda',
      reverseTo: prognos,
      flattenNow: true,
      ...rokadCut(input),
      note: `räddning, snabbare tempo: stäng den öppna (paper) och föreslå vändning till ${prognos}. Vänta inte in nästa säsong. ${ROKAD_NOTE}`,
    });
  }
  return paperStamp({
    action: 'byt_hall',
    reverseTo: prognos,
    flattenNow: false,
    season: seasonLabel,
    ...rokadCut(input),
    note: `flerår: byt håll till ${prognos} när ${seasonLabel} börjar, om prognos-RR ${prognosRr} håller. ${ROKAD_NOTE}`,
  });
}

/**
 * Paper structure gate. Never invents RSI, bands, or bounce.
 * Trail only when RSI approaches a Bollinger band and the user marks a bid bounce.
 */
export function structureSignal(input) {
  const rsi = num(input.rsi);
  const bbLower = num(input.bbLower);
  const bbUpper = num(input.bbUpper);
  const current = num(input.current);
  const bounce = parseBounce(input.bounce);
  const side = input.side === 'sälj' ? 'sälj' : 'köp';

  if (rsi === null || bbLower === null || bbUpper === null) {
    return {
      known: false,
      confirmed: false,
      trail: false,
      band: null,
      note: 'ingen struktur — fyll i RSI och båda Bollinger-banden.',
    };
  }

  if (bbUpper <= bbLower) {
    return {
      known: false,
      confirmed: false,
      trail: false,
      error: true,
      note: 'Övre band måste vara högre än nedre.',
    };
  }

  const width = bbUpper - bbLower;
  const nearLower = current !== null && current <= bbLower + width * 0.15;
  const nearUpper = current !== null && current >= bbUpper - width * 0.15;
  const rsiLow = rsi <= 40;
  const rsiHigh = rsi >= 60;
  const bounceSet = bounce === 'nedre' || bounce === 'övre';

  const base = { known: true, confirmed: false, trail: false, band: null };

  if (current === null && (rsiLow || rsiHigh) && bounceSet) {
    return { ...base, note: 'aktuell kurs saknas.' };
  }

  if (nearLower && rsiLow && bounce === 'nedre') {
    if (side === 'sälj') {
      return {
        ...base,
        confirmed: true,
        band: 'nedre',
        note: 'strukturen pekar mot andra hållet än vald sida.',
      };
    }
    return {
      known: true,
      confirmed: true,
      trail: true,
      band: 'nedre',
      note: 'struktur: RSI närmar sig nedre band, bud studsar mot det.',
    };
  }

  if (nearUpper && rsiHigh && bounce === 'övre') {
    if (side === 'köp') {
      return {
        ...base,
        confirmed: true,
        band: 'övre',
        note: 'strukturen pekar mot andra hållet än vald sida.',
      };
    }
    return {
      known: true,
      confirmed: true,
      trail: true,
      band: 'övre',
      note: 'struktur: RSI närmar sig övre band, bud studsar mot det.',
    };
  }

  if (nearLower && rsiLow && bounce !== 'nedre') {
    return { ...base, band: 'nedre', note: 'RSI närmar sig nedre band, väntar på budstuds.' };
  }

  if (nearUpper && rsiHigh && bounce !== 'övre') {
    return { ...base, band: 'övre', note: 'RSI närmar sig övre band, väntar på budstuds.' };
  }

  if (rsiLow && !nearLower) {
    return { ...base, note: 'RSI närmar sig översålt, kursen är inte vid nedre band än.' };
  }

  if (rsiHigh && !nearUpper) {
    return { ...base, note: 'RSI närmar sig överköpt, kursen är inte vid övre band än.' };
  }

  return { ...base, note: 'ingen struktur.' };
}

/**
 * SL distance in price units.
 * Prefer explicit risk. If risk is empty, ATR may be used. Never invent either.
 */
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

/**
 * Trail SL toward breakeven / lock R, recompute TP so RR is held or improved.
 * Requires a user-typed current price. Never invents quotes.
 */
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

/** Size only when the user types a risk amount in SEK. No account size invented. */
export function positionSize(input, dist) {
  if (input.riskSek === null || input.riskSek <= 0 || !dist || dist <= 0) return null;
  return input.riskSek / dist;
}

function isStoppedAtInitial(input, initial) {
  const current = input.current;
  if (current === null || !initial) return false;
  const long = initial.side !== 'sälj';
  return long ? current <= initial.sl : current >= initial.sl;
}

function stoppedDynamic(input, initial) {
  const { sl: sl0, tp: tp0, dist, side, entry } = initial;
  const long = side !== 'sälj';
  const current = input.current;
  return {
    sl: sl0,
    tp: tp0,
    openR: long ? (current - entry) / dist : (entry - current) / dist,
    stopped: true,
    trailed: false,
    note: long
      ? 'Kursen är vid eller under initial SL. Papper — ingen order är lagd.'
      : 'Kursen är vid eller över initial SL. Papper — ingen order är lagd.',
  };
}

function heldInitialDynamic(input, initial, structure) {
  const { sl: sl0, tp: tp0, dist, side, entry } = initial;
  const long = side !== 'sälj';
  const current = input.current;
  const openR = long ? (current - entry) / dist : (entry - current) / dist;
  const remainRisk = long ? current - sl0 : sl0 - current;
  const remainReward = Math.abs(tp0 - current);
  const heldRr = remainRisk > 0 ? remainReward / remainRisk : null;
  const structNote = structure && structure.note ? structure.note : 'ingen struktur.';
  return {
    sl: sl0,
    tp: tp0,
    openR,
    heldRr,
    stopped: false,
    trailed: false,
    note: `${structNote} Initial SL/TP ligger kvar.`,
  };
}

function resolveDynamic(input, initial, structure) {
  if (input.current === null || !initial) return null;
  if (isStoppedAtInitial(input, initial)) return stoppedDynamic(input, initial);
  if (structure.trail) {
    const dyn = dynamicLevels(input, initial);
    if (dyn && !dyn.stopped) dyn.trailed = true;
    return dyn;
  }
  return heldInitialDynamic(input, initial, structure);
}

export function computeRobot(raw) {
  const input = parseRobotInput(raw);
  const structure = structureSignal(input);
  const errors = [];
  if (!input.instrument) errors.push('Ange instrument.');
  if (input.entry === null || input.entry <= 0) errors.push('Ange entry (kurs).');
  if (input.rr === null || input.rr <= 0) errors.push('Ange mål-RR (t.ex. 1,5 / 2 / 3).');
  const dist = slDistance(input);
  if (dist === null) errors.push('Ange riskavstånd (pris eller %) eller ATR.');
  if (errors.length) {
    return { ok: false, errors, input, initial: null, dynamic: null, size: null, structure, season: seasonPlan(input) };
  }
  const initial = initialLevels(input);
  const dynamic = resolveDynamic(input, initial, structure);
  const size = positionSize(input, dist);
  return { ok: true, errors: [], input, initial, dynamic, size, dist, structure, season: seasonPlan(input) };
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
    rsi: '',
    bbLower: '',
    bbUpper: '',
    bounce: 'nej',
    tempo: 'sasong',
    nastaSasong: '',
    prognos: '',
    prognosRr: '',
    hallaRr: '',
    openSize: '',
    volym: '',
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
