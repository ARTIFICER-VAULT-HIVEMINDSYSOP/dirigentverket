import type { Quote, Side } from './types'

export const STARTING_CASH = 100_000
export const LEVERAGE_MIN = 1
export const LEVERAGE_MAX = 4
export const LONG_MAINTENANCE_RATIO = 0.25
export const SHORT_MAINTENANCE_RATIO = 0.3

export type FillNote = 'open_long' | 'open_short' | 'close' | 'liquidation' | 'rejected'

export type FillReason =
  | 'no_implicit_reverse'
  | 'flatten'
  | 'maintenance'
  | 'insufficient_buying_power'

export type Fill = {
  id: number
  candleTime: number
  action: 'buy' | 'sell'
  qty: number
  bid: number
  offer: number
  slippage: number
  fill: number
  note: FillNote
  reason?: FillReason
}

export type Book = {
  cash: number
  shares: number
  avgFill: number | null
  realized: number
  fills: Fill[]
  liquidated: boolean
  nextFillId: number
}

export type OrderEvent =
  | 'opened_long'
  | 'opened_short'
  | 'no_implicit_reverse'
  | 'flattened'
  | 'liquidated'
  | 'unchanged'
  | 'rejected'

export type OrderResult = {
  book: Book
  event: OrderEvent
}

export type ResetResult = {
  book: Book
  /** Always false. Reset never sends a flatten to a broker, including live. */
  brokerFlattenSent: false
  env: 'off' | 'paper' | 'live'
}

export function roundCents(n: number): number {
  return Math.round(n * 100) / 100
}

export function initialBook(): Book {
  return {
    cash: STARTING_CASH,
    shares: 0,
    avgFill: null,
    realized: 0,
    fills: [],
    liquidated: false,
    nextFillId: 1,
  }
}

export function clampLeverage(n: number): number {
  if (!Number.isFinite(n)) return LEVERAGE_MIN
  const rounded = Math.round(n)
  if (rounded < LEVERAGE_MIN) return LEVERAGE_MIN
  if (rounded > LEVERAGE_MAX) return LEVERAGE_MAX
  return rounded
}

export function sideOf(book: Book): Side {
  if (book.shares > 0) return 'long'
  if (book.shares < 0) return 'short'
  return 'flat'
}

/** Buys pay the offer plus slippage. Sells receive the bid minus slippage. Never the mid. */
export function fillPrice(action: 'buy' | 'sell', quote: Quote): number {
  const slip = Math.max(0, quote.slippage)
  const raw = action === 'buy' ? quote.offer + slip : quote.bid - slip
  return roundCents(raw)
}

export function midPrice(quote: Quote): number {
  return (quote.bid + quote.offer) / 2
}

export function markEquity(book: Book, mark: number): number {
  return roundCents(book.cash + book.shares * mark)
}

export function buyingPower(equity: number, leverage: number): number {
  if (!(equity > 0)) return 0
  return roundCents(equity * clampLeverage(leverage))
}

export function wholeShares(power: number, price: number): number {
  if (!(power > 0) || !(price > 0)) return 0
  return Math.floor(power / price)
}

export function maintenanceRequirement(book: Book, mark: number): number {
  if (!(mark > 0)) return 0
  if (book.shares > 0) return roundCents(LONG_MAINTENANCE_RATIO * book.shares * mark)
  if (book.shares < 0) return roundCents(SHORT_MAINTENANCE_RATIO * Math.abs(book.shares) * mark)
  return 0
}

/** Breach is strict: equity sitting exactly on the requirement is still met. */
export function maintenanceBreached(book: Book, mark: number): boolean {
  if (book.shares === 0) return false
  if (!(mark > 0)) return false
  return markEquity(book, mark) < maintenanceRequirement(book, mark)
}

export function unrealizedPnl(book: Book, mark: number): number | null {
  if (book.shares === 0 || book.avgFill === null || !(mark > 0)) return null
  if (book.shares > 0) return roundCents((mark - book.avgFill) * book.shares)
  return roundCents((book.avgFill - mark) * Math.abs(book.shares))
}

/**
 * Bid/offer around the candle close. Half-spread is 1.5 bps, minimum one cent.
 * Slippage is one cent beyond the touch. This is a desk rule, not a claimed NBBO feed.
 */
export function deriveQuote(last: number): Quote {
  if (!(last > 0) || !Number.isFinite(last)) {
    throw new Error('missing last')
  }
  const half = Math.max(0.01, roundCents(last * 0.00015))
  let bid = roundCents(last - half)
  let offer = roundCents(last + half)
  if (!(offer > bid)) {
    bid = roundCents(last - 0.01)
    offer = roundCents(last + 0.01)
  }
  return { last, bid, offer, slippage: 0.01 }
}

