import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_WATCHERS_KICKER,
  chamberCssValue,
  resolveWatchersSkin,
  applyWatchersChamber,
} from './tenant.js';

test('tom tenant: kicker default, ingen logo, ingen kammare', () => {
  const skin = resolveWatchersSkin({});
  assert.equal(skin.kicker, DEFAULT_WATCHERS_KICKER);
  assert.equal(skin.logo, '');
  assert.equal(skin.name, '');
  assert.equal(skin.chamber, '');
  assert.equal(skin.paper, true);
  assert.ok(!/kapitalstrategi|ks-logo|william-lampa/i.test(JSON.stringify(skin)));
});

test('tenant override: kicker + relativ kammare, logo bara om ifylld', () => {
  const skin = resolveWatchersSkin({
    skin: {
      name: 'Exempel',
      logo: './logo.png',
      watchers: { kicker: 'WATCHERS · paper', chamber: './chamber.png' },
    },
  });
  assert.equal(skin.kicker, 'WATCHERS · paper');
  assert.equal(skin.logo, './logo.png');
  assert.equal(skin.chamber, './chamber.png');
  assert.equal(chamberCssValue(skin.chamber), 'url("./chamber.png")');
});

test('chamberCssValue släpper inte remote/data/javascript', () => {
  assert.equal(chamberCssValue('https://evil.example/x.png'), '');
  assert.equal(chamberCssValue('//cdn.example/x.png'), '');
  assert.equal(chamberCssValue('data:image/png;base64,xx'), '');
  assert.equal(chamberCssValue('javascript:alert(1)'), '');
  assert.equal(chamberCssValue(''), '');
});

test('applyWatchersChamber sätter och rensar CSS-var', () => {
  const el = { style: new Map(), };
  el.style.setProperty = (k, v) => el.style.set(k, v);
  el.style.removeProperty = (k) => el.style.delete(k);
  assert.equal(applyWatchersChamber(el, './stone.webp'), 'url("./stone.webp")');
  assert.equal(el.style.get('--watchers-chamber'), 'url("./stone.webp")');
  assert.equal(applyWatchersChamber(el, ''), '');
  assert.equal(el.style.has('--watchers-chamber'), false);
});
