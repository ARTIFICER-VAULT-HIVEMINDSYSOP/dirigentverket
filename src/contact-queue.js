/** Magasinet ringkö — scoring stays, rotation via nextContactAt. Paper. Ingen PII. */

export const ROUND_COOLDOWN_MS = 12 * 60 * 60 * 1000;

export function emptyHudState() {
  return {
    copiedId: null,
    copiedAt: 0,
    markedId: null,
    markedAt: 0,
    firingId: null,
    firingUntil: 0,
  };
}

export function rowId(row) {
  if (!row || typeof row !== 'object') return '';
  return String(row.id || '').trim();
}

export function displayName(row) {
  if (!row || typeof row !== 'object') return '';
  return String(row.namn || row.name || '').trim();
}

export function rowRole(row, magasin) {
  const explicit = String(row?.role || row?.kind || '').trim().toLowerCase();
  if (explicit === 'lead' || explicit === 'leads') return 'lead';
  if (explicit === 'klient' || explicit === 'client') return 'klient';
  if (magasin === 'leads') return 'lead';
  return 'klient';
}

export function isNorth(row) {
  return /north/i.test(String(row?.brand || ''));
}

function parseStamp(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? ms : null;
}

export function lastContactMs(row) {
  return parseStamp(row?.last_contact || row?.card_comment_at || row?.senaste);
}

export function hasDueAppointment(row, now) {
  const at = parseStamp(row?.avtalad_tid);
  if (at == null) return false;
  return at <= now;
}

function statusBits(row) {
  if (!row || typeof row !== 'object') return '';
  const kind = row.outcome && typeof row.outcome === 'object' ? row.outcome.kind : '';
  return [row.status, row.park, kind].map((x) => String(x || '').trim().toUpperCase()).join(' ');
}

/** Parked re-touch: Recovery and similar. Still in magasinet, not ring-nu first. */
export function isParkedRetouch(row) {
  const s = statusBits(row);
  if (!s) return false;
  if (/\bRECOVERY\b/.test(s)) return true;
  if (/\bFLIPPED\b/.test(s)) return true;
  if (/\bNOT[_ ]?INTEREST\b/.test(s)) return true;
  return false;
}

export function isFreshUnworked(row) {
  return inRingNow(row) && !isParkedRetouch(row);
}

export function hasOutcome(row) {
  if (!row || typeof row !== 'object') return false;
  if (row.ringNow === false) return true;
  if (isParkedRetouch(row)) return false;
  if (row.outcome && typeof row.outcome === 'object' && row.outcome.kind) return true;
  const st = String(row.status || '').trim().toUpperCase();
  return st === 'CLOSED' || st === 'KLAR';
}

export function inRingNow(row) {
  if (!row || typeof row !== 'object') return false;
  if (row.ringNow === false) return false;
  return !hasOutcome(row);
}

export function isDueForContact(row, now) {
  const at = parseStamp(row?.nextContactAt);
  return at == null || at <= now;
}

/** Existing Magasinet weights: avtalad tid, North, older last contact. No new case types. */
export function clientContactScore(row, now) {
  let score = 0;
  if (hasDueAppointment(row, now)) score += 1_000_000;
  if (isNorth(row)) score += 10_000;
  const last = lastContactMs(row);
  if (last == null) score += 5_000;
  else score += Math.min(4_999, Math.floor(Math.max(0, now - last) / 60_000));
  return score;
}

function compareRanked(a, b) {
  if (a.lane !== b.lane) return a.lane - b.lane;
  if (a.due !== b.due) return a.due ? -1 : 1;
  if (b.score !== a.score) return b.score - a.score;
  return rowId(a.row).localeCompare(rowId(b.row));
}

function rankLane(row, filter) {
  const parked = isParkedRetouch(row);
  if (filter === 'recovery') return parked ? 0 : 1;
  return parked ? 1 : 0;
}

export function rankClientsToContact(rows, now = Date.now(), filter = 'queue') {
  const list = Array.isArray(rows) ? rows.filter((r) => r && typeof r === 'object') : [];
  const ring = list.filter(inRingNow);
  const scored = ring.map((row) => ({
    row,
    score: clientContactScore(row, now),
    due: isDueForContact(row, now),
    lane: rankLane(row, filter),
  }));
  const fresh = scored.filter((s) => !isParkedRetouch(s.row));
  const parked = scored.filter((s) => isParkedRetouch(s.row));
  const resetLane = filter === 'recovery' ? parked : fresh;
  if (resetLane.length && !resetLane.some((s) => s.due)) {
    resetLane.forEach((s) => {
      s.due = true;
    });
  }
  scored.sort(compareRanked);
  return scored.map((s) => s.row);
}

export function cockedId(rows, now = Date.now(), filter = 'queue') {
  const ranked = rankClientsToContact(rows, now, filter);
  return ranked.length ? rowId(ranked[0]) : '';
}

export function applyCooldown(row, now, ms = ROUND_COOLDOWN_MS) {
  if (!row || typeof row !== 'object') return row;
  row.nextContactAt = new Date(now + ms).toISOString();
  return row;
}