function makeFill(
  book: Book,
  input: Omit<Fill, 'id'> ,
): { book: Book; fill: Fill } {
  const fill: Fill = { ...input, id: book.nextFillId }
  return {
    fill,
    book: { ...book, nextFillId: book.nextFillId + 1, fills: [...book.fills, fill] },
  }
}

function closePosition(
  book: Book,
  quote: Quote,
  candleTime: number,
  reason: 'no_implicit_reverse' | 'flatten' | 'maintenance',
): Book {
  if (book.shares === 0 || book.avgFill === null) return book
  const long = book.shares > 0
  const action: 'buy' | 'sell' = long ? 'sell' : 'buy'
  const qty = Math.abs(book.shares)
  const px = fillPrice(action, quote)
  const cash = roundCents(book.cash + (long ? qty * px : -qty * px))
  const realized = roundCents(
    book.realized + (long ? (px - book.avgFill) * qty : (book.avgFill - px) * qty),
  )
  const { book: withFill } = makeFill(book, {
    candleTime,
    action,
    qty,
    bid: quote.bid,
    offer: quote.offer,
    slippage: quote.slippage,
    fill: px,
    note: reason === 'maintenance' ? 'liquidation' : 'close',
    reason,
  })
  return {
    ...withFill,
    cash,
    shares: 0,
    avgFill: null,
    realized,
    liquidated: reason === 'maintenance' ? true : book.liquidated,
  }
}

export function enforceMaintenance(book: Book, quote: Quote, candleTime: number): Book {
  if (book.shares === 0) return book
  if (!maintenanceBreached(book, quote.last)) return book
  return closePosition(book, quote, candleTime, 'maintenance')
}

function openPosition(
  book: Book,
  action: 'buy' | 'sell',
  quote: Quote,
  leverage: number,
  candleTime: number,
): OrderResult {
  const px = fillPrice(action, quote)
  const equity = markEquity(book, quote.last)
  const qty = wholeShares(buyingPower(equity, leverage), px)
  if (qty < 1) {
    const { book: next } = makeFill(book, {
      candleTime,
      action,
      qty: 0,
      bid: quote.bid,
      offer: quote.offer,
      slippage: quote.slippage,
      fill: px,
      note: 'rejected',
      reason: 'insufficient_buying_power',
    })
    return { book: next, event: 'rejected' }
  }
  const long = action === 'buy'
  const cash = roundCents(book.cash + (long ? -qty * px : qty * px))
  const { book: withFill } = makeFill(
    { ...book, liquidated: false },
    {
      candleTime,
      action,
      qty,
      bid: quote.bid,
      offer: quote.offer,
      slippage: quote.slippage,
      fill: px,
      note: long ? 'open_long' : 'open_short',
    },
  )
  let next: Book = {
    ...withFill,
    cash,
    shares: long ? qty : -qty,
    avgFill: px,
    liquidated: false,
  }
  next = enforceMaintenance(next, quote, candleTime)
  if (next.liquidated) return { book: next, event: 'liquidated' }
  return { book: next, event: long ? 'opened_long' : 'opened_short' }
}

/**
 * BUY opens a long from flat.
 * BUY while short only closes — it does not flip to long.
 */
export function submitBuy(book: Book, quote: Quote, leverage: number, candleTime: number): OrderResult {
  const side = sideOf(book)
  if (side === 'short') {
    return {
      book: closePosition(book, quote, candleTime, 'no_implicit_reverse'),
      event: 'no_implicit_reverse',
    }
  }
  if (side === 'long') return { book, event: 'unchanged' }
  return openPosition(book, 'buy', quote, leverage, candleTime)
}

/**
 * SELL opens a short from flat.
 * SELL while long only closes — it does not flip to short.
 */
export function submitSell(book: Book, quote: Quote, leverage: number, candleTime: number): OrderResult {
  const side = sideOf(book)
  if (side === 'long') {
    return {
      book: closePosition(book, quote, candleTime, 'no_implicit_reverse'),
      event: 'no_implicit_reverse',
    }
  }
  if (side === 'short') return { book, event: 'unchanged' }
  return openPosition(book, 'sell', quote, leverage, candleTime)
}

export function flattenBook(book: Book, quote: Quote, candleTime: number): OrderResult {
  if (book.shares === 0) return { book, event: 'unchanged' }
  return {
    book: closePosition(book, quote, candleTime, 'flatten'),
    event: 'flattened',
  }
}

/** Local paper book returns to the starting flat account. No broker call is planned. */
export function resetGame(book: Book, env: 'off' | 'paper' | 'live'): ResetResult {
  void book
  return {
    book: initialBook(),
    brokerFlattenSent: false,
    env,
  }
}
