export function money(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(n)
}

export function px(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  return n.toFixed(2)
}

export function formatTime(unixSec: number): string {
  if (!Number.isFinite(unixSec)) return '—'
  return new Date(unixSec * 1000).toISOString().slice(0, 16).replace('T', ' ') + 'Z'
}
