/**
 * Mid-band hedge — frequency of range oscillation + paper plan.
 * Counts completed swings from a user-typed price series. Never fetches quotes. Never places orders.
 */

function num(v) {
  if (v === '' || v === null || v === undefined) return null;
  const x = Number(String(v).replace(',', '.').replace(/\s/g, ''));
  return Number.isFinite(x) ? x : null;
}

/** Same near-zone as structureSignal: 15 % of band width. */
export const NEAR_BAND_FRAC = 0.15;

export const DEFAULT_MIN_FREQUENCY = 3;

/**
 * One price per line, semicolon, or comma+space. A lone comma is a Swedish decimal.
 * Junk tokens are dropped — never invented.
 */
export function parsePriceSeries(raw) {
  if (Array.isArray(raw)) {
    return raw.map(num).filter((x) => x !== null);
  }
  const text = String(raw || '').trim();
  if (!text) return [];
  return text
    .split(/\n|;|,(?=\s)|\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(num)
    .filter((x) => x !== null);
}

export function parseMinFrequency(v) {
  if (v === '' || v === null || v === undefined) return DEFAULT_MIN_FREQUENCY;
  const n = num(v);
  if (n === null || n < 1) return null;
  return Math.floor(n);
}

function bandTouch(price, lower, upper, width) {
  const nearLower = price <= lower + width * NEAR_BAND_FRAC;
  const nearUpper = price >= upper - width * NEAR_BAND_FRAC;
  if (nearLower && nearUpper) {
    const dL = Math.abs(price - lower);
    const dU = Math.abs(price - upper);
    if (dL < dU) return 'nedre';
    if (dU < dL) return 'övre';
    return null;
  }
  if (nearLower) return 'nedre';
  if (nearUpper) return 'övre';
  return null;
}

function emptyFreq(extra) {
  return {
    known: false,
    saknas: true,
    error: false,
    count: null,
    lastSide: null,
    mid: null,
    width: null,
    lower: null,
    upper: null,
    hasSeries: false,
    ...extra,
  };
}

/**
 * Count completed oscillations: touch/near one band, then the other = one.
 * Empty series or missing band → saknas. Does not invent prices.
 */
export function measureFrequency(prices, lowerRaw, upperRaw) {
  const lower = num(lowerRaw);
  const upper = num(upperRaw);
  const series = parsePriceSeries(prices);
  const hasSeries = series.length > 0;

  if (lower === null || upper === null) {
    return emptyFreq({
      hasSeries,
      note: 'band saknas — fyll i övre och nedre.',
    });
  }
  if (upper <= lower) {
    return emptyFreq({
      error: true,
      saknas: false,
      hasSeries,
      lower,
      upper,
      note: 'Övre band måste vara högre än nedre.',
    });
  }

  const width = upper - lower;
  const mid = (upper + lower) / 2;

  if (!hasSeries) {
    return emptyFreq({
      mid,
      width,
      lower,
      upper,
      hasSeries: false,
      note: 'kursserie saknas.',
    });
  }

  let lastSide = null;
  let count = 0;
  for (const p of series) {
    const side = bandTouch(p, lower, upper, width);
    if (!side) continue;
    if (lastSide && side !== lastSide) count += 1;
    lastSide = side;
  }

  return {
    known: true,
    saknas: false,
    error: false,
    count,
    lastSide,
    mid,
    width,
    lower,
    upper,
    hasSeries: true,
    note:
      lastSide === null
        ? 'ingen bandträff i serien.'
        : `frekvens ${count}, senast ${lastSide}.`,
  };
}

function paperStamp(obj) {
  return { ...obj, paper: true, advice: false };
}

/**
 * Propose mitt_hedge when measured frequency meets minFrequency and the band is valid.
 * Entry at mid. Both köp and sälj. SL outside the band when stopDist is given; otherwise at the band (user-typed).
 */
export function proposeMittHedge(freq, options = {}) {
  const minFrequency = parseMinFrequency(options.minFrequency);
  const stopDist = num(options.stopDist);

  if (minFrequency === null) {
    return paperStamp({
      proposed: false,
      mode: null,
      note: 'minsta frekvens är ogiltig.',
    });
  }

  if (!freq || freq.error) {
    return paperStamp({
      proposed: false,
      mode: null,
      note: freq && freq.note ? freq.note : 'ogiltigt band.',
    });
  }

  if (!freq.known || freq.count === null) {
    return paperStamp({
      proposed: false,
      mode: null,
      note: freq && freq.note ? freq.note : 'frekvens saknas.',
    });
  }

  if (freq.mid === null || freq.width === null || freq.width <= 0) {
    return paperStamp({ proposed: false, mode: null, note: 'ogiltigt band.' });
  }

  if (freq.count < minFrequency) {
    return paperStamp({
      proposed: false,
      mode: null,
      count: freq.count,
      minFrequency,
      note: `frekvens ${freq.count} når inte minsta ${minFrequency}. Ingen mitt-hedge.`,
    });
  }

  const outside = stopDist !== null && stopDist > 0;
  const buySl = outside ? freq.lower - stopDist : freq.lower;
  const sellSl = outside ? freq.upper + stopDist : freq.upper;

  return paperStamp({
    proposed: true,
    mode: 'mitt_hedge',
    entry: freq.mid,
    sides: ['köp', 'sälj'],
    stopOutside: outside,
    minFrequency,
    count: freq.count,
    kop: { side: 'köp', entry: freq.mid, sl: buySl, tp: freq.upper },
    salj: { side: 'sälj', entry: freq.mid, sl: sellSl, tp: freq.lower },
    note: 'Mitt-hedge: sitta i mitten med både köp och sälj. Köp mot taket, sälj mot golvet. Ingen order läggs.',
  });
}
