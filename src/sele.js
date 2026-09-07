/**
 * Sele — paper control harness.
 * Binds the pilot’s volume rule + SL/TP template to a client filter.
 * Robots / älvor inherit; they never raise volume.
 * Never fetches ForceX. Never invents balance, prices, or SL/TP.
 */

export { LIVE_LOCKED } from './rider.js';

export const SELE_STORAGE_KEY = 'dirigentverket.sele.v1';

function num(v) {
  if (v === '' || v === null || v === undefined) return null;
  const x = Number(String(v).replace(',', '.').replace(/\s/g, ''));
  return Number.isFinite(x) ? x : null;
}

function str(v) {
  return String(v ?? '').trim();
}

function parseBool(v, fallback) {
  if (v === true || v === 'true' || v === '1' || v === 1) return true;
  if (v === false || v === 'false' || v === '0' || v === 0) return false;
  return fallback;
}

/** Symbols stay a list. Empty text stays []. Never invent tickers. */
export function parseSymbols(raw) {
  if (Array.isArray(raw)) {
    return raw.map((s) => str(s)).filter(Boolean);
  }
  return str(raw)
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function keepPct(v) {
  const n = num(v);
  return n === null ? '' : n;
}

/**
 * Tenant fields for white-label. Same motor. Do not hardcode only KS brands.
 * Empty tenant lists stay empty — examples live in paper, not in git data.
 */
export function tenantSeleShape(tenant = {}) {
  const sele = tenant.sele && typeof tenant.sele === 'object' ? tenant.sele : {};
  const brands = Array.isArray(sele.brands) ? sele.brands.map(str).filter(Boolean) : [];
  const assignees = Array.isArray(sele.assignees) ? sele.assignees.map(str).filter(Boolean) : [];
  return {
    tenantId: str(tenant.id),
    brands,
    assignees,
    paper: sele.paper !== false && tenant.rules?.paper_default !== false,
  };
}

export function emptySele() {
  return {
    name: '',
    brand: '',
    assigned: '',
    tenantId: '',
    symbols: '',
    volumePct: '',
    side: 'köp',
    slPct: '',
    tpPct: '',
    skipIfSymbolOpen: true,
    paper: true,
  };
}

/**
 * Canonical Sele. Empty cells stay empty (not 0). paper is always true.
 */
export function createSele(raw = {}, tenant = {}) {
  const shape = tenantSeleShape(tenant);
  const filter = raw.clientFilter && typeof raw.clientFilter === 'object' ? raw.clientFilter : {};
  const side = raw.side === 'sälj' ? 'sälj' : 'köp';
  const symbols = parseSymbols(raw.symbols);
  return {
    name: str(raw.name),
    clientFilter: {
      brand: str(raw.brand ?? filter.brand),
      assigned: str(raw.assigned ?? filter.assigned),
      tenantId: str(raw.tenantId ?? filter.tenantId ?? shape.tenantId),
    },
    volumePct: keepPct(raw.volumePct),
    side,
    symbols,
    slPct: keepPct(raw.slPct),
    tpPct: keepPct(raw.tpPct),
    skipIfSymbolOpen: parseBool(raw.skipIfSymbolOpen, true),
    paper: true,
    live: false,
  };
}

function fieldMissing(value) {
  if (Array.isArray(value)) return value.length === 0;
  return value === '' || value === null || value === undefined;
}

/**
 * SL+TP required for ok. Other empty fields are listed as saknas, not filled.
 */
export function validateSele(raw = {}, tenant = {}) {
  const sele = createSele(raw, tenant);
  const missing = [];
  if (fieldMissing(sele.name)) missing.push('name');
  if (fieldMissing(sele.clientFilter.brand)) missing.push('brand');
  if (fieldMissing(sele.clientFilter.assigned)) missing.push('assigned');
  if (fieldMissing(sele.symbols)) missing.push('symbols');
  if (fieldMissing(sele.volumePct)) missing.push('volumePct');

  const sl = num(sele.slPct);
  const tp = num(sele.tpPct);
  const slOk = sl !== null && sl > 0;
  const tpOk = tp !== null && tp > 0;
  if (!slOk) missing.push('slPct');
  if (!tpOk) missing.push('tpPct');
  const saknar_sl_tp = !slOk || !tpOk;

  return {
    ok: !saknar_sl_tp,
    saknar_sl_tp,
    missing,
    saknas: missing,
    errors: saknar_sl_tp ? ['saknar_sl_tp'] : [],
    paper: true,
    live: false,
    sele,
  };
}

/**
 * Älva/robot inherits volume. Never raise above the pilot’s %.
 * Empty stays empty — do not invent a percent.
 */
export function capVolumePct(volumePct, pilotVolumePct) {
  const vol = num(volumePct);
  const pilot = num(pilotVolumePct);
  if (vol === null && pilot === null) return '';
  if (pilot === null) return vol;
  if (vol === null) return pilot;
  return Math.min(vol, pilot);
}

/**
 * Apply volumePct to a caller-supplied balance.
 * Never invents balance. Empty balance → amount null, listed as saknas.
 * Optional third arg is the pilot cap; applied % never exceeds it.
 */
export function applyVolume(balance, volumePct, pilotVolumePct) {
  const bal = num(balance);
  const requested = num(volumePct);
  const hasPilot = arguments.length > 2;
  const appliedPct = hasPilot ? capVolumePct(volumePct, pilotVolumePct) : requested === null ? '' : requested;
  const appliedNum = num(appliedPct);

  const missing = [];
  if (bal === null) missing.push('balance');
  if (requested === null && appliedNum === null) missing.push('volumePct');

  if (bal === null || appliedNum === null) {
    return {
      amount: null,
      appliedPct: appliedNum,
      requestedPct: requested,
      pilotPct: hasPilot ? num(pilotVolumePct) : requested,
      raised: false,
      missing,
      saknas: missing,
      paper: true,
    };
  }

  const pilotNum = hasPilot ? num(pilotVolumePct) : requested;
  const wouldRaise = requested !== null && pilotNum !== null && requested > pilotNum;

  return {
    amount: bal * (appliedNum / 100),
    appliedPct: appliedNum,
    requestedPct: requested,
    pilotPct: pilotNum,
    raised: false,
    capped: Boolean(wouldRaise),
    missing: [],
    saknas: [],
    paper: true,
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

export function loadSeleDraft(store) {
  const parsed = readJson(store, SELE_STORAGE_KEY);
  return { ...emptySele(), ...(parsed || {}) };
}

export function saveSeleDraft(draft, store) {
  storeApi(store).setItem(SELE_STORAGE_KEY, JSON.stringify({ ...emptySele(), ...draft }));
}
