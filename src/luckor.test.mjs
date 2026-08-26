import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LUCKOR_SNAPSHOT,
  QUEUE_EXAMPLE,
  todayEmpties,
  tomorrowEmpties,
  suggestions,
} from './luckor.js';

test('idag före 18:00: bara 17:45 kvar efter 13:16', () => {
  assert.deepEqual(todayEmpties(), ['17:45']);
});

test('Stefan sitter 18:00–18:15 och räknas inte som lucka före 18:00', () => {
  const stefan = LUCKOR_SNAPSHOT.occupied.find((b) => b.title === 'Stefan Gustafsson');
  assert.equal(stefan.start, '18:00');
  assert.equal(stefan.end, '18:15');
  assert.ok(!todayEmpties().includes('18:00'));
});

test('imorgon: bara Susanne 16:30–17:30 upptar', () => {
  const susanne = LUCKOR_SNAPSHOT.occupied.filter((b) => b.date === '2026-08-27');
  assert.equal(susanne.length, 1);
  assert.equal(susanne[0].title, 'Susanne Köhler');
  assert.equal(susanne[0].start, '16:30');
  assert.equal(susanne[0].end, '17:30');
});

test('imorgon tomma kvartar: 09:00–16:15 samt 17:30 och 17:45', () => {
  const empty = tomorrowEmpties();
  assert.equal(empty[0], '09:00');
  assert.equal(empty.at(-3), '16:15');
  assert.deepEqual(empty.slice(-2), ['17:30', '17:45']);
  assert.ok(!empty.includes('16:30'));
  assert.ok(!empty.includes('16:45'));
  assert.ok(!empty.includes('17:00'));
  assert.ok(!empty.includes('17:15'));
  assert.equal(empty.length, 32);
});

test('tre ombokningschip har exakt den formen', () => {
  const labels = suggestions().map((s) => s.label);
  assert.deepEqual(labels, [
    '17:45 idag',
    '09:00 imorgon',
    '17:45 imorgon · längst bak',
  ]);
});

test('längst bak är ett exempel, inte ett register', () => {
  assert.equal(QUEUE_EXAMPLE.namn, 'Kjersti Nilsson');
  assert.equal(QUEUE_EXAMPLE.forcex, '8052');
  assert.match(QUEUE_EXAMPLE.kommentar, /not int/);
  assert.match(QUEUE_EXAMPLE.note, /Inte ett live-samtal/);
});
