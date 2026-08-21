import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRobotInput, structureSignal, computeRobot } from './robot.js';

function sig(raw) {
  return structureSignal(parseRobotInput(raw));
}

const lowerBounce = {
  rsi: 28,
  bbLower: 98,
  bbUpper: 106,
  current: 98.2,
  side: 'köp',
  bounce: 'nedre',
};

test('RSI 28 vid nedre band med budstuds → trail', () => {
  const s = sig(lowerBounce);
  assert.equal(s.trail, true);
  assert.equal(s.confirmed, true);
  assert.equal(s.known, true);
  assert.equal(s.band, 'nedre');
});

test('samma siffror men bounce nej → ingen trail', () => {
  const s = sig({ ...lowerBounce, bounce: 'nej' });
  assert.equal(s.trail, false);
  assert.equal(s.confirmed, false);
  assert.match(s.note, /väntar på budstuds/);
});

test('blank RSI → known false, trail false', () => {
  const s = sig({
    rsi: '',
    bbLower: 98,
    bbUpper: 106,
    current: 98.2,
    side: 'köp',
    bounce: 'nedre',
  });
  assert.equal(s.known, false);
  assert.equal(s.trail, false);
});

test('sälj mot bekräftad nedre struktur → trail false (fel sida)', () => {
  const s = sig({ ...lowerBounce, side: 'sälj' });
  assert.equal(s.trail, false);
  assert.match(s.note, /andra hållet/);
});

test('bbUpper <= bbLower → error-note', () => {
  const s = sig({
    rsi: 50,
    bbLower: 106,
    bbUpper: 98,
    current: 100,
    side: 'köp',
    bounce: 'nej',
  });
  assert.equal(s.error, true);
  assert.equal(s.trail, false);
  assert.equal(s.known, false);
  assert.equal(s.note, 'Övre band måste vara högre än nedre.');
});

test('computeRobot trails only when structure.trail', () => {
  const base = {
    instrument: 'OMXS30',
    entry: 100,
    risk: 2,
    rr: 2,
    current: 98.2,
    ...lowerBounce,
  };
  const ok = computeRobot(base);
  assert.equal(ok.structure.trail, true);
  assert.equal(ok.dynamic.trailed, true);

  const held = computeRobot({ ...base, bounce: 'nej' });
  assert.equal(held.structure.trail, false);
  assert.equal(held.dynamic.trailed, false);
  assert.equal(held.dynamic.sl, held.initial.sl);
  assert.match(held.dynamic.note, /Initial SL\/TP ligger kvar/);
});
