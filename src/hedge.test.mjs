import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePriceSeries,
  parseMinFrequency,
  measureFrequency,
  proposeMittHedge,
  DEFAULT_MIN_FREQUENCY,
} from './hedge.js';
import { computeRobot, parseRobotInput } from './robot.js';

const lower = 100;
const upper = 110;
const mid = 105;
const width = 10;

/** lower → upper → lower → upper → lower → upper = 5 completed swings */
const fiveSwings = [100, 110, 100, 110, 100, 110];

test('parsePriceSeries: tom → []', () => {
  assert.deepEqual(parsePriceSeries(''), []);
  assert.deepEqual(parsePriceSeries(null), []);
  assert.deepEqual(parsePriceSeries('   '), []);
});

test('parsePriceSeries: radbrytning, semikolon, kommaseparerat', () => {
  assert.deepEqual(parsePriceSeries('98\n102\n99'), [98, 102, 99]);
  assert.deepEqual(parsePriceSeries('98; 102; 99'), [98, 102, 99]);
  assert.deepEqual(parsePriceSeries('98, 102, 99'), [98, 102, 99]);
});

test('parsePriceSeries: svenskt decimal på egen rad, skräp droppas', () => {
  assert.deepEqual(parsePriceSeries('100,5\n101,25'), [100.5, 101.25]);
  assert.deepEqual(parsePriceSeries('100\nx\n102'), [100, 102]);
});

test('parseMinFrequency: tom → default 3, ogiltig → null', () => {
  assert.equal(parseMinFrequency(''), DEFAULT_MIN_FREQUENCY);
  assert.equal(parseMinFrequency(undefined), DEFAULT_MIN_FREQUENCY);
  assert.equal(parseMinFrequency('5'), 5);
  assert.equal(parseMinFrequency('0'), null);
  assert.equal(parseMinFrequency('-1'), null);
  assert.equal(parseMinFrequency('abc'), null);
});

test('tom kursserie → saknas, räknar inte, hittar inte på count', () => {
  const f = measureFrequency([], lower, upper);
  assert.equal(f.known, false);
  assert.equal(f.saknas, true);
  assert.equal(f.count, null);
  assert.equal(f.lastSide, null);
  assert.equal(f.mid, mid);
  assert.equal(f.width, width);
  assert.match(f.note, /kursserie saknas/);
});

test('band saknas → saknas, ingen påhittad mitt', () => {
  const f = measureFrequency([100, 110], '', '');
  assert.equal(f.known, false);
  assert.equal(f.count, null);
  assert.equal(f.mid, null);
  assert.equal(f.width, null);
  assert.equal(f.hasSeries, true);
  assert.match(f.note, /band saknas/);
});

test('övre <= nedre → error, ingen hedge-grund', () => {
  const f = measureFrequency(fiveSwings, 110, 100);
  assert.equal(f.error, true);
  assert.equal(f.known, false);
  assert.equal(f.count, null);
  assert.equal(f.mid, null);
  assert.match(f.note, /högre än nedre/);
});

test('nedre sedan övre = en sväng; lastSide övre; mitt och bredd', () => {
  const f = measureFrequency([100, 110], lower, upper);
  assert.equal(f.known, true);
  assert.equal(f.count, 1);
  assert.equal(f.lastSide, 'övre');
  assert.equal(f.mid, mid);
  assert.equal(f.width, width);
});

test('övre sedan nedre = en sväng (vice versa)', () => {
  const f = measureFrequency([110, 100], lower, upper);
  assert.equal(f.count, 1);
  assert.equal(f.lastSide, 'nedre');
});

test('L-U-L-U-L-U = fem svängar', () => {
  const f = measureFrequency(fiveSwings, lower, upper);
  assert.equal(f.count, 5);
  assert.equal(f.lastSide, 'övre');
});

test('bara samma sida → count 0, lastSide satt', () => {
  const f = measureFrequency([100, 100.2, 99.8], lower, upper);
  assert.equal(f.known, true);
  assert.equal(f.count, 0);
  assert.equal(f.lastSide, 'nedre');
});

