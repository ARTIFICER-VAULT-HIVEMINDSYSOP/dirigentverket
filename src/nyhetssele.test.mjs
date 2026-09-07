import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createNyhetssele,
  validateNyhetssele,
  emptyNyhetssele,
  CAN_SEND_LIVE,
  NYHETSSELE_SOURCES,
} from './nyhetssele.js';
import { renderNyhetssele, renderNyhetsseleResult } from './nyhetssele-ui.js';

test('tom olja och guld stannar saknas, inte påhittad kurs', () => {
  const s = createNyhetssele({});
  assert.equal(s.oil, '');
  assert.equal(s.gold, '');
  assert.equal(s.paper, true);
  assert.equal(s.send, false);
  assert.equal(s.live, false);
  const v = validateNyhetssele({});
  assert.equal(v.oil, 'saknas');
  assert.equal(v.gold, 'saknas');
  assert.ok(v.missing.includes('oil'));
  assert.ok(v.missing.includes('gold'));
  assert.equal(v.canSendLive, false);
  assert.equal(CAN_SEND_LIVE, false);
});

test('remmar ok utan olja/guld-pris; skicka stannar false', () => {
  const raw = {
    date: '2026-09-07',
    subject: 'Morgon',
    sources: 'SVT, DI, MFN',
    disclaimer: 'Inte råd',
    filePath: 'marknad/utkast.md',
    oil: '',
    gold: '',
  };
  const v = validateNyhetssele(raw);
  assert.equal(v.ok, true);
  assert.equal(v.send, false);
  assert.equal(v.namedReady, false);
  assert.equal(v.sele.oil, '');
  assert.equal(v.oil, 'saknas');
  assert.deepEqual(v.sele.sources, ['SVT', 'DI', 'MFN']);
});

test('paper tills namngivet ja och mottagarlista', () => {
  const half = validateNyhetssele({
    date: '2026-09-07',
    subject: 'Morgon',
    sources: 'SVT',
    disclaimer: 'x',
    filePath: 'a.md',
    namedYes: true,
    recipients: '',
  });
  assert.equal(half.namedReady, false);
  assert.equal(half.paper, true);

  const ready = validateNyhetssele({
    date: '2026-09-07',
    subject: 'Morgon',
    sources: 'SVT',
    disclaimer: 'x',
    filePath: 'a.md',
    namedYes: true,
    recipients: 'stab',
  });
  assert.equal(ready.namedReady, true);
  assert.equal(ready.send, false);
  assert.equal(ready.canSendLive, false);
});

test('källor matchar utan versaler; SVT,DI,Avanza räknas', () => {
  const s = createNyhetssele({ sources: 'svt,di,avanza' });
  assert.deepEqual(s.sources, ['SVT', 'DI', 'Avanza']);
  const v = validateNyhetssele({
    date: '2026-09-07',
    subject: 'Morgon',
    sources: 'SVT,DI,Avanza',
    disclaimer: 'Inte råd',
    filePath: 'marknad/utkast.md',
  });
  assert.equal(v.ok, true);
  assert.ok(!v.missing.includes('sources'));
  assert.ok(v.missing.includes('oil'));
  assert.ok(v.missing.includes('gold'));
});

test('okända källor släpps inte in som påhitt; kända remmar finns', () => {
  const s = createNyhetssele({ sources: 'SVT, FakeWire, IPO' });
  assert.deepEqual(s.sources, ['SVT', 'IPO']);
  assert.deepEqual(s.unknownSources, ['FakeWire']);
  for (const name of ['SVT', 'DI', 'Avanza', 'Nordnet', 'Baha', 'MFN', 'IPO']) {
    assert.ok(NYHETSSELE_SOURCES.includes(name));
  }
});

test('UI-stub: paper-badge, ingen skicka-knapp', () => {
  const html = renderNyhetssele(emptyNyhetssele(), null);
  assert.match(html, /Nyhetssele/);
  assert.match(html, /PAPER · skicka = false · ingen e-post/);
  assert.match(html, /Validera remmar/);
  assert.ok(!/type="submit"[^>]*>\s*Skicka/i.test(html));
  assert.ok(!/mailto:|smtp|sendmail/i.test(html));
  const blocked = renderNyhetsseleResult(validateNyhetssele({}));
  assert.match(blocked, /saknas/);
});
