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
  hasCompletedFirstRide,
  markFirstRideComplete,
  smaBeloppUnlocked,
  smaBeloppHint,
  inheritPilotVolume,
  rideImpulse,
  RIDER_FIRST_RIDE_KEY,
  TILLGANGAR,
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
  assert.match(
    emptyPlay,
    /Fyll pilotvolym · entry · max-fel · RR · grav — sedan Räkna\. Paper\. Inte live\./,
  );
  assert.ok(!/saknar horisont|saknar kust|saknar hävstång/i.test(emptyPlay));
  assert.equal((emptyPlay.match(/<p /g) || []).length, 1);

  const blocked = renderPlayArena({ ok: false });
  assert.match(blocked, /rider-play is-empty/);
  assert.ok(!/saknar horisont|saknar kust|saknar hävstång/i.test(blocked));

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

  const none = renderRideResult(null);
  assert.match(
    none,
    /Minst: tillgång, pilotvolym, entry, max-fel, RR\. Grav ger arenan\. Resten under Avancerat\./,
  );

  const page = renderRider(emptyRideDraft(), null);
  assert.match(page, /Trade Rider · paper/);
  assert.match(page, /PAPER · live=false · ingen mäklare/);
  assert.match(page, /id="rider-core"/);
  assert.match(page, /<details id="rider-advanced">/);
  assert.ok(!/<details id="rider-advanced" open/.test(page));
  assert.match(page, /data-action="rider-first"/);
  assert.match(page, /aria-describedby="rider-first-hint"/);
  assert.match(page, /Första paper-ride/);
  for (const name of ['tillgang', 'side', 'pilotVolume', 'entry', 'maxFel', 'rr', 'grav']) {
    assert.match(page, new RegExp(`id="rider-core"[\\s\\S]*name="${name}"`));
  }
  for (const name of ['requested', 'current', 'rsi', 'bbLower', 'bbUpper', 'bounce', 'ovre', 'undre', 'havstang', 'cluster']) {
    assert.match(page, new RegExp(`id="rider-advanced"[\\s\\S]*name="${name}"`));
    assert.ok(!new RegExp(`id="rider-core"[\\s\\S]*name="${name}"[\\s\\S]*id="rider-advanced"`).test(page));
  }
  assert.ok(!/WATCHERS · anden i lampan/.test(page));
  assert.match(page, /magazine-hud is-extra/);
  assert.match(page, /Primär yta är Magasinet/);
  assert.doesNotMatch(page, /PNL|pnl/);
  assert.equal(coreIncomplete(emptyRideDraft()), true);

  const filled = renderRider(
    { ...emptyRideDraft(), pilotVolume: '1', entry: '100', maxFel: '2', rr: '2', grav: '100' },
    computeRide({ entry: 100, maxFel: 2, rr: 2, grav: 100 }),
  );
  assert.ok(!/data-action="rider-first"/.test(filled));
});

test('första-ride-grind: före/efter completed ride låser små belopp', () => {
  const store = memStore();
  assert.equal(hasCompletedFirstRide(store), false);
  assert.equal(smaBeloppUnlocked(store), false);
  const lockedHint = smaBeloppHint(store);
  assert.equal(lockedHint.unlocked, false);
  assert.equal(lockedHint.mode, '');
  assert.equal(lockedHint.note, '');

  const lockedPage = renderRider(emptyRideDraft(), null, 0, {}, { hasCompletedFirstRide: false });
  assert.ok(!/data-sma-belopp/.test(lockedPage));
  assert.ok(!/små belopp/i.test(lockedPage));
  assert.match(lockedPage, /data-first-ride="0"/);

  markFirstRideComplete(store);
  assert.equal(store.getItem(RIDER_FIRST_RIDE_KEY), 'true');
  assert.equal(hasCompletedFirstRide(store), true);
  assert.equal(smaBeloppUnlocked(store), true);
  const openHint = smaBeloppHint(store);
  assert.equal(openHint.unlocked, true);
  assert.equal(openHint.mode, 'sma-belopp');
  assert.match(openHint.note, /små belopp/i);
  assert.match(openHint.note, /risken stannar/i);
  assert.match(openHint.note, /robot höjer aldrig/i);
  assert.ok(!/\d+\s*kr/i.test(openHint.note));

  const okRide = computeRide({ entry: 100, maxFel: 2, rr: 2, grav: 100, pilotVolume: 0.01, tillgang: 'ROBOT' });
  const openPage = renderRider(
    { ...emptyRideDraft(), pilotVolume: '0.01', entry: '100', maxFel: '2', rr: '2', grav: '100' },
    okRide,
    0,
    {},
    { hasCompletedFirstRide: true, liveLocked: true },
  );
  assert.match(openPage, /data-sma-belopp/);
  assert.match(openPage, /små belopp/i);
  assert.match(openPage, /data-first-ride="1"/);
  assert.equal(LIVE_LOCKED, true);
  assert.equal(okRide.live, false);
  assert.equal(okRide.paper, true);
  assert.equal(okRide.pilotVolume, 0.01);
});

test('LIVE_LOCKED och paper-stämplar oförändrade kring grind och impulse', () => {
  assert.equal(LIVE_LOCKED, true);
  const before = computeRide({ entry: 100, maxFel: 2, rr: 2 });
  const after = computeRide({ entry: 100, maxFel: 2, rr: 2, pilotVolume: 0.25 });
  assert.equal(before.live, false);
  assert.equal(before.paper, true);
  assert.equal(before.advice, false);
  assert.equal(after.live, false);
  assert.equal(after.paper, true);
  assert.equal(after.pilotVolume, 0.25);
  assert.equal(inheritPilotVolume(0.25, 4), 0.25);
  assert.equal(inheritPilotVolume(null, 4), null);
  assert.equal(inheritPilotVolume(2, 1), 1);
});

