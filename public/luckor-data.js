/**
 * Tomma 15-minutersluckor — avläst kalender, inte påhittade tider.
 *
 * Google Calendar daniellll46.ii@gmail.com
 * Avläst 13:16 Europe/Stockholm ons 26 aug 2026.
 *
 * Inga telefoner. Inga påhittade kronor. Inte live.
 */

export const LUCKOR_SNAPSHOT = {
  calendar: 'daniellll46.ii@gmail.com',
  timeZone: 'Europe/Stockholm',
  verifiedAt: '2026-08-26T13:16:00+02:00',
  verifiedLabel: '13:16 Europe/Stockholm ons 26 aug 2026',
  dayStart: '09:00',
  dayEnd: '18:00',
  slotMinutes: 15,
  remainingAfter: '13:16',
  today: '2026-08-26',
  tomorrow: '2026-08-27',
  occupied: [
    { date: '2026-08-26', start: '09:00', end: '17:45' },
    { date: '2026-08-26', start: '18:00', end: '18:15', title: 'Stefan Gustafsson' },
    { date: '2026-08-27', start: '16:30', end: '17:30', title: 'Susanne Köhler' },
  ],
};

export const QUEUE_EXAMPLE = {
  namn: 'Kjersti Nilsson',
  forcex: '8052',
  kommentar: "5 jun · not int",
  note: 'Exempel längst bak. Inte ett live-samtal.',
};

export function toMinutes(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + m;
}

export function fromMinutes(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function overlaps(slotStart, slotEnd, block) {
  return toMinutes(block.start) < slotEnd && toMinutes(block.end) > slotStart;
}

export function emptySlotStarts(date, options = {}) {
  const snap = options.snapshot || LUCKOR_SNAPSHOT;
  const dayStart = toMinutes(snap.dayStart);
  const dayEnd = toMinutes(snap.dayEnd);
  const after = options.remaining
    ? toMinutes(options.remainingAfter || snap.remainingAfter)
    : dayStart;
  const blocks = snap.occupied.filter((b) => b.date === date);
  const slots = [];
  for (let t = dayStart; t < dayEnd; t += snap.slotMinutes) {
    if (t < after) continue;
    const end = t + snap.slotMinutes;
    if (!blocks.some((b) => overlaps(t, end, b))) slots.push(fromMinutes(t));
  }
  return slots;
}

export function todayEmpties(snapshot = LUCKOR_SNAPSHOT) {
  return emptySlotStarts(snapshot.today, { snapshot, remaining: true });
}

export function tomorrowEmpties(snapshot = LUCKOR_SNAPSHOT) {
  return emptySlotStarts(snapshot.tomorrow, { snapshot, remaining: false });
}

export function suggestions() {
  return [
    {
      id: 'idag',
      label: '17:45 idag',
      time: '17:45',
      when: 'idag',
      lede: 'Senare i eftermiddag. Enda lediga kvarten före Stefan.',
    },
    {
      id: 'imorgon',
      label: '09:00 imorgon',
      time: '09:00',
      when: 'imorgon',
      lede: 'Första lediga kvart i morgon, torsdag.',
    },
    {
      id: 'bak',
      label: '17:45 imorgon · längst bak',
      time: '17:45',
      when: 'imorgon',
      lede: 'Längst bak i kön. Ett exempel, inte ett live-samtal.',
      example: QUEUE_EXAMPLE,
    },
  ];
}
