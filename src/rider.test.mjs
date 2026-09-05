import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeRide,
  parseRideInput,
  parsePriceList,
  rideHorizon,
  saveRideTemplate,
  loadRideTemplate,
  emptyRideDraft,
} from './rider.js';
import { renderRideResult, renderRider } from './rider-ui.js';

function memStore() {
  const data = {};
  return {
    getItem(k) {
      return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null;
    },
    setItem(k, v) {
      data[k] = String(v);
    },
  };
}

test('minimal first-ride ROBOT: entry+maxFel+rr → ok, grav 100, horizon not empty', () => {
  const r = computeRide({ entry: 100, maxFel: 2, rr: 2, tillgang: 'ROBOT' });
  assert.equal(r.ok, true);
  assert.equal(r.saknar_sl_tp, false);
  assert.equal(r.paper, true);
  assert.equal(r.live, false);
  assert.equal(r.sl, 98);
  assert.equal(r.tp, 104);
  assert.equal(r.grav, 100);
  assert.ok(r.horizon.length > 0);
  assert.equal(r.horizon[0].kind, 'paper-trendlinje');
  assert.equal(r.horizon[0].at, 100);
  assert.equal(r.coast, null);
  assert.equal(r.jump.jumped, false);
  assert.equal(r.missing.length, 0);
  assert.equal(r.structure.known, false);
  assert.equal(r.structure.rsi, null);
  assert.equal(r.structure.bbLower, null);
  assert.equal(r.structure.bbUpper, null);
});

test('tom övre ger entry som enda paper-trendlinje (horizon inte tom)', () => {
  const input = parseRideInput({ entry: 100, maxFel: 2, rr: 2, ovre: '' });
  assert.deepEqual(input.ovre, []);
  const horizon = rideHorizon(input);
  assert.equal(horizon.length, 1);
  assert.equal(horizon[0].at, 100);
  const r = computeRide({ entry: 100, maxFel: 2, rr: 2, ovre: '' });
  assert.equal(r.ok, true);
  assert.equal(r.horizon.length, 1);
  assert.equal(r.horizon[0].at, 100);
});

test('ifylld övre används, entry läggs inte på', () => {
  const r = computeRide({ entry: 100, maxFel: 2, rr: 2, ovre: '102, 104' });
  assert.deepEqual(
    r.horizon.map((h) => h.at),
    [102, 104],
  );
});

test('tom grav sitter på entry; ifylld grav vinner', () => {
  const emptyGrav = computeRide({ entry: 100, maxFel: 2, rr: 2, grav: '' });
  assert.equal(emptyGrav.grav, 100);
  assert.equal(emptyGrav.input.grav, null);
  const set = computeRide({ entry: 100, maxFel: 2, rr: 2, grav: 99 });
  assert.equal(set.grav, 99);
});

test('saknar_sl_tp blockerar när entry/maxFel/rr är ofullständiga', () => {
  for (const raw of [
    { entry: '', maxFel: 2, rr: 2 },
    { entry: 100, maxFel: '', rr: 2 },
    { entry: 100, maxFel: 2, rr: '' },
    { entry: 100, maxFel: 0, rr: 2 },
  ]) {
    const r = computeRide(raw);
    assert.equal(r.ok, false);
    assert.equal(r.saknar_sl_tp, true);
    assert.equal(r.sl, null);
    assert.equal(r.tp, null);
    assert.deepEqual(r.missing, ['saknar_sl_tp']);
    assert.ok(!r.missing.some((m) => /rsi|bb|coast|grav|övre|ovre/i.test(m)));
  }
});

test('inga påhittade RSI/BB och inget saknar-spam för valfria fält', () => {
  const r = computeRide({ entry: 100, maxFel: 2, rr: 2, tillgang: 'ROBOT' });
  const blob = JSON.stringify(r);
  assert.equal(r.structure.rsi, null);
  assert.ok(!/saknar_rsi|saknar_bb|saknar_coast|saknar_grav|saknar_ovre/i.test(blob));
});

test('hopp: jumped from grav to hopp; tom hopp = håll', () => {
  const hold = computeRide({ entry: 100, maxFel: 2, rr: 2 });
  assert.equal(hold.jump.jumped, false);
  const hop = computeRide({ entry: 100, maxFel: 2, rr: 2, hopp: 104 });
  assert.equal(hop.jump.jumped, true);
  assert.equal(hop.jump.from, 100);
  assert.equal(hop.jump.to, 104);
});

test('sälj vänder SL/TP kring entry', () => {
  const r = computeRide({ entry: 100, maxFel: 2, rr: 2, side: 'sälj' });
  assert.equal(r.sl, 102);
  assert.equal(r.tp, 96);
});

test('parsePriceList lämnar tom text tom', () => {
  assert.deepEqual(parsePriceList(''), []);
  assert.deepEqual(parsePriceList('102; 104'), [102, 104]);
});

test('mallar per tillgång: spara/ladda hittar inte på siffror i tomma rutor', () => {
  const store = memStore();
  const draft = {
    ...emptyRideDraft(),
    tillgang: 'AIIND',
    entry: '50',
    maxFel: '',
    rr: '2',
    grav: '',
    ovre: '',
    coast: '',
  };
  saveRideTemplate('AIIND', draft, store);
  const loaded = loadRideTemplate('AIIND', store);
  assert.equal(loaded.tillgang, 'AIIND');
  assert.equal(loaded.entry, '50');
  assert.equal(loaded.maxFel, '');
  assert.equal(loaded.rr, '2');
  assert.equal(loaded.grav, '');
  assert.equal(loaded.ovre, '');
  assert.equal(loaded.coast, '');

  const missing = loadRideTemplate('GULDR', store);
  assert.equal(missing.tillgang, 'GULDR');
  assert.equal(missing.entry, '');
  assert.equal(missing.maxFel, '');
  assert.equal(missing.rr, '');
});

test('arena-UI: hopp visar from→to, håll när ingen hopp, kicker inte lampa', () => {
  const hop = computeRide({ entry: 100, maxFel: 2, rr: 2, hopp: 104 });
  const hopHtml = renderRideResult(hop);
  assert.match(hopHtml, /is-jump/);
  assert.match(hopHtml, /→/);
  assert.match(hopHtml, /104/);

  const hold = computeRide({ entry: 100, maxFel: 2, rr: 2 });
  const holdHtml = renderRideResult(hold);
  assert.match(holdHtml, /is-hold/);
  assert.match(holdHtml, /Håll/);
  assert.ok(!/saknar_rsi|saknar_bb|saknar_coast|WATCHERS|anden i lampan/i.test(holdHtml));

  const page = renderRider(emptyRideDraft(), hold);
  assert.match(page, /Trade Rider · paper/);
  assert.ok(!page.startsWith('WATCHERS'));
  assert.ok(!/WATCHERS · anden i lampan/.test(page));
});
