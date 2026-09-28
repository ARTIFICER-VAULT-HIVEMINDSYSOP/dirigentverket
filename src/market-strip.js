import { escapeHtml } from './format.js';

export const MARKET_REFRESH_MS = 90_000;

function isNum(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function formatMarketPrice(value) {
  if (!isNum(value)) return 'saknas';
  const abs = Math.abs(value);
  const digits = abs >= 1000 ? 1 : abs >= 1 ? 2 : 4;
  return new Intl.NumberFormat('en-US', {
    useGrouping: false,
    maximumFractionDigits: digits,
    minimumFractionDigits: abs >= 1 ? Math.min(digits, 2) : 0,
  }).format(value);
}

export function formatMarketPct(value) {
  if (!isNum(value)) return 'saknas';
  const body = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(Math.abs(value));
  const sign = value > 0.0005 ? '+' : value < -0.0005 ? '−' : '';
  return `${sign}${body}%`;
}

function emptySnapshot() {
  return {
    ok: true,
    label: 'pitch fuel · market snapshot',
    disclaimer: 'Inte handelsråd. Inga ordrar.',
    updated_at: '',
    stale: true,
    fx: { status: 'saknas', strong_buy: [], strong_sell: [] },
    quotes: [
      { id: 'gold', symbol: 'Gold', price: null, change_pct: null, status: 'saknas' },
      { id: 'eth', symbol: 'ETH', price: null, change_pct: null, status: 'saknas' },
      { id: 'btc', symbol: 'BTC', price: null, change_pct: null, status: 'saknas' },
      { id: 'nvda', symbol: 'NVDA', price: null, change_pct: null, status: 'saknas' },
      { id: 'pltr', symbol: 'PLTR', price: null, change_pct: null, status: 'saknas' },
    ],
    gainers: { status: 'saknas', items: [] },
  };
}

export function normalizeMarketSnapshot(raw) {
  const base = emptySnapshot();
  if (!raw || typeof raw !== 'object') return base;
  const fx = raw.fx && typeof raw.fx === 'object' ? raw.fx : {};
  const gainers = raw.gainers && typeof raw.gainers === 'object' ? raw.gainers : {};
  const quotesIn = Array.isArray(raw.quotes) ? raw.quotes : [];
  return {
    ...base,
    label: raw.label || base.label,
    disclaimer: raw.disclaimer || base.disclaimer,
    updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : '',
    stale: Boolean(raw.stale),
    fx: {
      status: fx.status === 'ok' || fx.status === 'stale' ? fx.status : 'saknas',
      source: typeof fx.source === 'string' ? fx.source : '',
      strong_buy: Array.isArray(fx.strong_buy) ? fx.strong_buy : [],
      strong_sell: Array.isArray(fx.strong_sell) ? fx.strong_sell : [],
    },
    quotes: base.quotes.map((slot) => {
      const hit = quotesIn.find((q) => q && q.id === slot.id) || {};
      const price = isNum(hit.price) ? hit.price : null;
      const status = price == null ? 'saknas' : hit.status === 'stale' ? 'stale' : 'ok';
      return {
        id: slot.id,
        symbol: slot.symbol,
        price,
        change_pct: isNum(hit.change_pct) ? hit.change_pct : null,
        status,
      };
    }),
    gainers: {
      status: gainers.status === 'ok' || gainers.status === 'stale' ? gainers.status : 'saknas',
      items: Array.isArray(gainers.items) ? gainers.items : [],
    },
  };
}

function clockLabel(iso) {
  if (!iso) return 'saknas';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'saknas';
  return d.toISOString().slice(11, 16) + 'Z';
}

function chips(items, kind) {
  const rows = Array.isArray(items) ? items : [];
  const out = [];
  for (const item of rows) {
    if (!item || typeof item !== 'object') continue;
    const pair = String(item.pair || '').trim();
    if (!pair) continue;
    out.push(
      `<span class="market-chip ${kind}">${escapeHtml(pair)}</span>`,
    );
  }
  return out.length ? out.join('') : '<span class="market-missing">saknas</span>';
}

function quoteCell(q) {
  const stale = q.status === 'stale' ? ' is-stale' : '';
  const price = formatMarketPrice(q.price);
  const pct = formatMarketPct(q.change_pct);
  return `<span class="market-quote${stale}" data-symbol="${escapeHtml(q.symbol)}">
    <b>${escapeHtml(q.symbol)}</b>
    <code>${escapeHtml(price)}</code>
    <em>${escapeHtml(pct)}</em>
  </span>`;
}

function gainerCells(items) {
  const rows = Array.isArray(items) ? items : [];
  const out = [];
  for (const item of rows) {
    if (!item || typeof item !== 'object') continue;
    const symbol = String(item.symbol || '').trim();
    if (!symbol || !isNum(item.change_pct)) continue;
    out.push(
      `<span class="market-gainer"><b>${escapeHtml(symbol)}</b> <em>${escapeHtml(formatMarketPct(item.change_pct))}</em></span>`,
    );
  }
  return out.length ? out.join('') : '<span class="market-missing">saknas</span>';
}

export function renderMarketStrip(raw) {
  const data = normalizeMarketSnapshot(raw);
  const staleNote = data.stale ? ' · inaktuell' : '';
  const fxNote = data.fx.status === 'stale' ? ' · inaktuell' : '';
  return `<div class="market-strip-inner" data-market-strip>
    <header class="market-strip-head">
      <p class="market-kicker">${escapeHtml(data.label)}</p>
      <p class="market-meta">live-ish · ${escapeHtml(clockLabel(data.updated_at))}${escapeHtml(staleNote)}</p>
    </header>
    <p class="market-disclaimer">${escapeHtml(data.disclaimer)}</p>
    <div class="market-fx">
      <div class="market-fx-row">
        <span class="market-fx-label buy">Strong Buy</span>
        <div class="market-chips">${chips(data.fx.strong_buy, 'buy')}</div>
      </div>
      <div class="market-fx-row">
        <span class="market-fx-label sell">Strong Sell</span>
        <div class="market-chips">${chips(data.fx.strong_sell, 'sell')}</div>
      </div>
      <p class="market-fx-cap">FX teknisk sammanfattning${escapeHtml(fxNote)}</p>
    </div>
    <div class="market-quotes">${data.quotes.map(quoteCell).join('')}</div>
    <div class="market-gainers">
      <span class="market-fx-label">CMC top</span>
      <div class="market-gainer-list">${gainerCells(data.gainers.items)}</div>
    </div>
  </div>`;
}
