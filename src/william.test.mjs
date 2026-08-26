import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  WILLIAM_EMPTY_TEXT,
  WILLIAM_LAMP_WAIT,
  WILLIAM_COPY,
  CALENDAR_RULES,
  callableRows,
  williamMagazine,
  williamCalendarWrite,
} from './william.js';
import { MAGAZIN_NAV, TOOLBOX_TOOLS, toolboxTools, renderKontrollpanel } from './panel-ui.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function readPublic(name) {
  return readFileSync(join(root, 'public', name), 'utf8');
}

test('William magasin is a standard toolbox tool even when the queue is empty', () => {
  const tools = toolboxTools({ queue: [], session: null });
  const william = tools.find((t) => t.id === 'william');
  assert.equal(tools.length, 3);
  assert.ok(william);
  assert.equal(william.standard, true);
  assert.equal(william.missing, false);
  assert.equal(william.neverMissing, true);
  assert.equal(william.href, '/william.html');
  assert.equal(william.lamp, 'yellow');
  assert.equal(william.lampText, WILLIAM_LAMP_WAIT);
  assert.equal(william.emptyText, WILLIAM_EMPTY_TEXT);
  assert.deepEqual(william.rows, []);
  assert.match(william.copy, /North/);
  assert.match(william.copy, /Telefon/);
});

test('toolbox catalog always lists Magasin, William magasin and Luckor', () => {
  const ids = TOOLBOX_TOOLS.map((t) => t.id);
  const hrefs = TOOLBOX_TOOLS.map((t) => t.href);
  assert.deepEqual(ids, ['magasin', 'william', 'luckor']);
  assert.deepEqual(hrefs, ['/magasin.html', '/william.html', '/luckor.html']);
  assert.ok(TOOLBOX_TOOLS.every((t) => t.standard && t.neverMissing));
  const names = MAGAZIN_NAV.map((n) => n.name);
  assert.deepEqual(names, ['Magasin', 'William magasin', 'Luckor']);
});

test('kontrollpanel still shows William magasin when session is missing', () => {
  const html = renderKontrollpanel({ queue: [], session: null });
  assert.match(html, /Verktygslåda/);
  assert.match(html, /href="\/magasin\.html"/);
  assert.match(html, /href="\/william\.html"/);
  assert.match(html, /href="\/luckor\.html"/);
  assert.match(html, /William magasin/);
  assert.match(html, /lamp-yellow/);
  assert.match(html, /väntar William-session/);
  assert.match(html, /alva-card/);
  assert.doesNotMatch(html, /saknat verktyg/);
  assert.doesNotMatch(html, /\+46/);
  assert.doesNotMatch(html, /Kjersti/);
});

test('phone required, North first; rows without phone are not callable', () => {
  const ordered = callableRows([
    { namn: 'övrig', desk: 'forcex', phone: '111' },
    { namn: 'north-person', desk: 'North Investments', phone: '222' },
    { namn: 'utan-telefon', desk: 'north' },
  ]);
  assert.deepEqual(
    ordered.map((r) => r.namn),
    ['north-person', 'övrig']
  );
});

test('session present turns the lamp gold; empty queue still is not a missing tool', () => {
  const mag = williamMagazine({ session: { connected: true }, rows: [] });
  assert.equal(mag.missing, false);
  assert.equal(mag.standard, true);
  assert.equal(mag.lamp, 'gold');
  assert.equal(mag.emptyText, WILLIAM_EMPTY_TEXT);
  assert.match(WILLIAM_COPY, /Standard/);
});

test('never copy Daniel Assigned To onto William calendar; no phones, no live-fire', () => {
  assert.equal(CALENDAR_RULES.copyDanielAssignedToOntoWilliam, false);
  assert.equal(CALENDAR_RULES.liveFire, false);
  assert.equal(CALENDAR_RULES.phonesInCalendar, false);
  const write = williamCalendarWrite({
    source: 'daniel-assigned-to',
    rows: [{ namn: 'påhitt', phone: '0700000000' }],
  });
  assert.equal(write.written, false);
  assert.deepEqual(write.events, []);
  assert.deepEqual(write.phones, []);
  assert.equal(write.copiedFromDanielAssignedTo, false);
});

test('william.html stays in Magasin and Luckor nav; empty list is waiting, not missing', () => {
  const william = readPublic('william.html');
  const magasin = readPublic('magasin.html');
  const luckor = readPublic('luckor.html');
  for (const page of [william, magasin, luckor]) {
    assert.match(page, /href="magasin\.html"/);
    assert.match(page, /href="william\.html"/);
    assert.match(page, /href="luckor\.html"/);
    assert.match(page, /William magasin/);
  }
  assert.match(william, /väntar session, inte saknat verktyg/);
  assert.match(william, /väntar William-session/);
  assert.doesNotMatch(william, /Kjersti/);
  assert.doesNotMatch(william, /\+46/);
  assert.doesNotMatch(william, /kronor|kr\s|SEK|070\d/);
  assert.doesNotMatch(william, /Assigned To/);
});
