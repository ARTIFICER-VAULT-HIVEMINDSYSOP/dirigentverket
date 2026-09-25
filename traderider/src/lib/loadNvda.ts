import fallbackFile from '../data/nvda-fallback.json'
import type { Candle, NvdaPayload } from './types'

const YAHOO_URL =
  'https://query1.finance.yahoo.com/v8/finance/chart/NVDA?interval=1h&range=1mo&includePrePost=false'

export const FALLBACK_LABEL = 'Fallback data — Yahoo unavailable'

type YahooQuote = {
  open?: Array<number | null>
  high?: Array<number | null>
  low?: Array<number | null>
  close?: Array<number | null>
  volume?: Array<number | null>
}

type YahooPayload = {
  chart?: {
    result?: Array<{
      timestamp?: number[]
      indicators?: { quote?: YahooQuote[] }
    }> | null
  }
}

export function parseYahooChart(payload: unknown): Candle[] {
  const result = (payload as YahooPayload).chart?.result?.[0]
  const timestamps = result?.timestamp
  const quote = result?.indicators?.quote?.[0]
  if (!timestamps || !quote) throw new Error('yahoo_empty')

  const candles: Candle[] = []
  for (let i = 0; i < timestamps.length; i++) {
    const o = quote.open?.[i]
    const h = quote.high?.[i]
    const l = quote.low?.[i]
    const c = quote.close?.[i]
    const v = quote.volume?.[i]
    if (o == null || h == null || l == null || c == null || v == null) continue
    if (![o, h, l, c].every((n) => typeof n === 'number' && Number.isFinite(n) && n > 0)) continue
    candles.push({ t: timestamps[i], o, h, l, c, v })
  }
  if (candles.length < 20) throw new Error('yahoo_short')
  return candles
}

export function fallbackPayload(): NvdaPayload {
  return {
    source: 'fallback',
    fallback: true,
    label: fallbackFile.label || FALLBACK_LABEL,
    symbol: 'NVDA',
    interval: fallbackFile.interval,
    candles: fallbackFile.candles,
  }
}

/** Browser fetch for the static build. No User-Agent header (browsers forbid it). CORS or network failure uses the bundle. */
export async function loadNvdaForStatic(fetchImpl: typeof fetch = fetch): Promise<NvdaPayload> {
  try {
    const res = await fetchImpl(YAHOO_URL, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error('yahoo_http')
    const json: unknown = await res.json()
    const candles = parseYahooChart(json)
    return {
      source: 'yahoo',
      fallback: false,
      label: 'Yahoo NVDA',
      symbol: 'NVDA',
      interval: '1h',
      candles,
    }
  } catch {
    return fallbackPayload()
  }
}

export async function loadNvdaCandles(fetchImpl: typeof fetch = fetch): Promise<NvdaPayload> {
  try {
    const res = await fetchImpl(YAHOO_URL, {
      headers: {
        accept: 'application/json',
        'user-agent': 'Traderider/1.0',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error('yahoo_http')
    const json: unknown = await res.json()
    const candles = parseYahooChart(json)
    return {
      source: 'yahoo',
      fallback: false,
      label: 'Yahoo NVDA',
      symbol: 'NVDA',
      interval: '1h',
      candles,
    }
  } catch {
    return fallbackPayload()
  }
}
