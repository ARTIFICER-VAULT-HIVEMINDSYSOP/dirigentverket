import { expect, test } from 'vitest'
import { fallbackPayload, loadNvdaCandles, loadNvdaForStatic, parseYahooChart } from './lib/loadNvda'

test('bundled fallback is labelled NVDA candles', () => {
  const payload = fallbackPayload()
  expect(payload.fallback).toBe(true)
  expect(payload.source).toBe('fallback')
  expect(payload.label).toBe('Fallback data — Yahoo unavailable')
  expect(payload.symbol).toBe('NVDA')
  expect(payload.candles.length).toBeGreaterThanOrEqual(20)
  expect(payload.candles[0]?.c).toBeGreaterThan(0)
})

test('a failed Yahoo fetch falls back to the bundle', async () => {
  const payload = await loadNvdaCandles(async () => new Response('nope', { status: 503 }))
  expect(payload.fallback).toBe(true)
  expect(payload.label).toContain('Fallback data')
  expect(payload.candles.length).toBeGreaterThanOrEqual(20)
})

const yahooChart = {
  chart: {
    result: [
      {
        timestamp: Array.from({ length: 20 }, (_, i) => 1_700_000_000 + i * 3600),
        indicators: {
          quote: [
            {
              open: Array.from({ length: 20 }, () => 100),
              high: Array.from({ length: 20 }, () => 101),
              low: Array.from({ length: 20 }, () => 99),
              close: Array.from({ length: 20 }, (_, i) => 100 + i),
              volume: Array.from({ length: 20 }, () => 10),
            },
          ],
        },
      },
    ],
  },
}

test('static loader uses the bundle when the browser fetch fails', async () => {
  const failed = await loadNvdaForStatic(async () => new Response('nope', { status: 503 }))
  expect(failed.fallback).toBe(true)
  expect(failed.label).toBe('Fallback data — Yahoo unavailable')

  const thrown = await loadNvdaForStatic(async () => {
    throw new Error('cors')
  })
  expect(thrown.source).toBe('fallback')
  expect(thrown.candles.length).toBeGreaterThanOrEqual(20)
})

test('static loader keeps Yahoo candles when the chart fetch succeeds', async () => {
  const payload = await loadNvdaForStatic(async () => Response.json(yahooChart))
  expect(payload.source).toBe('yahoo')
  expect(payload.fallback).toBe(false)
  expect(payload.label).toBe('Yahoo NVDA')
  expect(payload.candles).toHaveLength(20)
})

test('yahoo chart payload parses into candles', () => {
  const candles = parseYahooChart(yahooChart)
  expect(candles).toHaveLength(20)
  expect(candles[19]?.c).toBe(119)
})
