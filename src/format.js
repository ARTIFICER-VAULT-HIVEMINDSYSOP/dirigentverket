/** Swedish number, currency and date formatting. */

const sek = new Intl.NumberFormat('sv-SE', {
  style: 'currency',
  currency: 'SEK',
  maximumFractionDigits: 0,
});

const num0 = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 });
const num1 = new Intl.NumberFormat('sv-SE', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

export function formatSek(n) {
  if (!Number.isFinite(Number(n))) return '—';
  return sek.format(Math.round(Number(n)));
}

/** Compact SEK for the summary strip: tkr / mnkr / mdkr. */
export function formatSekShort(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  const abs = Math.abs(v);
  const sign = v < 0 ? '−' : '';
  if (abs >= 1_000_000_000) {
    return `${sign}${num1.format(abs / 1_000_000_000)} mdkr`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${num1.format(abs / 1_000_000)} mnkr`;
  }
  if (abs >= 1_000) {
    return `${sign}${num0.format(Math.round(abs / 1_000))} tkr`;
  }
  return formatSek(v);
}

export function formatNumber(n, digits = 0) {
  if (!Number.isFinite(Number(n))) return '—';
  const fmt = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: digits, minimumFractionDigits: digits });
  return fmt.format(Number(n));
}

/** Decimal share → signed percent string, e.g. +3,4 %. */
export function formatPct(share, digits = 1) {
  if (!Number.isFinite(Number(share))) return '—';
  const pct = Number(share) * 100;
  const body = new Intl.NumberFormat('sv-SE', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Math.abs(pct));
  const sign = pct > 0.0005 ? '+' : pct < -0.0005 ? '−' : '';
  return `${sign}${body} %`;
}

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('sv-SE');
}

export function formatPeriod(start, slut) {
  return `${formatDate(start)} – ${formatDate(slut)}`;
}

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function parseList(raw) {
  if (Array.isArray(raw)) {
    return raw.map((s) => String(s).trim()).filter(Boolean);
  }
  return String(raw || '')
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
