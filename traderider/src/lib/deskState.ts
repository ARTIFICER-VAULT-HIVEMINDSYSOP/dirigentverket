import { bollinger, type Band } from './bollinger'
import {
  clampLeverage,
  deriveQuote,
  enforceMaintenance,
  flattenBook,
  initialBook,
  sideOf,
  submitBuy,
  submitSell,
  type Book,
  type OrderEvent,
} from './market'
import type { Candle, Side } from './types'

/** Candles per second at 1×. 4× is exactly four times this. */
export const BASE_CANDLES_PER_SEC = 0.65
export const MIN_BAND_GAP_PX = 108
export const DEFAULT_VIEWPORT = { width: 960, height: 480 }

export type DeskState = {
  candles: Candle[]
  bands: (Band | null)[]
  progress: number
  paused: boolean
  leverage: number
  book: Book
  viewport: { width: number; height: number }
  status: string
}

export function trackSpeed(leverage: number): number {
  return BASE_CANDLES_PER_SEC * clampLeverage(leverage)
}

export function sampleBand(bands: (Band | null)[], progress: number): Band | null {
  if (bands.length === 0) return null
  const i = Math.max(0, Math.min(bands.length - 1, Math.floor(progress)))
  const t = Math.min(1, Math.max(0, progress - Math.floor(progress)))
  const a = bands[i]
  const b = bands[Math.min(bands.length - 1, i + 1)]
  if (!a && !b) return null
  if (!a || !b) return a ?? b
  const lerp = (x: number, y: number) => x + (y - x) * t
  return {
    sma: lerp(a.sma, b.sma),
    upper: lerp(a.upper, b.upper),
    lower: lerp(a.lower, b.lower),
    stdev: lerp(a.stdev, b.stdev),
  }
}

export function railPrice(band: Band, side: Side): number {
  if (side === 'long') return band.upper
  if (side === 'short') return band.lower
  return band.sma
}

/** Desktop locomotive scale is 2–3× the base sprite. Narrow screens use a smaller scale. */
export function trainDrawScale(width: number): number {
  const w = Number.isFinite(width) && width > 0 ? width : DEFAULT_VIEWPORT.width
  if (w <= 400) return 1.5
  if (w >= 760) return 2.55
  const t = (w - 400) / (760 - 400)
  return 1.5 + (2.55 - 1.5) * t
}

const TRAIN_ABOVE_RAIL = 66

/** Maps price to canvas Y. Upper and lower bands are at least 108px apart, with room for the locomotive above the upper rail. */
export function priceScale(height: number, band: Band, width = DEFAULT_VIEWPORT.width) {
  const span = band.upper - band.lower
  const safeSpan = span > 1e-8 ? span : 1
  const trainH = TRAIN_ABOVE_RAIL * trainDrawScale(width)
  const bottomPad = 28
  const maxGap = height - trainH - bottomPad
  const gap = Math.max(MIN_BAND_GAP_PX, Math.min(Math.max(MIN_BAND_GAP_PX, maxGap), Math.max(MIN_BAND_GAP_PX, height * 0.42)))
  const pxPerPrice = gap / safeSpan
  const mid = band.sma
  const center = height / 2
  const upperY = center - ((band.upper - mid) / safeSpan) * gap
  const yShift = upperY < trainH ? trainH - upperY : 0
  return {
    y(price: number) {
      return center + yShift - (price - mid) * pxPerPrice
    },
    gapPx: span > 1e-8 ? span * pxPerPrice : 0,
  }
}

/** The mark is this candle's close. Percent is versus the previous close. Missing previous close stays null. */
export function markFromCandles(candles: Candle[], progress: number): { close: number | null; pct: number | null } {
  if (candles.length === 0) return { close: null, pct: null }
  const i = Math.min(candles.length - 1, Math.max(0, Math.floor(progress)))
  const close = candles[i]?.c
  if (close == null || !Number.isFinite(close)) return { close: null, pct: null }
  const prev = i > 0 ? candles[i - 1]?.c : undefined
  if (prev == null || !Number.isFinite(prev) || prev === 0) return { close, pct: null }
  return { close, pct: ((close - prev) / prev) * 100 }
}

