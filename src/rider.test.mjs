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
  coreIncomplete,
  clampLeverage,
  leverageSpeed,
  coastPeriodMs,
  commitRail,
  commitLeverage,
  cycleLens,
  rideJump,
  reservedRiderKey,
  handleRiderKey,
  tempoToLens,
  HOP_WINDOW_MS,
  COAST_PERIOD_MS,
  LIVE_LOCKED,
} from './rider.js';
import { renderRideResult, renderRider, renderPlayArena } from './rider-ui.js';

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

const bandBounce = {
  rsi: 28,
  bbLower: 98,
  bbUpper: 106,
  current: 98.2,
  bounce: 'nedre',
  side: 'köp',
};

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
  assert.ok(r.horizon.prices.length > 0);
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

test('tom övre + ifylld grav → horizon.prices = [grav], etikett grav', () => {
  const r = computeRide({ entry: 100, maxFel: 2, rr: 2, grav: 100, ovre: '' });
  assert.deepEqual(r.horizon.prices, [100]);
  assert.equal(r.horizon.label, 'en paper-linje · grav');
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

test('hopp bara vid band+studs; requested utan struktur = håll', () => {
  const hold = computeRide({ entry: 100, maxFel: 2, rr: 2, requested: 104 });
  assert.equal(hold.jump.jumped, false);
  const hop = computeRide({ entry: 100, maxFel: 2, rr: 2, grav: 100, ...bandBounce });
  assert.equal(hop.jump.jumped, true);
  assert.equal(hop.jump.from, 100);
  assert.equal(hop.jump.to, 98);
  assert.equal(hop.jump.windowMs, HOP_WINDOW_MS);
  assert.equal(hop.jump.tell, true);
});

test('mid-air stjäl inte ett andra hopp', () => {
  const hop = rideJump({ ...parseRideInput({ entry: 100, ...bandBounce }), midAir: true }, 100, {
    trail: true,
    band: 'nedre',
  });
  assert.equal(hop.jumped, false);
  assert.equal(hop.reason, 'mid-air');
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

test('hävstång 1–4×: HUD-faktor = fart, aldrig 100×', () => {
  assert.equal(clampLeverage(100), 4);
  assert.equal(clampLeverage(''), 1);
  assert.equal(leverageSpeed(4), 4);
  assert.equal(leverageSpeed(1), 1);
  assert.ok(leverageSpeed(4) > leverageSpeed(1));
  const bumped = commitLeverage({ leverage: 4 }, 1);
  assert.equal(bumped.leverage, 4);
  const r = computeRide({ entry: 100, maxFel: 2, rr: 2, havstang: 100 });
  assert.equal(r.havstang, 4);
  const html = renderPlayArena(r, { leverage: r.havstang });
  assert.match(html, /data-speed="4"/);
  assert.match(html, /data-rider-leverage-hud>4×/);
  assert.match(html, /data-rider-speed-hud>4×/);
  assert.match(html, /--rider-coast-ms:400ms/);
  assert.ok(!/data-rider-(?:leverage|speed)-hud>100×/.test(html));
  assert.equal(coastPeriodMs(1), COAST_PERIOD_MS);
  assert.equal(coastPeriodMs(4) * 4, coastPeriodMs(1));
});

test('reserverade tangenter W/S/F [ ] space; hopp-fönster oberoende av hävstång', () => {
  for (const k of ['w', 's', 'f', '[', ']', ' ']) assert.equal(reservedRiderKey(k), true);
  const hop1 = computeRide({ entry: 100, maxFel: 2, rr: 2, grav: 100, havstang: 1, ...bandBounce });
  const hop4 = computeRide({ entry: 100, maxFel: 2, rr: 2, grav: 100, havstang: 4, ...bandBounce });
  assert.equal(hop1.jump.windowMs, HOP_WINDOW_MS);
  assert.equal(hop4.jump.windowMs, HOP_WINDOW_MS);
});

test('W/S räls commit är steglös i state (ingen delay i funktionen)', () => {
  const rails = [98, 100, 104];
  const up = commitRail({ rail: 1 }, rails, 1);
  assert.equal(up.rail, 2);
  const down = commitRail(up, rails, -1);
  assert.equal(down.rail, 1);
  const keyed = handleRiderKey({ rail: 1, sit: 1, leverage: 1, lens: 1 }, rails, 'w');
  assert.equal(keyed.rail, 2);
  assert.equal(keyed.commit, 'rail');
  const follow = handleRiderKey(keyed, rails, 'f');
  assert.equal(follow.sit, 2);
  assert.equal(follow.commit, 'follow');
});

test('tempo är lins, inte fill; live stannar låst', () => {
  assert.equal(tempoToLens('2'), 2);
  assert.equal(tempoToLens(''), null);
  assert.equal(tempoToLens('snabb fill'), null);
  const a = computeRide({ entry: 100, maxFel: 2, rr: 2, tempo: '2' });
  const b = computeRide({ entry: 100, maxFel: 2, rr: 2, tempo: '' });
  assert.equal(a.ok, true);
  assert.equal(a.sl, b.sl);
  assert.equal(a.tp, b.tp);
  assert.equal(a.live, false);
  assert.equal(LIVE_LOCKED, true);
});

test('space/tempo-lins cyklar, ändrar inte fill', () => {
  const a = cycleLens({ lens: 1 });
  assert.equal(a.lens, 1.5);
  const b = cycleLens(a);
  assert.equal(b.lens, 2);
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
    pilotVolume: '',
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
  assert.equal(loaded.pilotVolume, '');

  const missing = loadRideTemplate('GULDR', store);
  assert.equal(missing.tillgang, 'GULDR');
  assert.equal(missing.entry, '');
  assert.equal(missing.maxFel, '');
  assert.equal(missing.rr, '');
});

test('arena-UI A–E: tom play-rad, kicker inte lampa, hopp from→to', () => {
  const emptyPlay = renderPlayArena(null);
  assert.match(emptyPlay, /rider-play is-empty/);
  assert.match(emptyPlay, /Fyll pilotvolym · entry · max-fel · RR · grav/);
  assert.ok(!/saknar horisont|saknar kust|saknar hävstång/i.test(emptyPlay));

  const hop = computeRide({ entry: 100, maxFel: 2, rr: 2, grav: 100, ...bandBounce });
  const hopHtml = renderRideResult(hop);
  assert.match(hopHtml, /is-jump/);
  assert.match(hopHtml, /→/);
  assert.match(hopHtml, /98/);

  const hold = computeRide({ entry: 100, maxFel: 2, rr: 2 });
  const holdHtml = renderRideResult(hold);
  assert.match(holdHtml, /is-hold/);
  assert.match(holdHtml, /Håll/);
  assert.ok(!/saknar_rsi|saknar_bb|saknar_coast|WATCHERS|anden i lampan/i.test(holdHtml));

  const page = renderRider(emptyRideDraft(), null);
  assert.match(page, /Trade Rider · paper/);
  assert.match(page, /PAPER · live=false · ingen mäklare/);
  assert.match(page, /id="rider-core"/);
  assert.match(page, /id="rider-advanced"/);
  assert.match(page, /data-action="rider-first"/);
  assert.match(page, /Första paper-ride/);
  assert.match(page, /Minst: tillgång, pilotvolym, entry, max-fel, RR/);
  assert.ok(!/WATCHERS · anden i lampan/.test(page));
  assert.equal(coreIncomplete(emptyRideDraft()), true);
});
