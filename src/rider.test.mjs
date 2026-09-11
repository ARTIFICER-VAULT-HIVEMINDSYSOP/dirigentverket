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
  rideTrail,
  reservedRiderKey,
  handleRiderKey,
  rideRails,
  playRails,
  dryRunRails,
  DRY_RUN_SLOTS,
  emptyPlayState,
  tempoToLens,
  HOP_WINDOW_MS,
  COAST_PERIOD_MS,
  LIVE_LOCKED,
  hasCompletedFirstRide,
  markFirstRideComplete,
  smaBeloppUnlocked,
  smaBeloppHint,
  RIDER_SMA_NOTE,
  RIDER_SMA_UNLOCK_NOTE,
  inheritPilotVolume,
  rokadVolume,
  rideRokad,
  rideHedge,
  hedgeBandFade,
  emptyHedgeFade,
  HEDGE_FADE_MS,
  RIDER_ROKAD_GATE,
  rideImpulse,
  RIDER_IMPULSE_NOTE,
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
  for (const name of ['requested', 'current', 'rsi', 'bbLower', 'bbUpper', 'bounce', 'ovre', 'undre', 'havstang', 'cluster', 'prognos', 'prognosRr', 'hallaRr', 'priceSeries', 'minFrequency']) {
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
  assert.match(openPage, /data-sma-unlock="0"/);
  assert.match(openPage, /små belopp/i);
  assert.match(openPage, /data-first-ride="1"/);
  assert.match(openPage, /data-sma-fresh="0"/);
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
  assert.equal(rushVol.note, RIDER_IMPULSE_NOTE);
  assert.ok(!/\d+\s*kr/i.test(rushVol.note));

  const rushLev = rideImpulse({ entry: 100, maxFel: 2, rr: 2 }, { leverage: 4 }, { hasCompletedFirstRide: false });
  assert.equal(rushLev.visible, true);
  assert.equal(rushLev.kind, 'fart');

  const calm = rideImpulse(
    { entry: 100, maxFel: 2, rr: 2, grav: 100, pilotVolume: 1 },
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
  assert.doesNotMatch(rushPage, /data-rider-impulse[^>]*\shidden/);
  assert.match(rushPage, /Process före fart/);
  assert.ok(!/<dialog/i.test(rushPage));

  const idlePage = renderRider(emptyRideDraft(), null, 0, { leverage: 1 }, { hasCompletedFirstRide: false });
  assert.match(idlePage, /data-impulse="0"/);
  assert.match(idlePage, /data-rider-impulse[^>]*\shidden/);
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

test('mjuk impuls efter Räkna när häv/volym finns men kärna saknas', () => {
  const afterLevDraft = { ...emptyRideDraft(), entry: '100', maxFel: '2', rr: '2' };
  const afterLevRide = computeRide(afterLevDraft);
  assert.equal(afterLevRide.ok, true);
  const afterLev = rideImpulse(afterLevDraft, { leverage: 3 }, { hasCompletedFirstRide: true });
  assert.equal(afterLev.visible, true);
  assert.equal(afterLev.kind, 'fart');
  assert.equal(afterLev.note, RIDER_IMPULSE_NOTE);
  assert.ok(!/\d+\s*kr|P&L|pnl/i.test(afterLev.note));

  const afterVolDraft = { ...emptyRideDraft(), entry: '100', maxFel: '2', rr: '2', pilotVolume: '1' };
  const afterVolRide = computeRide(afterVolDraft);
  assert.equal(afterVolRide.ok, true);
  const afterVol = rideImpulse(afterVolDraft, { leverage: 1 }, { hasCompletedFirstRide: true });
  assert.equal(afterVol.visible, true);
  assert.equal(afterVol.kind, 'volym');

  const afterPage = renderRider(afterLevDraft, afterLevRide, 0, { leverage: 3 }, { hasCompletedFirstRide: true });
  assert.match(afterPage, /data-impulse="1"/);
  assert.match(afterPage, /data-rider-impulse/);
  assert.doesNotMatch(afterPage, /data-rider-impulse[^>]* hidden/);
  assert.ok(!/<dialog/i.test(afterPage));
  assert.ok(!/data-rider-pad|data-action="rider-key"/i.test(afterPage));
  assert.ok(!/WATCHERS|anden i lampan/i.test(afterPage));
  assert.equal(LIVE_LOCKED, true);

  const quietDraft = {
    ...emptyRideDraft(),
    entry: '100',
    maxFel: '2',
    rr: '2',
    grav: '100',
    pilotVolume: '1',
  };
  const quiet = rideImpulse(quietDraft, { leverage: 4 }, { hasCompletedFirstRide: true });
  assert.equal(quiet.visible, false);
  const quietPage = renderRider(quietDraft, computeRide(quietDraft), 0, { leverage: 4 }, { hasCompletedFirstRide: true });
  assert.match(quietPage, /data-impulse="0"/);
  assert.match(quietPage, /data-rider-impulse[^>]*\shidden/);
});

test('fylld arena kolla-grafen: coast/scanlines/silhuett lever med häv=fart', () => {
  const ride = computeRide({ entry: 100, maxFel: 2, rr: 2, grav: 100 });
  const html = renderPlayArena(ride, { leverage: 3, lens: 1, rail: 0, sit: 0 });
  assert.equal(ride.ok, true);
  assert.match(html, /data-look="1"/);
  assert.match(html, /is-looking/);
  assert.match(html, new RegExp(`--rider-coast-ms:${coastPeriodMs(3)}ms`));
  assert.equal(coastPeriodMs(3) * 3, COAST_PERIOD_MS);
  assert.match(html, /rider-scanlines/);
  assert.match(html, /rider-speed-scan/);
  assert.match(html, /data-rider-sil/);
  assert.match(html, /data-speed="3"/);
  assert.match(html, /data-verbs="w s f \[ \] space"/);
  assert.ok(!/<button/i.test(html));
  assert.ok(!/data-rider-pad|data-action="rider-key"|rider-rail-pick/i.test(html));
  assert.ok(!/WATCHERS|anden i lampan|grimoire/i.test(html));
  assert.ok(!/\d+\s*kr/i.test(html));
  assert.doesNotMatch(html, /P&L|pnl/);
  assert.equal(LIVE_LOCKED, true);

  const empty = renderPlayArena(null);
  assert.ok(!/data-look="1"/.test(empty));
  assert.ok(!/is-looking/.test(empty));
  assert.match(empty, /data-dry-run="1"/);
});

test('hopp-tell syns mjukt på arena och silhuett-HUD', () => {
  const hop = computeRide({ entry: 100, maxFel: 2, rr: 2, grav: 100, ...bandBounce });
  assert.equal(hop.ok, true);
  assert.equal(hop.jump.jumped, true);
  assert.equal(hop.jump.tell, true);
  assert.equal(hop.jump.from, 100);
  assert.equal(hop.jump.to, 98);

  const html = renderPlayArena(hop);
  assert.match(html, /data-hop-tell="1"/);
  assert.match(html, /data-rider-hop-tell/);
  assert.match(html, /rider-hop-tell/);
  assert.match(html, /rider-sil-tell/);
  assert.match(html, /is-tell/);
  assert.match(html, /data-mode="hop"/);
  assert.match(html, /process före fart/);
  assert.match(html, /100 → 98|100 →/);
  assert.ok(!/<button/i.test(html));
  assert.ok(!/<dialog/i.test(html));
  assert.ok(!/data-rider-pad|data-action="rider-key"/i.test(html));
  assert.ok(!/WATCHERS|anden i lampan/i.test(html));
  assert.ok(!/\d+\s*kr/i.test(html));
  assert.doesNotMatch(html, /P&L|pnl/);
  assert.equal(LIVE_LOCKED, true);

  const hold = renderPlayArena(computeRide({ entry: 100, maxFel: 2, rr: 2, grav: 100 }));
  assert.match(hold, /data-hop-tell="0"/);
  assert.ok(!/data-rider-hop-tell/.test(hold));
  assert.ok(!/rider-sil-tell/.test(hold));
});

test('första-ride-unlock: små belopp känns intjänad, inte skrikig', () => {
  const store = memStore();
  const locked = smaBeloppHint(store);
  assert.equal(locked.unlocked, false);
  assert.equal(locked.fresh, false);
  assert.equal(locked.note, '');

  markFirstRideComplete(store);
  const earned = smaBeloppHint(store);
  assert.equal(earned.unlocked, true);
  assert.equal(earned.fresh, false);
  assert.equal(earned.note, RIDER_SMA_NOTE);

  const fresh = smaBeloppHint(store, { fresh: true });
  assert.equal(fresh.unlocked, true);
  assert.equal(fresh.fresh, true);
  assert.equal(fresh.note, RIDER_SMA_UNLOCK_NOTE);
  assert.match(fresh.note, /intjänad/i);
  assert.ok(!/\d+\s*kr|P&L|pnl/i.test(fresh.note));

  const emptyVol = computeRide({ entry: 100, maxFel: 2, rr: 2, grav: 100 });
  assert.equal(emptyVol.ok, true);
  assert.equal(emptyVol.pilotVolume, null);
  assert.equal(inheritPilotVolume(null, 4), null);
  assert.equal(inheritPilotVolume(0.01, 8), 0.01);

  const page = renderRider(
    { ...emptyRideDraft(), entry: '100', maxFel: '2', rr: '2', grav: '100' },
    emptyVol,
    0,
    {},
    { hasCompletedFirstRide: true, justUnlocked: true, liveLocked: true },
  );
  assert.match(page, /data-sma-fresh="1"/);
  assert.match(page, /has-sma-unlock/);
  assert.match(page, /data-sma-unlock="1"/);
  assert.match(page, /is-unlock/);
  assert.match(page, /Intjänad/);
  assert.match(page, /data-sma-belopp/);
  assert.ok(!/<dialog/i.test(page));
  assert.ok(!/data-rider-pad|data-action="rider-key"/i.test(page));
  assert.ok(!/WATCHERS|anden i lampan/i.test(page));
  assert.ok(!/\d+\s*kr/i.test(page));
  assert.equal(LIVE_LOCKED, true);
  assert.equal(emptyVol.live, false);
});

test('struktur-trail: SL krymper bara när RSI+BB+budstuds; annars orörd', () => {
  const shrink = computeRide({
    entry: 98,
    maxFel: 2,
    rr: 2,
    grav: 98,
    current: 99,
    rsi: 28,
    bbLower: 98,
    bbUpper: 106,
    bounce: 'nedre',
    side: 'köp',
    pilotVolume: 0.25,
  });
  assert.equal(shrink.ok, true);
  assert.equal(shrink.structure.trail, true);
  assert.equal(shrink.trail.trailed, true);
  assert.equal(shrink.trail.tell, true);
  assert.equal(shrink.sl0, 96);
  assert.equal(shrink.sl, 97);
  assert.ok(shrink.sl > shrink.sl0);
  assert.equal(shrink.pilotVolume, 0.25);
  assert.equal(inheritPilotVolume(0.25, 4), 0.25);
  assert.equal(LIVE_LOCKED, true);
  assert.equal(shrink.live, false);

  const held = computeRide({
    entry: 98,
    maxFel: 2,
    rr: 2,
    grav: 98,
    current: 99,
    rsi: 28,
    bbLower: 98,
    bbUpper: 106,
    bounce: 'nej',
    side: 'köp',
  });
  assert.equal(held.structure.trail, false);
  assert.equal(held.trail.trailed, false);
  assert.equal(held.trail.tell, false);
  assert.equal(held.sl, 96);
  assert.equal(held.sl0, 96);

  const blank = computeRide({ entry: 98, maxFel: 2, rr: 2, grav: 98, rsi: 28, bbLower: 98, bbUpper: 106, bounce: 'nedre' });
  assert.equal(blank.trail.trailed, false);
  assert.equal(blank.sl, 96);
  assert.equal(blank.input.current, null);

  const hopOnly = computeRide({ entry: 100, maxFel: 2, rr: 2, grav: 100, ...bandBounce });
  assert.equal(hopOnly.jump.tell, true);
  assert.equal(hopOnly.trail.trailed, false);
  assert.equal(hopOnly.sl, 98);

  const levels = { sl: 96, dist: 2, side: 'köp', entry: 98 };
  const widen = rideTrail({ current: 99 }, levels, { trail: true });
  assert.ok(widen.sl >= 96);
});

test('struktur-trail-tell syns mjukt på arena och silhuett-HUD', () => {
  const ride = computeRide({
    entry: 98,
    maxFel: 2,
    rr: 2,
    grav: 98,
    current: 99,
    rsi: 28,
    bbLower: 98,
    bbUpper: 106,
    bounce: 'nedre',
    side: 'köp',
  });
  const html = renderPlayArena(ride);
  assert.match(html, /data-trail-tell="1"/);
  assert.match(html, /data-rider-trail-tell/);
  assert.match(html, /data-trail="1"/);
  assert.match(html, /SL krymper/);
  assert.match(html, /process före fart/);
  assert.ok(!/<button/i.test(html));
  assert.ok(!/<dialog/i.test(html));
  assert.ok(!/data-rider-pad|data-action="rider-key"/i.test(html));
  assert.ok(!/WATCHERS|anden i lampan/i.test(html));
  assert.ok(!/\d+\s*kr/i.test(html));
  assert.doesNotMatch(html, /P&L|pnl/);
  assert.equal(LIVE_LOCKED, true);

  const quiet = renderPlayArena(computeRide({ entry: 100, maxFel: 2, rr: 2, grav: 100 }));
  assert.match(quiet, /data-trail-tell="0"/);
  assert.ok(!/data-rider-trail-tell/.test(quiet));
});

test('rokad-tell: vänd sida, volym −25 % av pilot, tom volym stannar tom', () => {
  const cut = computeRide({
    entry: 100,
    maxFel: 2,
    rr: 2,
    grav: 100,
    side: 'köp',
    prognos: 'sälj',
    prognosRr: 2,
    pilotVolume: 1,
  });
  assert.equal(cut.ok, true);
  assert.equal(cut.rokad.tell, true);
  assert.equal(cut.rokad.available, true);
  assert.equal(cut.rokad.rokad, true);
  assert.equal(cut.rokad.from, 'köp');
  assert.equal(cut.rokad.to, 'sälj');
  assert.equal(cut.rokad.volymFaktor, 0.75);
  assert.equal(cut.rokad.nyVolym, 0.75);
  assert.equal(cut.rokad.paper, true);
  assert.equal(cut.rokad.live, false);
  assert.equal(cut.rokad.flattenNow, false);
  assert.equal(cut.pilotVolume, 1);
  assert.equal(rokadVolume(1), 0.75);
  assert.equal(inheritPilotVolume(1, rokadVolume(1)), 0.75);
  assert.equal(inheritPilotVolume(1, 2), 1);
  assert.equal(inheritPilotVolume(1, 4), 1);
  assert.equal(LIVE_LOCKED, true);
  assert.equal(cut.live, false);
  assert.match(cut.rokad.gate, /ÖB godkänner/);
  assert.equal(cut.rokad.gate, RIDER_ROKAD_GATE);
  assert.ok(!/\d+\s*kr/i.test(cut.rokad.note));
  assert.doesNotMatch(cut.rokad.note, /P&L|pnl/);

  const emptyVol = computeRide({
    entry: 100,
    maxFel: 2,
    rr: 2,
    grav: 100,
    side: 'köp',
    prognos: 'sälj',
    prognosRr: 2,
  });
  assert.equal(emptyVol.rokad.tell, true);
  assert.equal(emptyVol.rokad.nyVolym, null);
  assert.equal(emptyVol.pilotVolume, null);
  assert.equal(rokadVolume(''), null);
  assert.equal(rokadVolume(null), null);
  assert.equal(rokadVolume(undefined), null);

  const same = computeRide({
    entry: 100,
    maxFel: 2,
    rr: 2,
    grav: 100,
    side: 'köp',
    prognos: 'köp',
    prognosRr: 2,
    pilotVolume: 1,
  });
  assert.equal(same.rokad.tell, false);
  assert.equal(same.rokad.nyVolym, null);

  const blank = computeRide({
    entry: 100,
    maxFel: 2,
    rr: 2,
    grav: 100,
    side: 'köp',
    prognosRr: 2,
    pilotVolume: 1,
  });
  assert.equal(blank.rokad.tell, false);
  assert.equal(blank.rokad.nyVolym, null);

  const noRr = computeRide({
    entry: 100,
    maxFel: 2,
    rr: 2,
    grav: 100,
    side: 'köp',
    prognos: 'sälj',
    pilotVolume: 1,
  });
  assert.equal(noRr.rokad.tell, false);

  const lens = computeRide({
    entry: 100,
    maxFel: 2,
    rr: 2,
    grav: 100,
    side: 'köp',
    prognos: 'sälj',
    prognosRr: 2,
    tempo: '1.5',
    pilotVolume: 1,
  });
  assert.equal(lens.rokad.tell, true);
  assert.equal(lens.rokad.flattenNow, false);
  assert.equal(lens.rokad.action, 'byt_hall');

  const flip = rideRokad({ side: 'sälj', prognos: 'köp', prognosRr: 2, pilotVolume: 1 });
  assert.equal(flip.from, 'sälj');
  assert.equal(flip.to, 'köp');
  assert.equal(flip.nyVolym, 0.75);
});

test('rokad-tell syns mjukt på arena och silhuett-HUD', () => {
  const ride = computeRide({
    entry: 100,
    maxFel: 2,
    rr: 2,
    grav: 100,
    side: 'köp',
    prognos: 'sälj',
    prognosRr: 2,
    pilotVolume: 1,
  });
  const html = renderPlayArena(ride);
  assert.match(html, /data-rokad-tell="1"/);
  assert.match(html, /data-rider-rokad-tell/);
  assert.match(html, /data-rokad="1"/);
  assert.match(html, /data-mode="rokad"/);
  assert.match(html, /data-rider-side-sil/);
  assert.match(html, /data-rokad-from="köp"/);
  assert.match(html, /data-rokad-to="sälj"/);
  assert.match(html, /köp → sälj/);
  assert.match(html, /volym −25 %/);
  assert.match(html, /0,75/);
  assert.match(html, /ÖB godkänner/);
  assert.match(html, /data-rokad-gate="1"/);
  assert.match(html, /process före fart/);
  assert.match(html, /data-verbs="w s f \[ \] space"/);
  assert.ok(!/<button/i.test(html));
  assert.ok(!/<dialog/i.test(html));
  assert.ok(!/data-rider-pad|data-action="rider-key"/i.test(html));
  assert.ok(!/WATCHERS|anden i lampan/i.test(html));
  assert.ok(!/\d+\s*kr/i.test(html));
  assert.doesNotMatch(html, /P&L|pnl/);
  assert.equal(reservedRiderKey('r'), false);
  assert.equal(reservedRiderKey('o'), false);
  assert.equal(LIVE_LOCKED, true);

  const emptyVol = renderPlayArena(
    computeRide({
      entry: 100,
      maxFel: 2,
      rr: 2,
      grav: 100,
      side: 'köp',
      prognos: 'sälj',
      prognosRr: 2,
    }),
  );
  assert.match(emptyVol, /data-rokad-tell="1"/);
  assert.match(emptyVol, /volym −25 %/);
  assert.ok(!/0,75/.test(emptyVol));
  assert.ok(!/\d+\s*kr/i.test(emptyVol));

  const quiet = renderPlayArena(computeRide({ entry: 100, maxFel: 2, rr: 2, grav: 100 }));
  assert.match(quiet, /data-rokad-tell="0"/);
  assert.ok(!/data-rider-rokad-tell/.test(quiet));
  assert.ok(!/data-mode="rokad"/.test(quiet));
});

test('mitt-hedge-tell: kursserie + band, tom serie = ingen tell', () => {
  const on = computeRide({
    entry: 105,
    maxFel: 2,
    rr: 2,
    grav: 105,
    bbLower: 100,
    bbUpper: 110,
    priceSeries: '100\n110\n100\n110',
  });
  assert.equal(on.ok, true);
  assert.equal(on.hedge.tell, true);
  assert.equal(on.hedge.proposed, true);
  assert.equal(on.hedge.mode, 'mitt_hedge');
  assert.equal(on.hedge.entry, 105);
  assert.equal(on.hedge.paper, true);
  assert.equal(on.hedge.live, false);
  assert.equal(LIVE_LOCKED, true);

  const quiet = computeRide({ entry: 100, maxFel: 2, rr: 2, grav: 100, bbLower: 100, bbUpper: 110 });
  assert.equal(quiet.hedge.tell, false);
  assert.equal(quiet.hedge.proposed, false);
  assert.equal(quiet.hedge.freqPip, false);
  assert.equal(quiet.hedge.saknas, true);
  assert.deepEqual(quiet.hedge.ghosts, []);

  const few = computeRide({
    entry: 105,
    maxFel: 2,
    rr: 2,
    grav: 105,
    bbLower: 100,
    bbUpper: 110,
    priceSeries: '100\n110\n100',
  });
  assert.equal(few.hedge.tell, false);
  assert.equal(few.hedge.freqPip, true);
  assert.equal(few.hedge.saknas, false);
  assert.equal(few.hedge.count, 2);
  assert.deepEqual(few.hedge.ghosts, []);

  const onlyHedge = rideHedge({
    bbLower: 100,
    bbUpper: 110,
    priceSeries: '100\n110\n100\n110',
    maxFel: 2,
  });
  assert.equal(onlyHedge.tell, true);
  assert.equal(onlyHedge.entry, 105);
});

test('mitt-hedge-tell syns mjukt på arena och silhuett-HUD', () => {
  const ride = computeRide({
    entry: 105,
    maxFel: 2,
    rr: 2,
    grav: 105,
    bbLower: 100,
    bbUpper: 110,
    priceSeries: '100\n110\n100\n110',
  });
  const html = renderPlayArena(ride);
  assert.match(html, /data-hedge-tell="1"/);
  assert.match(html, /data-rider-hedge-tell/);
  assert.match(html, /data-hedge="1"/);
  assert.match(html, /data-mode="hedge"/);
  assert.match(html, /köp \+ sälj/);
  assert.match(html, /process före fart/);
  assert.match(html, /ingen order/);
  assert.ok(!/<button/i.test(html));
  assert.ok(!/<dialog/i.test(html));
  assert.ok(!/data-rider-pad|data-action="rider-key"/i.test(html));
  assert.ok(!/WATCHERS|anden i lampan/i.test(html));
  assert.ok(!/\d+\s*kr/i.test(html));
  assert.doesNotMatch(html, /P&L|pnl/);
  assert.equal(LIVE_LOCKED, true);

  const quiet = renderPlayArena(computeRide({ entry: 100, maxFel: 2, rr: 2, grav: 100 }));
  assert.match(quiet, /data-hedge-tell="0"/);
  assert.ok(!/data-rider-hedge-tell/.test(quiet));
  assert.ok(!/data-mode="hedge"/.test(quiet));
});

test('frekvens-pip när svängar är mätbara; saknas när serie/band tomt', () => {
  const on = computeRide({
    entry: 105,
    maxFel: 2,
    rr: 2,
    grav: 105,
    bbLower: 100,
    bbUpper: 110,
    priceSeries: '100\n110\n100\n110',
  });
  assert.equal(on.hedge.freqPip, true);
  assert.equal(on.hedge.saknas, false);
  assert.equal(on.hedge.count, 3);
  assert.equal(on.hedge.ghosts.length, 3);
  assert.equal(on.hedge.ghosts[1].kind, 'mid');
  assert.equal(on.hedge.ghosts[1].at, 105);
  const html = renderPlayArena(on);
  assert.match(html, /data-freq-pip="1"/);
  assert.match(html, /data-freq-saknas="0"/);
  assert.match(html, /data-freq-count="3"/);
  assert.match(html, /data-rider-freq/);
  assert.match(html, /data-hedge-ghost="1"/);
  assert.match(html, /rider-mark-hedge-mid/);
  assert.match(html, /rider-mark-hedge-nedre/);
  assert.ok(!/<button/i.test(html));
  assert.ok(!/<dialog/i.test(html));
  assert.equal(LIVE_LOCKED, true);

  const empty = computeRide({ entry: 100, maxFel: 2, rr: 2, grav: 100 });
  assert.equal(empty.hedge.freqPip, false);
  assert.equal(empty.hedge.saknas, true);
  assert.deepEqual(empty.hedge.ghosts, []);
  const emptyHtml = renderPlayArena(empty);
  assert.match(emptyHtml, /data-freq-saknas="1"/);
  assert.match(emptyHtml, />saknas</);
  assert.match(emptyHtml, /data-hedge-ghost="0"/);
  assert.ok(!/rider-mark-hedge-mid/.test(emptyHtml));

  const badBand = computeRide({
    entry: 105,
    maxFel: 2,
    rr: 2,
    grav: 105,
    bbLower: 110,
    bbUpper: 100,
    priceSeries: '100\n110\n100\n110',
  });
  assert.equal(badBand.hedge.saknas, true);
  assert.equal(badBand.hedge.freqPip, false);
  assert.deepEqual(badBand.hedge.ghosts, []);
  const badHtml = renderPlayArena(badBand);
  assert.match(badHtml, /data-freq-saknas="1"/);
  assert.ok(!/rider-mark-hedge-mid/.test(badHtml));
  assert.ok(!/data-hedge-ghost="1"/.test(badHtml));
});

test('band-silhuett + mitt-pip när mitt-hedge-plan finns; saknas annars', () => {
  const on = computeRide({
    entry: 105,
    maxFel: 2,
    rr: 2,
    grav: 105,
    bbLower: 100,
    bbUpper: 110,
    priceSeries: '100\n110\n100\n110',
  });
  assert.equal(on.hedge.proposed, true);
  assert.equal(on.hedge.bandRails.length, 2);
  assert.equal(on.hedge.bandRails[0].kind, 'nedre');
  assert.equal(on.hedge.bandRails[0].at, 100);
  assert.equal(on.hedge.bandRails[1].kind, 'övre');
  assert.equal(on.hedge.bandRails[1].at, 110);
  assert.equal(on.hedge.midPip.at, 105);
  const html = renderPlayArena(on);
  assert.match(html, /data-hedge-band="1"/);
  assert.match(html, /data-hedge-rail="nedre"/);
  assert.match(html, /data-hedge-rail="övre"/);
  assert.match(html, /data-hedge-mid-pip="1"/);
  assert.match(html, /rider-hedge-rail/);
  assert.match(html, /rider-hedge-mid-pip/);
  assert.ok(!/<button/i.test(html));
  assert.ok(!/<dialog/i.test(html));
  assert.ok(!/data-rider-pad|data-action="rider-key"/i.test(html));
  assert.doesNotMatch(html, /P&L|pnl/);
  assert.equal(LIVE_LOCKED, true);

  const empty = computeRide({ entry: 100, maxFel: 2, rr: 2, grav: 100 });
  assert.deepEqual(empty.hedge.bandRails, []);
  assert.equal(empty.hedge.midPip, null);
  const emptyHtml = renderPlayArena(empty);
  assert.match(emptyHtml, /data-hedge-band="0"/);
  assert.match(emptyHtml, /data-freq-saknas="1"/);
  assert.ok(!/data-hedge-rail=/.test(emptyHtml));
  assert.ok(!/<span class="rider-hedge-rail"/.test(emptyHtml));
  assert.ok(!/<span class="rider-hedge-mid-pip"/.test(emptyHtml));

  const few = computeRide({
    entry: 105,
    maxFel: 2,
    rr: 2,
    grav: 105,
    bbLower: 100,
    bbUpper: 110,
    priceSeries: '100\n110\n100',
  });
  assert.equal(few.hedge.freqPip, true);
  assert.equal(few.hedge.proposed, false);
  assert.deepEqual(few.hedge.bandRails, []);
  assert.equal(few.hedge.midPip, null);
  const fewHtml = renderPlayArena(few);
  assert.match(fewHtml, /data-hedge-band="0"/);
  assert.match(fewHtml, /data-hedge-mid-pip="0"/);
  assert.ok(!/data-hedge-rail=/.test(fewHtml));

  const badBand = computeRide({
    entry: 105,
    maxFel: 2,
    rr: 2,
    grav: 105,
    bbLower: 110,
    bbUpper: 100,
    priceSeries: '100\n110\n100\n110',
  });
  assert.equal(badBand.hedge.saknas, true);
  assert.deepEqual(badBand.hedge.bandRails, []);
  assert.equal(badBand.hedge.midPip, null);
  const badHtml = renderPlayArena(badBand);
  assert.match(badHtml, /data-hedge-band="0"/);
  assert.ok(!/data-hedge-rail=/.test(badHtml));
  assert.ok(!/<span class="rider-hedge-mid-pip"/.test(badHtml));
});

test('frekvens-progress-pip under grind; ger plats när plan blir giltig', () => {
  const few = computeRide({
    entry: 105,
    maxFel: 2,
    rr: 2,
    grav: 105,
    bbLower: 100,
    bbUpper: 110,
    priceSeries: '100\n110\n100',
  });
  assert.equal(few.hedge.proposed, false);
  assert.equal(few.hedge.freqPip, true);
  assert.equal(few.hedge.freqProgress, true);
  assert.equal(few.hedge.freqHave, 2);
  assert.equal(few.hedge.freqNeed, 3);
  assert.equal(few.hedge.midPip, null);
  assert.deepEqual(few.hedge.ghosts, []);
  const fewHtml = renderPlayArena(few);
  assert.match(fewHtml, /data-freq-progress="1"/);
  assert.match(fewHtml, /data-freq-have="2"/);
  assert.match(fewHtml, /data-freq-need="3"/);
  assert.match(fewHtml, /rider-sil-freq is-progress/);
  assert.match(fewHtml, /data-hedge-band="0"/);
  assert.match(fewHtml, /data-hedge-mid-pip="0"/);
  assert.ok(!/rider-mark-hedge-mid/.test(fewHtml));
  assert.ok(!/<span class="rider-hedge-mid-pip"/.test(fewHtml));
  assert.ok(!/<button/i.test(fewHtml));
  assert.doesNotMatch(fewHtml, /P&L|pnl/);
  assert.equal(LIVE_LOCKED, true);

  const on = computeRide({
    entry: 105,
    maxFel: 2,
    rr: 2,
    grav: 105,
    bbLower: 100,
    bbUpper: 110,
    priceSeries: '100\n110\n100\n110',
  });
  assert.equal(on.hedge.proposed, true);
  assert.equal(on.hedge.freqProgress, false);
  assert.equal(on.hedge.freqNeed, null);
  assert.equal(on.hedge.freqHave, null);
  assert.equal(on.hedge.midPip.at, 105);
  const onHtml = renderPlayArena(on);
  assert.match(onHtml, /data-freq-progress="0"/);
  assert.match(onHtml, /data-hedge-mid-pip="1"/);
  assert.match(onHtml, /rider-mark-hedge-mid/);
  assert.ok(!/rider-sil-freq is-progress/.test(onHtml));
  assert.equal((onHtml.match(/rider-mark-hedge-mid/g) || []).length, 1);

  const empty = computeRide({ entry: 100, maxFel: 2, rr: 2, grav: 100 });
  assert.equal(empty.hedge.freqProgress, false);
  const emptyHtml = renderPlayArena(empty);
  assert.match(emptyHtml, /data-freq-progress="0"/);
  assert.match(emptyHtml, /data-freq-saknas="1"/);
  assert.ok(!/rider-sil-freq is-progress/.test(emptyHtml));

  const badBand = computeRide({
    entry: 105,
    maxFel: 2,
    rr: 2,
    grav: 105,
    bbLower: 110,
    bbUpper: 100,
    priceSeries: '100\n110\n100\n110',
  });
  assert.equal(badBand.hedge.freqProgress, false);
  const badHtml = renderPlayArena(badBand);
  assert.match(badHtml, /data-freq-progress="0"/);
  assert.ok(!/rider-sil-freq is-progress/.test(badHtml));

  const zeroSwing = computeRide({
    entry: 105,
    maxFel: 2,
    rr: 2,
    grav: 105,
    bbLower: 100,
    bbUpper: 110,
    priceSeries: '100\n101\n100',
  });
  assert.equal(zeroSwing.hedge.count, 0);
  assert.equal(zeroSwing.hedge.freqProgress, false);
});

test('band-fade när giltig mitt-hedge blir saknas; ingen påhittad mitt', () => {
  const on = computeRide({
    entry: 105,
    maxFel: 2,
    rr: 2,
    grav: 105,
    bbLower: 100,
    bbUpper: 110,
    priceSeries: '100\n110\n100\n110',
  });
  const empty = computeRide({ entry: 100, maxFel: 2, rr: 2, grav: 100 });
  const few = computeRide({
    entry: 105,
    maxFel: 2,
    rr: 2,
    grav: 105,
    bbLower: 100,
    bbUpper: 110,
    priceSeries: '100\n110\n100',
  });
  const badBand = computeRide({
    entry: 105,
    maxFel: 2,
    rr: 2,
    grav: 105,
    bbLower: 110,
    bbUpper: 100,
    priceSeries: '100\n110\n100\n110',
  });
  const noBand = computeRide({
    entry: 105,
    maxFel: 2,
    rr: 2,
    grav: 105,
    priceSeries: '100\n110\n100\n110',
  });

  const toEmpty = hedgeBandFade(on.hedge, empty.hedge);
  assert.equal(toEmpty.fading, true);
  assert.equal(toEmpty.paper, true);
  assert.equal(toEmpty.ms, HEDGE_FADE_MS);
  assert.equal(toEmpty.bandRails.length, 2);
  assert.equal(toEmpty.bandRails[0].at, 100);
  assert.equal(toEmpty.bandRails[1].at, 110);
  assert.equal(toEmpty.midPip.at, 105);
  assert.equal(toEmpty.ghosts.length, 3);

  assert.equal(hedgeBandFade(on.hedge, few.hedge).fading, true);
  assert.equal(hedgeBandFade(on.hedge, badBand.hedge).fading, true);
  assert.equal(hedgeBandFade(on.hedge, noBand.hedge).fading, true);
  assert.equal(hedgeBandFade(on.hedge, on.hedge).fading, false);
  assert.equal(hedgeBandFade(empty.hedge, empty.hedge).fading, false);
  assert.equal(hedgeBandFade(null, empty.hedge).fading, false);
  assert.deepEqual(hedgeBandFade(empty.hedge, empty.hedge).ghosts, []);
  assert.equal(emptyHedgeFade().fading, false);

  const invented = hedgeBandFade({ proposed: true, ghosts: [] }, empty.hedge);
  assert.equal(invented.fading, false);
  assert.deepEqual(invented.ghosts, []);
  assert.equal(invented.midPip, null);

  const fadeHtml = renderPlayArena(empty, { hedgeFade: toEmpty });
  assert.match(fadeHtml, /data-hedge-fade="1"/);
  assert.match(fadeHtml, /is-hedge-fade/);
  assert.match(fadeHtml, /data-hedge-rail="nedre"/);
  assert.match(fadeHtml, /data-hedge-rail="övre"/);
  assert.match(fadeHtml, /data-hedge-mid-pip="1"/);
  assert.match(fadeHtml, /data-freq-saknas="1"/);
  assert.match(fadeHtml, />saknas</);
  assert.match(fadeHtml, /--hedge-fade-ms:1100ms/);
  assert.ok(!/<button/i.test(fadeHtml));
  assert.ok(!/<dialog/i.test(fadeHtml));
  assert.doesNotMatch(fadeHtml, /P&L|pnl/);
  assert.equal(LIVE_LOCKED, true);

  const quietHtml = renderPlayArena(empty);
  assert.match(quietHtml, /data-hedge-fade="0"/);
  assert.ok(!/is-hedge-fade/.test(quietHtml));
  assert.ok(!/data-hedge-rail=/.test(quietHtml));
  assert.match(quietHtml, /data-freq-saknas="1"/);
});

test('tom-arena dry-run: W/S/F/[ ]/Space flyttar silhuett utan påhittade priser', () => {
  const rails = playRails(null);
  assert.deepEqual(rails, dryRunRails());
  assert.equal(rails.length, DRY_RUN_SLOTS);
  assert.ok(rails.every((p) => p === ''));
  assert.deepEqual(playRails({ ok: false }), dryRunRails());

  const start = emptyPlayState();
  const w = handleRiderKey(start, rails, 'w');
  assert.equal(w.rail, 1);
  assert.equal(w.commit, 'rail');
  const f = handleRiderKey(w, rails, 'f');
  assert.equal(f.sit, 1);
  assert.equal(f.commit, 'follow');
  const lev = handleRiderKey(start, rails, ']');
  assert.equal(lev.leverage, 2);
  const cap = handleRiderKey({ ...start, leverage: 4 }, rails, ']');
  assert.equal(cap.leverage, 4);
  const lens = handleRiderKey(start, rails, ' ');
  assert.equal(lens.lens, 1.5);
  assert.equal(lens.commit, 'lens');

  const html = renderPlayArena(null, w);
  assert.match(html, /data-dry-run="1"/);
  assert.match(html, /is-dry-run/);
  assert.match(html, /data-rider-coach/);
  assert.match(html, /Process före fart/);
  assert.match(html, /data-rail-index="0"/);
  assert.match(html, /data-rail-index="2"/);
  assert.match(html, /data-rail="1"/);
  assert.match(html, /data-rail-sil="1"/);
  assert.ok(!/<button/i.test(html));
  assert.ok(!/data-rider-pad|data-action="rider-key"|rider-rail-pick/i.test(html));
  assert.ok(!/data-rail-price="\d+/.test(html));
  assert.ok(!/\d+\s*kr/i.test(html));
  assert.equal((html.match(/<p /g) || []).length, 1);
  assert.equal(LIVE_LOCKED, true);

  const ok = computeRide({ entry: 100, maxFel: 2, rr: 2, grav: 100 });
  assert.deepEqual(playRails(ok), rideRails(ok));
  assert.ok(playRails(ok).every((p) => p !== ''));
});