export function applyOutcome(row, now, kind = 'saved') {
  if (!row || typeof row !== 'object') return row;
  const k = String(kind || 'saved');
  if (isParkedRetouch({ status: k, park: k, outcome: { kind: k } })) {
    row.status = /\bRECOVERY\b/i.test(k) ? 'RECOVERY' : String(row.status || k).toUpperCase();
    row.park = k;
    row.outcome = { kind: row.status, at: new Date(now).toISOString() };
    row.ringNow = true;
    applyCooldown(row, now);
    return row;
  }
  row.outcome = { kind: k, at: new Date(now).toISOString() };
  row.ringNow = false;
  applyCooldown(row, now);
  return row;
}

export function litId(state) {
  if (!state) return '';
  const copiedAt = Number(state.copiedAt) || 0;
  const markedAt = Number(state.markedAt) || 0;
  if (state.copiedId && copiedAt >= markedAt) return String(state.copiedId);
  if (state.markedId && markedAt > copiedAt) return String(state.markedId);
  return String(state.copiedId || state.markedId || '');
}

export function defaultFocusId(state, rows, now = Date.now(), filter = 'queue') {
  const lit = litId(state);
  if (lit) return lit;
  return cockedId(rows, now, filter);
}

export function markCartridge(state, id, at = Date.now()) {
  const next = state || emptyHudState();
  next.markedId = String(id || '');
  next.markedAt = at;
  return next;
}

export function copyFromCartridge(state, id, at = Date.now()) {
  const next = state || emptyHudState();
  next.copiedId = String(id || '');
  next.copiedAt = at;
  return next;
}

export function afterTouch(state, rows, id, now = Date.now(), reason = 'saved') {
  const row = (rows || []).find((r) => rowId(r) === String(id));
  if (row) applyCooldown(row, now);
  if (reason === 'copy') copyFromCartridge(state, id, now);
  else if (reason === 'mark') markCartridge(state, id, now);
  else {
    copyFromCartridge(state, id, now);
  }
  return state;
}

export function fireOutcome(state, rows, id, now = Date.now(), kind = 'saved') {
  const row = (rows || []).find((r) => rowId(r) === String(id));
  if (row) applyOutcome(row, now, kind);
  const next = state || emptyHudState();
  next.firingId = String(id || '');
  next.firingUntil = now + 900;
  if (litId(next) === String(id)) {
    next.copiedId = null;
    next.copiedAt = 0;
    next.markedId = null;
    next.markedAt = 0;
  }
  return next;
}

export function mergeNextContactAt(rows, overlay) {
  if (!overlay || typeof overlay !== 'object') return rows;
  for (const row of rows || []) {
    const id = rowId(row);
    const extra = overlay[id];
    if (!extra) continue;
    const have = parseStamp(row.nextContactAt) || 0;
    const want = parseStamp(extra) || 0;
    if (want > have) row.nextContactAt = extra;
  }
  return rows;
}

function cartridgeStatus(row) {
  if (hasOutcome(row)) return 'utfall';
  if (isParkedRetouch(row)) return 'recovery';
  return 'väntar';
}

export function magazineView(rows, state, now = Date.now(), magasin = 'daniel', filter = 'queue') {
  const ring = rankClientsToContact(rows, now, filter);
  const cocked = ring.length ? rowId(ring[0]) : '';
  const lit = litId(state);
  const firing =
    state && state.firingId && now < (Number(state.firingUntil) || 0) ? String(state.firingId) : '';
  const seen = new Set(ring.map(rowId));
  const rest = (Array.isArray(rows) ? rows : []).filter((r) => r && typeof r === 'object' && !seen.has(rowId(r)));
  const ordered = ring.concat(rest);
  const cartridges = ordered.map((row) => {
    const id = rowId(row);
    const waiting = inRingNow(row);
    return {
      id,
      name: displayName(row),
      role: rowRole(row, magasin),
      status: cartridgeStatus(row),
      inRing: waiting,
      isLit: Boolean(id && id === lit),
      isCocked: Boolean(id && id === cocked && waiting),
      isFiring: Boolean(id && id === firing),
    };
  });
  const cockedName = cartridges.find((c) => c.isCocked)?.name || '';
  return {
    cockedId: cocked,
    litId: lit,
    firingId: firing,
    focusId: defaultFocusId(state, rows, now, filter),
    filter,
    ringNow: ring.map(rowId),
    cartridges,
    cap: cockedName ? `Ring nu · ${cockedName}` : 'väntar kö',
  };
}

export const PAPER_RECOVERY = Object.freeze({
  id: 'p-r',
  namn: 'R',
  brand: 'North',
  status: 'RECOVERY',
  role: 'klient',
  avtalad_tid: '2026-01-01T09:00:00Z',
});

export const PAPER_FIXTURES = Object.freeze([
  { id: 'p-a', namn: 'A', brand: 'North', status: '', role: 'klient' },
  { id: 'p-b', namn: 'B', brand: 'KS', status: '', role: 'klient', last_contact: '2026-01-01T00:00:00Z' },
  { id: 'p-c', namn: 'C', brand: 'KS', status: '', role: 'lead', last_contact: '2026-02-01T00:00:00Z' },
  { id: 'p-d', namn: 'D', brand: 'KS', status: '', role: 'klient', last_contact: '2026-03-01T00:00:00Z' },
]);