test('impulse syns mjukt före process; tyst efter första ride + SL/TP', () => {
  const rushVol = rideImpulse({ pilotVolume: 1, entry: '', maxFel: '', rr: '' }, { leverage: 1 });
  assert.equal(rushVol.visible, true);
  assert.equal(rushVol.kind, 'volym');
  assert.match(rushVol.note, /process före fart/i);

  const rushLev = rideImpulse({ entry: 100, maxFel: 2, rr: 2 }, { leverage: 4 }, { hasCompletedFirstRide: false });
  assert.equal(rushLev.visible, true);
  assert.equal(rushLev.kind, 'fart');

  const calm = rideImpulse(
    { entry: 100, maxFel: 2, rr: 2, pilotVolume: 1 },
    { leverage: 1 },
    { hasCompletedFirstRide: true },
  );
  assert.equal(calm.visible, false);
  assert.equal(calm.note, '');

  const rushPage = renderRider(
    { ...emptyRideDraft(), pilotVolume: '1' },
    null,
    0,
    { leverage: 1 },
    { hasCompletedFirstRide: false },
  );
  assert.match(rushPage, /data-impulse="1"/);
  assert.match(rushPage, /data-rider-impulse/);
  assert.match(rushPage, /Process före fart/);
});

test('ROBOT / AIIND / GULDR förblir åtskilda; grind är global', () => {
  assert.deepEqual(TILLGANGAR, ['ROBOT', 'AIIND', 'GULDR']);
  const store = memStore();
  saveRideTemplate('ROBOT', { ...emptyRideDraft(), tillgang: 'ROBOT', entry: '10' }, store);
  saveRideTemplate('AIIND', { ...emptyRideDraft(), tillgang: 'AIIND', entry: '20' }, store);
  markFirstRideComplete(store);
  assert.equal(loadRideTemplate('ROBOT', store).entry, '10');
  assert.equal(loadRideTemplate('AIIND', store).entry, '20');
  assert.equal(loadRideTemplate('GULDR', store).entry, '');
  assert.equal(hasCompletedFirstRide(store), true);
});

test('32-bit HUD är silhuett, inte textvägg; inga nya play-knappar', () => {
  const emptyPlay = renderPlayArena(null);
  assert.match(emptyPlay, /data-bit="32"/);
  assert.match(emptyPlay, /rider-scanlines/);
  assert.match(emptyPlay, /data-rider-sil/);
  assert.match(emptyPlay, /data-verbs="w s f \[ \] space"/);
  assert.match(emptyPlay, /data-rider-lev-sil/);
  assert.ok(!/<button/i.test(emptyPlay));
  assert.ok(!/data-action="rider-key"|data-rider-pad|rider-rail-pick/i.test(emptyPlay));
  assert.ok(!/WATCHERS|anden i lampan|grimoire/i.test(emptyPlay));

  const ride = computeRide({ entry: 100, maxFel: 2, rr: 2, grav: 100 });
  const play = renderPlayArena(ride, { leverage: 2, lens: 1, rail: 0, sit: 0 });
  assert.match(play, /rider-mark-pip/);
  assert.match(play, /data-rider-sil/);
  assert.match(play, /data-lev="2"/);
  assert.match(play, /data-lev-bar="4"/);
  assert.ok(!/<button/i.test(play));
  assert.ok(!/data-action="rider-rail-pick"|data-rider-pad/i.test(play));
  assert.ok(!/W\/S räls · F fäst/.test(play));

  const hop = computeRide({ entry: 100, maxFel: 2, rr: 2, grav: 100, ...bandBounce });
  const hopHtml = renderPlayArena(hop);
  assert.match(hopHtml, /rider-hop-tell/);
  assert.match(hopHtml, /data-mode="hop"/);

  const page = renderRider(emptyRideDraft(), null);
  const outAt = page.indexOf('id="rider-out"');
  const formAt = page.indexOf('id="rider-form"');
  assert.ok(outAt >= 0 && formAt > outAt);
  assert.match(page, /data-rider-process/);
  assert.match(page, /Process före fart/);
  assert.match(page, /data-rider-no-wsf/);
  assert.ok(!/WATCHERS · anden i lampan/.test(page));
});

test('playfeel-verb: W/S/F instant, häv 1–4 ärlig, space=lins, Robban stjäl inte', () => {
  const rails = [98, 100, 104];
  const start = { rail: 1, sit: 1, leverage: 1, lens: 1 };
  const w = handleRiderKey(start, rails, 'w');
  assert.equal(w.rail, 2);
  assert.equal(w.commit, 'rail');
  const s = handleRiderKey(w, rails, 's');
  assert.equal(s.rail, 1);
  const f = handleRiderKey(s, rails, 'f');
  assert.equal(f.sit, 1);
  assert.equal(f.commit, 'follow');
  const up = handleRiderKey({ ...start, leverage: 3 }, rails, ']');
  assert.equal(up.leverage, 4);
  const cap = handleRiderKey(up, rails, ']');
  assert.equal(cap.leverage, 4);
  const lens = handleRiderKey(start, rails, ' ');
  assert.equal(lens.lens, 1.5);
  assert.equal(lens.commit, 'lens');
  for (const k of ['w', 's', 'f', '[', ']', ' ']) assert.equal(reservedRiderKey(k), true);
  const page = renderRider(emptyRideDraft(), null);
  assert.match(page, /id="rider-robban"/);
  assert.match(page, /Menyn tar inte W\/S\/F/);
  assert.equal(LIVE_LOCKED, true);
});
