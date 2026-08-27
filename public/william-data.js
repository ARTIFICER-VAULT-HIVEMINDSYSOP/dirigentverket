/**
 * William magasin — standardverktyg i lådan.
 *
 * Kön kan vänta på session. Verktyget saknas aldrig.
 * Inga påhittade klientrader, telefoner eller kronor.
 * Daniels Assigned To läggs inte i Williams kalender.
 * Inget live. Inga telefoner i kalender.
 */

export const WILLIAM_EMPTY_TEXT = 'väntar session, inte saknat verktyg';
export const WILLIAM_LAMP_WAIT = 'väntar William-session';
export const WILLIAM_COPY =
  'Standard. Aldrig tom på anropbara rader. North först. Telefon krävs.';

export const CALENDAR_RULES = Object.freeze({
  copyDanielAssignedToOntoWilliam: false,
  liveFire: false,
  phonesInCalendar: false,
});

export function hasPhone(row) {
  return Boolean(row && String(row.phone || row.telefon || '').trim());
}

export function isNorth(row) {
  if (!row) return false;
  if (row.north === true) return true;
  const desk = String(row.desk || row.verksamhet || '').toLowerCase();
  return desk.includes('north');
}

export function callableRows(rows = []) {
  const withPhone = (Array.isArray(rows) ? rows : []).filter(hasPhone);
  const north = withPhone.filter(isNorth);
  const rest = withPhone.filter((r) => !isNorth(r));
  return [...north, ...rest];
}

export function williamMagazine({ session = null, rows = [] } = {}) {
  const queued = callableRows(rows);
  const waiting = !session;
  return {
    id: 'william',
    name: 'William magasin',
    href: '/william.html',
    standard: true,
    neverMissing: true,
    missing: false,
    waitingSession: waiting,
    lamp: waiting ? 'yellow' : 'gold',
    lampText: waiting ? WILLIAM_LAMP_WAIT : 'William-session',
    copy: WILLIAM_COPY,
    rows: queued,
    emptyText: queued.length ? '' : WILLIAM_EMPTY_TEXT,
  };
}

export function williamCalendarWrite() {
  return {
    written: false,
    events: [],
    phones: [],
    copiedFromDanielAssignedTo: false,
    reason:
      'No live-fire. Daniel Assigned To stays off William calendar. No phones in calendar.',
  };
}
