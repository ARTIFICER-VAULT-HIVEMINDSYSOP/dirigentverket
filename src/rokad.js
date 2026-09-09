/**
 * Rokad — reverse only when recovery is measurable. Never invent prices. Never place orders.
 *
 * Two volume rules (documented conflict):
 * - Säsongsvändning in robot.js keeps 0.75 (−25 %), as existing tests/docs intend.
 * - Losing-position rokad here uses 0.25 (ÖB latest: opposite at 25 % of filled size).
 */

function num(v) {
  if (v === '' || v === null || v === undefined) return null;
  const x = Number(String(v).replace(',', '.').replace(/\s/g, ''));
  return Number.isFinite(x) ? x : null;
}

function paperStamp(obj) {
  return { ...obj, paper: true, advice: false };
}

/** Stated rule, not a measured return. Empty history must not claim avkastning. */
export const GULD_ROKAD = {
  symbols: ['guldr', 'guld', 'gold'],
  delayedMonths: 8,
};

export const ROKAD_MOTSATT_FAKTOR = 0.25;

export function isGuldRokadAsset(instrument) {
  const s = String(instrument || '').trim().toLowerCase();
  if (!s) return false;
  return GULD_ROKAD.symbols.includes(s);
}

export function parseDelayedMonths(v) {
  if (v === '' || v === null || v === undefined) return GULD_ROKAD.delayedMonths;
  const n = num(v);
  if (n === null || n < 1) return null;
  return Math.floor(n);
}

/**
 * Gold rokad flag + delayed-gratitude premise. Empty historik = do not claim measured returns.
 */
export function guldRokadRule(input) {
  const instrument = String(input.instrument || '').trim();
  const allowed = isGuldRokadAsset(instrument);
  const delayedMonths = parseDelayedMonths(input.guldVantanManader);
  const historik = String(input.guldHistorik || '').trim();
  const historikSaknas = !historik;

  if (!allowed) {
    return paperStamp({
      allowed: false,
      delayedMonths: null,
      historikSaknas: true,
      note: 'inte guld — ingen guld-rokadregel.',
    });
  }

  const wait = delayedMonths === null ? GULD_ROKAD.delayedMonths : delayedMonths;
  const histNote = historikSaknas
    ? 'Historik saknas — vi påstår inte uppmätt avkastning.'
    : 'Historik är ifylld text, inte ett bevis vi räknat fram.';

  return paperStamp({
    allowed: true,
    delayedMonths: wait,
    historikSaknas,
    note: `Guld (${instrument}): tillåten för rokad. Regeln är att vänta ca ${wait} månader (fördröjd belöning). ${histNote} Ingen order läggs.`,
  });
}

/**
 * Explicit recovery measure. Empty = not known. Never invents a reclaim or RR.
 */
export function recoveryMeasure(input, structure) {
  const prognosRr = num(input.prognosRr);
  if (prognosRr !== null && prognosRr > 0) {
    return { known: true, kind: 'prognos_rr', note: 'återhämtning: ifylld prognos-RR.' };
  }

  if (structure && structure.confirmed && structure.band && !structure.trail) {
    const side = input.side === 'sälj' ? 'sälj' : 'köp';
    const reverseBand = side === 'köp' ? 'övre' : 'nedre';
    if (structure.band === reverseBand) {
      return { known: true, kind: 'struktur', note: 'återhämtning: struktur pekar mot motsatt håll.' };
    }
  }

  const reclaim = num(input.reclaim);
  const current = num(input.current);
  if (reclaim !== null && current !== null) {
    const side = input.side === 'sälj' ? 'sälj' : 'köp';
    const reclaiming = side === 'köp' ? current >= reclaim : current <= reclaim;
    if (reclaiming) {
      return { known: true, kind: 'atertag', note: 'återhämtning: kursen har återtagit ifylld nivå.' };
    }
    return { known: false, kind: null, note: 'återhämtning saknas — kursen har inte återtagit nivån.' };
  }

  return { known: false, kind: null, note: 'återhämtning saknas — ingen rokad.' };
}

function motsattCut(input) {
  const openSize = num(input.openSize != null && input.openSize !== '' ? input.openSize : input.volym);
  const filled = openSize !== null && openSize > 0;
  return {
    rokad: true,
    volymFaktor: ROKAD_MOTSATT_FAKTOR,
    nyVolym: filled ? openSize * ROKAD_MOTSATT_FAKTOR : null,
  };
}

function isLosing(input) {
  const entry = num(input.entry);
  const current = num(input.current);
  if (entry === null || current === null) return { known: false, losing: null };
  const side = input.side === 'sälj' ? 'sälj' : 'köp';
  const losing = side === 'köp' ? current < entry : current > entry;
  return { known: true, losing };
}

/**
 * Losing position → opposite side at 25 % of filled size, only if recovery is known.
 */
export function losingRokad(input, structure) {
  const recovery = recoveryMeasure(input, structure);
  const loss = isLosing(input);
  const gold = guldRokadRule(input);

  if (!loss.known) {
    return paperStamp({
      rokad: false,
      losing: null,
      recovery,
      gold,
      note: 'aktuell kurs eller entry saknas — ingen rokad.',
    });
  }
  if (!loss.losing) {
    return paperStamp({
      rokad: false,
      losing: false,
      recovery,
      gold,
      note: 'positionen är inte på minus. Ingen rokad.',
    });
  }
  if (!recovery.known) {
    return paperStamp({
      rokad: false,
      losing: true,
      recovery,
      gold,
      note: recovery.note,
    });
  }

  const side = input.side === 'sälj' ? 'sälj' : 'köp';
  const reverseTo = side === 'köp' ? 'sälj' : 'köp';
  const goldNote = gold.allowed ? ` ${gold.note}` : '';

  return paperStamp({
    ...motsattCut(input),
    losing: true,
    recovery,
    gold,
    reverseTo,
    note: `Rokad: byt till ${reverseTo} på 25 % av ifylld volym. ${recovery.note} Ingen order läggs.${goldNote}`,
  });
}