test('kurser i mitten räknas inte; närzon 15 % räknas som träff', () => {
  const nearLower = lower + width * 0.1;
  const nearUpper = upper - width * 0.1;
  const midPx = mid;
  const f = measureFrequency([nearLower, midPx, nearUpper], lower, upper);
  assert.equal(f.count, 1);
  assert.equal(f.lastSide, 'övre');
});

test('hedge-grind: frekvens 2, min 3 → inte föreslagen', () => {
  const freq = measureFrequency([100, 110, 100], lower, upper);
  assert.equal(freq.count, 2);
  const h = proposeMittHedge(freq, { minFrequency: 3 });
  assert.equal(h.proposed, false);
  assert.equal(h.mode, null);
  assert.match(h.note, /når inte minsta 3/);
  assert.equal(h.paper, true);
  assert.equal(h.advice, false);
});

test('hedge-grind: frekvens 3, default min → mitt_hedge, köp+sälj, entry mitt', () => {
  const freq = measureFrequency([100, 110, 100, 110], lower, upper);
  assert.equal(freq.count, 3);
  const h = proposeMittHedge(freq, {});
  assert.equal(h.proposed, true);
  assert.equal(h.mode, 'mitt_hedge');
  assert.equal(h.entry, mid);
  assert.deepEqual(h.sides, ['köp', 'sälj']);
  assert.equal(h.kop.entry, mid);
  assert.equal(h.kop.tp, upper);
  assert.equal(h.kop.sl, lower);
  assert.equal(h.salj.entry, mid);
  assert.equal(h.salj.tp, lower);
  assert.equal(h.salj.sl, upper);
  assert.equal(h.stopOutside, false);
  assert.equal(h.paper, true);
  assert.equal(h.advice, false);
});

test('hedge-grind: ogiltigt band → inte föreslagen', () => {
  const freq = measureFrequency(fiveSwings, 110, 100);
  const h = proposeMittHedge(freq, {});
  assert.equal(h.proposed, false);
  assert.equal(h.mode, null);
  assert.match(h.note, /högre än nedre/);
});

test('hedge-grind: tom serie → inte föreslagen', () => {
  const freq = measureFrequency([], lower, upper);
  const h = proposeMittHedge(freq, {});
  assert.equal(h.proposed, false);
  assert.equal(h.mode, null);
  assert.match(h.note, /kursserie saknas/);
});

test('SL utanför bandet när stopDist anges', () => {
  const freq = measureFrequency(fiveSwings, lower, upper);
  const h = proposeMittHedge(freq, { stopDist: 2 });
  assert.equal(h.proposed, true);
  assert.equal(h.stopOutside, true);
  assert.equal(h.kop.sl, 98);
  assert.equal(h.salj.sl, 112);
});

test('computeRobot fäster frequency+hedge även vid ok:false; befintlig plan orörd', () => {
  const r = computeRobot({
    side: 'köp',
    bbLower: lower,
    bbUpper: upper,
    priceSeries: fiveSwings.join('\n'),
  });
  assert.equal(r.ok, false);
  assert.equal(r.frequency.count, 5);
  assert.equal(r.hedge.proposed, true);
  assert.equal(r.hedge.mode, 'mitt_hedge');
  assert.equal(r.initial, null);
});

test('computeRobot: vanlig SL/TP-väg oförändrad utan serie', () => {
  const r = computeRobot({
    instrument: 'OMXS30',
    entry: 100,
    risk: 2,
    rr: 2,
    side: 'köp',
  });
  assert.equal(r.ok, true);
  assert.equal(r.initial.sl, 98);
  assert.equal(r.initial.tp, 104);
  assert.equal(r.frequency.saknas, true);
  assert.equal(r.hedge.proposed, false);
});

test('parseRobotInput läser kursserie och minFrequency', () => {
  const input = parseRobotInput({
    priceSeries: '100\n110\n100',
    minFrequency: '4',
    bbLower: 100,
    bbUpper: 110,
  });
  assert.deepEqual(input.priceSeries, [100, 110, 100]);
  assert.equal(input.minFrequency, '4');
});
