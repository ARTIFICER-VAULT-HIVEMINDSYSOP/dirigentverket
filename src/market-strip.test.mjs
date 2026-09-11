import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatMarketPct,
  formatMarketPrice,
  normalizeMarketSnapshot,
  renderMarketStrip,
} from './market-strip.js';

test('formatMarketPrice/Pct: missing is saknas, never a made-up number', () => {
  assert.equal(formatMarketPrice(null), 'saknas');
  assert.equal(formatMarketPrice(undefined), 'saknas');
  assert.equal(formatMarketPct(null), 'saknas');
  assert.equal(formatMarketPrice(223.67), '223.67');
  assert.match(formatMarketPct(1.54), /^\+1\.54%$/);
});

test('normalizeMarketSnapshot: garbage and missing stay saknas', () => {
  const empty = normalizeMarketSnapshot(null);
  assert.equal(empty.quotes[0].symbol, 'Gold');
  assert.equal(empty.quotes[0].price, null);
  assert.equal(empty.fx.status, 'saknas');
  const mixed = normalizeMarketSnapshot({
    quotes: [{ id: 'gold', price: 12.5, change_pct: 'nope' }, { id: 'btc' }],
    fx: { status: 'ok', strong_buy: [{ pair: 'EUR/CHF' }] },
  });
  assert.equal(mixed.quotes[0].price, 12.5);
  assert.equal(mixed.quotes[0].change_pct, null);
  assert.equal(mixed.quotes[2].status, 'saknas');
  assert.equal(mixed.fx.strong_buy[0].pair, 'EUR/CHF');
});

test('renderMarketStrip: pitch label, no order buttons, saknas when empty', () => {
  const html = renderMarketStrip(null);
  assert.match(html, /pitch fuel/);
  assert.match(html, /Inte handelsråd/);
  assert.match(html, /Strong Buy/);
  assert.match(html, /Strong Sell/);
  assert.match(html, /CMC top/);
  assert.match(html, /saknas/);
  assert.doesNotMatch(html, /<button/i);
  assert.doesNotMatch(html, /order/i);
  assert.doesNotMatch(html, /telefon|phone/i);
});

test('renderMarketStrip: real numbers and chips, invented values stay out', () => {
  const html = renderMarketStrip({
    updated_at: '2026-09-10T07:32:00Z',
    stale: false,
    fx: {
      status: 'ok',
      strong_buy: [{ pair: 'EUR/CHF', rating: 'Strong Buy' }],
      strong_sell: [],
    },
    quotes: [
      { id: 'gold', price: 4455.2, change_pct: 0.57, status: 'ok' },
      { id: 'nvda', price: 223.67, change_pct: 2.86, status: 'ok' },
    ],
    gainers: { status: 'ok', items: [{ symbol: 'KAS', change_pct: 7.93 }] },
  });
  assert.match(html, /EUR\/CHF/);
  assert.match(html, /4455\.2/);
  assert.match(html, /223\.67/);
  assert.match(html, /KAS/);
  assert.match(html, /07:32Z/);
  assert.doesNotMatch(html, /<button/i);
});
