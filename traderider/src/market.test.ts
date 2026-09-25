import { expect, test } from 'vitest'
import { bollinger } from './lib/bollinger'
import {
  buyingPower,
  clampLeverage,
  deriveQuote,
  enforceMaintenance,
  fillPrice,
  flattenBook,
  initialBook,
  maintenanceBreached,
  midPrice,
  resetGame,
  roundCents,
  submitBuy,
  submitSell,
  wholeShares,
  type Book,
} from './lib/market'
import { trackSpeed } from './lib/deskState'
import type { Quote } from './lib/types'

const touch: Quote = { bid: 99, offer: 101, last: 100, slippage: 1 }

test('fills at bid or offer plus slippage, never the mid', () => {
  const buy = fillPrice('buy', touch)
  const sell = fillPrice('sell', touch)
  expect(buy).toBe(102)
  expect(sell).toBe(98)
  expect(buy).not.toBe(midPrice(touch))
  expect(sell).not.toBe(midPrice(touch))
  expect(buy).toBeGreaterThan(touch.offer)
  expect(sell).toBeLessThan(touch.bid)

  const derived = deriveQuote(100)
  expect(derived.bid).toBeLessThan(derived.last)
  expect(derived.offer).toBeGreaterThan(derived.last)
  expect(fillPrice('buy', derived)).not.toBe(midPrice(derived))
  expect(fillPrice('sell', derived)).not.toBe(midPrice(derived))
})

test('orders take whole shares only', () => {
  expect(wholeShares(1000, 333)).toBe(3)
  expect(wholeShares(10, 30)).toBe(0)
  const opened = submitBuy(initialBook(), touch, 1, 0)
  expect(opened.event).toBe('opened_long')
  expect(opened.book.shares).toBe(980)
  expect(Number.isInteger(opened.book.shares)).toBe(true)
  expect(opened.book.fills[0]?.fill).toBe(102)
  expect(opened.book.cash).toBe(roundCents(100_000 - 980 * 102))
})

test('no implicit reverse — opposite order closes and does not flip', () => {
  const opened = submitBuy(initialBook(), touch, 1, 0)
  const closed = submitSell(opened.book, touch, 1, 0)
  expect(closed.event).toBe('no_implicit_reverse')
  expect(closed.book.shares).toBe(0)
  expect(closed.book.fills.at(-1)?.reason).toBe('no_implicit_reverse')
  expect(closed.book.fills.at(-1)?.action).toBe('sell')

  const shorted = submitSell(closed.book, touch, 1, 0)
  expect(shorted.event).toBe('opened_short')
  expect(shorted.book.shares).toBeLessThan(0)
  expect(Number.isInteger(shorted.book.shares)).toBe(true)

  const covered = submitBuy(shorted.book, touch, 1, 0)
  expect(covered.event).toBe('no_implicit_reverse')
  expect(covered.book.shares).toBe(0)
  expect(covered.book.shares).not.toBeGreaterThan(0)
})

test('flatten is an explicit close, not a broker reset', () => {
  const opened = submitBuy(initialBook(), touch, 1, 0)
  const flat = flattenBook(opened.book, touch, 0)
  expect(flat.event).toBe('flattened')
  expect(flat.book.shares).toBe(0)
  expect(flat.book.fills.at(-1)?.reason).toBe('flatten')
})

test('25% long maintenance liquidates at the bid minus slippage', () => {
  const book: Book = {
    cash: -300_000,
    shares: 4000,
    avgFill: 100,
    realized: 0,
    fills: [],
    liquidated: false,
    nextFillId: 1,
  }
  expect(maintenanceBreached(book, 100)).toBe(false)
  const quote: Quote = { bid: 98.5, offer: 99.5, last: 99, slippage: 0.25 }
  expect(maintenanceBreached(book, quote.last)).toBe(true)
  const out = enforceMaintenance(book, quote, 1_700_000_000)
  expect(out.shares).toBe(0)
  expect(out.liquidated).toBe(true)
  expect(out.fills[0]?.note).toBe('liquidation')
  expect(out.fills[0]?.action).toBe('sell')
  expect(out.fills[0]?.fill).toBe(98.25)
  expect(out.fills[0]?.fill).not.toBe(midPrice(quote))
  expect(out.cash).toBe(93_000)
})

test('30% short maintenance liquidates at the offer plus slippage', () => {
  const book: Book = {
    cash: 200_000,
    shares: -1000,
    avgFill: 100,
    realized: 0,
    fills: [],
    liquidated: false,
    nextFillId: 1,
  }
  expect(maintenanceBreached(book, 100)).toBe(false)
  const quote: Quote = { bid: 179.4, offer: 180.6, last: 180, slippage: 0.2 }
  expect(maintenanceBreached(book, quote.last)).toBe(true)
  const out = enforceMaintenance(book, quote, 0)
  expect(out.shares).toBe(0)
  expect(out.liquidated).toBe(true)
  expect(out.fills[0]?.action).toBe('buy')
  expect(out.fills[0]?.fill).toBe(180.8)
  expect(out.fills[0]?.fill).not.toBe(midPrice(quote))
  expect(out.cash).toBe(19_200)
})

test('leverage caps at 4x for buying power and speed, never 10x', () => {
  expect(clampLeverage(10)).toBe(4)
  expect(clampLeverage(4)).toBe(4)
  expect(clampLeverage(1)).toBe(1)
  expect(clampLeverage(0)).toBe(1)
  expect(clampLeverage(Number.NaN)).toBe(1)
  expect(buyingPower(100_000, 1)).toBe(100_000)
  expect(buyingPower(100_000, 4)).toBe(400_000)
  expect(buyingPower(100_000, 10)).toBe(400_000)
  expect(trackSpeed(4)).toBe(trackSpeed(1) * 4)
  expect(trackSpeed(10)).toBe(trackSpeed(1) * 4)
})

test('a full-size 4x long is liquidated by the spread against 25% maintenance', () => {
  const opened = submitBuy(initialBook(), touch, 10, 0)
  expect(opened.event).toBe('liquidated')
  expect(opened.book.shares).toBe(0)
  expect(opened.book.liquidated).toBe(true)
  expect(opened.book.fills.at(-1)?.note).toBe('liquidation')
  expect(opened.book.fills.at(-1)?.fill).toBe(fillPrice('sell', touch))
})

test('reset does not flatten a live broker position', () => {
  const opened = submitBuy(initialBook(), touch, 1, 0)
  const reset = resetGame(opened.book, 'live')
  expect(reset.brokerFlattenSent).toBe(false)
  expect(reset.env).toBe('live')
  expect(reset.book.cash).toBe(100_000)
  expect(reset.book.shares).toBe(0)
  expect(reset.book.fills).toEqual([])
  expect(opened.book.shares).toBeGreaterThan(0)
})

test('bollinger rails are the 20-SMA plus or minus 2 standard deviations', () => {
  const closes = Array.from({ length: 20 }, (_, i) => i + 1)
  const last = bollinger(closes, 20, 2)[19]
  expect(last).not.toBeNull()
  if (!last) return
  expect(last.sma).toBeCloseTo(10.5, 8)
  expect(last.upper - last.sma).toBeCloseTo(2 * last.stdev, 8)
  expect(last.sma - last.lower).toBeCloseTo(2 * last.stdev, 8)
  expect(last.upper).toBeGreaterThan(last.sma)
  expect(last.lower).toBeLessThan(last.sma)
})