export function trainScreenY(state: DeskState): number {
  const height = state.viewport.height || DEFAULT_VIEWPORT.height
  const width = state.viewport.width || DEFAULT_VIEWPORT.width
  const band = sampleBand(state.bands, state.progress)
  if (!band) return height / 2
  return priceScale(height, band, width).y(railPrice(band, sideOf(state.book)))
}

export function candleAt(state: DeskState): Candle | null {
  if (state.candles.length === 0) return null
  const i = Math.min(state.candles.length - 1, Math.max(0, Math.floor(state.progress)))
  return state.candles[i] ?? null
}

export function createDesk(candles: Candle[]): DeskState {
  const bands = bollinger(
    candles.map((c) => c.c),
    20,
    2,
  )
  let start = 0
  for (let i = 0; i < bands.length; i++) {
    if (bands[i]) {
      start = i
      break
    }
  }
  return {
    candles,
    bands,
    progress: start,
    paused: false,
    leverage: 1,
    book: initialBook(),
    viewport: { ...DEFAULT_VIEWPORT },
    status: bands.some(Boolean)
      ? 'Flat on the 20-SMA. No position.'
      : 'Not enough candles for the 20-period band.',
  }
}

export function statusFor(event: OrderEvent): string {
  switch (event) {
    case 'opened_long':
      return 'Long. Train on the upper rail. Filled at the offer plus slippage.'
    case 'opened_short':
      return 'Short. Train on the lower rail. Filled at the bid minus slippage.'
    case 'no_implicit_reverse':
      return 'Closed only. No implicit reverse — send the order again to open the other side.'
    case 'flattened':
      return 'Flat. Position closed at the touch plus slippage.'
    case 'liquidated':
      return 'Liquidated. Equity breached maintenance. Broker position was not closed.'
    case 'unchanged':
      return 'No new order. Already on that side, or already flat.'
    case 'rejected':
      return 'Rejected. Buying power does not cover one whole share.'
  }
}

function withOrder(state: DeskState, event: OrderEvent, book: Book): DeskState {
  return { ...state, book, status: statusFor(event) }
}

export function commandBuy(state: DeskState): DeskState {
  const candle = candleAt(state)
  if (!candle) return state
  const result = submitBuy(state.book, deriveQuote(candle.c), state.leverage, candle.t)
  return withOrder(state, result.event, result.book)
}

export function commandSell(state: DeskState): DeskState {
  const candle = candleAt(state)
  if (!candle) return state
  const result = submitSell(state.book, deriveQuote(candle.c), state.leverage, candle.t)
  return withOrder(state, result.event, result.book)
}

export function commandFlatten(state: DeskState): DeskState {
  const candle = candleAt(state)
  if (!candle) return state
  const result = flattenBook(state.book, deriveQuote(candle.c), candle.t)
  return withOrder(state, result.event, result.book)
}

export function setDeskLeverage(state: DeskState, n: number): DeskState {
  const leverage = clampLeverage(n)
  return {
    ...state,
    leverage,
    status: `Leverage ${leverage}×. Speed and buying power both use this factor. Cap is 4×.`,
  }
}

export function togglePause(state: DeskState): DeskState {
  return { ...state, paused: !state.paused }
}

export function stepDesk(state: DeskState, dtMs: number): DeskState {
  if (state.paused) return state
  if (!(dtMs > 0) || state.candles.length === 0) return state
  const max = state.candles.length - 1
  const progress = Math.min(max, state.progress + trackSpeed(state.leverage) * (dtMs / 1000))
  const candle = state.candles[Math.min(max, Math.floor(progress))]
  if (!candle) return state
  const quote = deriveQuote(candle.c)
  const book = enforceMaintenance(state.book, quote, candle.t)
  const ended = progress >= max && state.progress < max
  if (progress === state.progress && book === state.book && !ended) return state
  let status = state.status
  if (book.liquidated && !state.book.liquidated) {
    status = 'Liquidated. Equity breached maintenance. Broker position was not closed.'
  } else if (ended) {
    status = 'End of the candle series. Paused.'
  }
  return {
    ...state,
    progress,
    book,
    paused: ended ? true : state.paused,
    status,
  }
}
