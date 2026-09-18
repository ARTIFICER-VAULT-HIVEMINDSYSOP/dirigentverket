import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeRobot, LIVE_LOCKED, emptyRobotDraft } from './robot.js';
import { lampTell, renderRobot } from './robot-ui.js';

const plan = {
  instrument: 'OMXS30',
  side: 'köp',
  entry: 100,
  risk: 2,
  rr: 2,
};

const trail = {
  ...plan,
  rsi: 28,
  bbLower: 98,
  bbUpper: 106,
  current: 98.2,
  bounce: 'nedre',
};

test('LIVE_LOCKED stannar true; computeRobot är paper/live=false', () => {
  assert.equal(LIVE_LOCKED, true);
  const ok = computeRobot(plan);
  assert.equal(ok.ok, true);
  assert.equal(ok.paper, true);
  assert.equal(ok.live, false);
  assert.equal(ok.liveLocked, true);
  assert.equal(ok.saknar_sl_tp, false);

  const miss = computeRobot({ ...emptyRobotDraft(), instrument: '' });
  assert.equal(miss.ok, false);
  assert.equal(miss.paper, true);
  assert.equal(miss.live, false);
  assert.equal(miss.saknar_sl_tp, true);
});

test('lampTell: idle / wait / lit / trail utan påhittad tändning', () => {
  assert.equal(lampTell(null), 'idle');
  assert.equal(lampTell(computeRobot(emptyRobotDraft())), 'wait');
  assert.equal(lampTell(computeRobot(plan)), 'lit');
  assert.equal(lampTell(computeRobot(trail)), 'trail');
});

test('Artificer-yta: WATCHERS-lampa, PAPER, LIVE_LOCKED, ingen default-logo', () => {
  const page = renderRobot(emptyRobotDraft(), null);
  assert.match(page, /data-lamp="idle"/);
  assert.match(page, /WATCHERS · anden i lampan/);
  assert.match(page, /lamp-vessel/);
  assert.match(page, /PAPER · live=false · LIVE_LOCKED · ingen mäklare/);
  assert.match(page, /LIVE_LOCKED\./);
  assert.match(page, /lamp-mode-live/);
  assert.ok(!/artificer-mark/.test(page));
  assert.ok(!/ks-logo|william-lampa|kapitalstrategi/i.test(page));
  assert.doesNotMatch(page, /PNL|\bpnl\b/);
});

test('tenant-logo bara när tenant fyllt skin.logo; kicker override', () => {
  const page = renderRobot(emptyRobotDraft(), computeRobot(plan), {
    tenant: {
      skin: {
        logo: './logo.png',
        markAlt: 'Exempel',
        watchers: { kicker: 'WATCHERS · paper' },
      },
    },
  });
  assert.match(page, /data-lamp="lit"/);
  assert.match(page, /WATCHERS · paper/);
  assert.match(page, /src="\.\/logo\.png"/);
  assert.match(page, /alt="Exempel"/);
});

test('trail-tell bara när struktur.trail; liveLocked går inte att slå av', () => {
  const trailPage = renderRobot(emptyRobotDraft(), computeRobot(trail), { liveLocked: false });
  assert.match(trailPage, /data-lamp="trail"/);
  assert.match(trailPage, /LIVE_LOCKED/);
  assert.equal(LIVE_LOCKED, true);
});
