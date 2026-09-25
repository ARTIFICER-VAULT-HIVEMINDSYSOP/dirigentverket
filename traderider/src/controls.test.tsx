import { act, cleanup, render } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { Desk } from './components/Desk'
import { createDesk, markFromCandles, priceScale, sampleBand, trainDrawScale, trainScreenY } from './lib/deskState'
import { commandFromKey } from './lib/keys'
import { SESSION_KEY } from './lib/brokerSession'
import type { Candle } from './lib/types'

function fixture(): Candle[] {
  const candles: Candle[] = []
  for (let i = 0; i < 48; i++) {
    const c = 100 + Math.sin(i / 2.5) * 4 + (i % 7) * 0.15
    candles.push({
      t: 1_700_000_000 + i * 3600,
      o: c - 0.2,
      h: c + 0.5,
      l: c - 0.5,
      c,
      v: 1000 + i,
    })
  }
  return candles
}

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  delete window.__controlsTest
})

test('window.__controlsTest moves the train and runs 4x faster than 1x', () => {
  render(<Desk candles={fixture()} source="yahoo" label="Yahoo NVDA" autoRun={false} />)
  const api = window.__controlsTest
  if (!api) throw new Error('missing __controlsTest')

  expect(api.getSide()).toBe('flat')
  const yFlat = api.getTrainY()
  act(() => api.buy())
  expect(api.getSide()).toBe('long')
  expect(api.getTrainY()).toBeLessThan(yFlat)

  act(() => api.flatten())
  expect(api.getSide()).toBe('flat')
  const yMid = api.getTrainY()
  act(() => api.sell())
  expect(api.getSide()).toBe('short')
  expect(api.getTrainY()).toBeGreaterThan(yMid)

  act(() => api.setLeverage(1))
  const speed1 = api.getSpeed()
  const p0 = api.getProgress()
  act(() => api.step(500))
  const d1 = api.getProgress() - p0

  act(() => api.setLeverage(4))
  const speed4 = api.getSpeed()
  const p1 = api.getProgress()
  act(() => api.step(500))
  const d4 = api.getProgress() - p1

  expect(speed4).toBeCloseTo(speed1 * 4, 8)
  expect(d4).toBeGreaterThan(d1)
  expect(d4 / d1).toBeCloseTo(4, 5)

  act(() => api.setLeverage(10))
  expect(api.getLeverage()).toBe(4)
})

test('band gap stays at least 108px and price up means a smaller Y', () => {
  const desk = createDesk(fixture())
  const band = sampleBand(desk.bands, desk.progress)
  if (!band) throw new Error('missing band')
  const scale = priceScale(desk.viewport.height, band)
  expect(scale.gapPx).toBeGreaterThanOrEqual(108)
  expect(scale.y(band.upper)).toBeLessThan(scale.y(band.sma))
  expect(scale.y(band.lower)).toBeGreaterThan(scale.y(band.sma))
  expect(trainScreenY(desk)).toBeCloseTo(scale.y(band.sma), 6)
})

test('fallback data is labelled on the desk', () => {
  const view = render(
    <Desk
      candles={fixture()}
      source="fallback"
      label="Fallback data — Yahoo unavailable"
      autoRun={false}
    />,
  )
  expect(view.getByText(/Fallback data — Yahoo unavailable/)).toBeTruthy()
})

test('reset does not call the broker when the session is live', async () => {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      env: 'live',
      keyId: 'key-test-id',
      secret: 'secret-test-value',
      liveAcknowledged: true,
    }),
  )
  const calls: string[] = []
  const original = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calls.push(String(input))
    return new Response('{}', { status: 500 })
  }) as typeof fetch
  try {
    const view = render(<Desk candles={fixture()} source="yahoo" label="Yahoo NVDA" autoRun={false} />)
    await act(async () => {
      view.getByRole('button', { name: 'Reset book' }).click()
    })
    expect(calls).toEqual([])
    expect(view.getByText(/Live broker position was not flattened/)).toBeTruthy()
    expect(document.body.textContent ?? '').not.toContain('secret-test-value')
  } finally {
    globalThis.fetch = original
  }
})

test('static desk hides the broker and does not call /api/broker', async () => {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      env: 'live',
      keyId: 'key-test-id',
      secret: 'secret-test-value',
      liveAcknowledged: true,
    }),
  )
  const calls: string[] = []
  const original = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calls.push(String(input))
    return new Response('{}', { status: 500 })
  }) as typeof fetch
  try {
    const view = render(
      <Desk
        candles={fixture()}
        source="fallback"
        label="Fallback data — Yahoo unavailable"
        autoRun={false}
        brokerEnabled={false}
      />,
    )
    expect(view.queryByRole('heading', { name: 'Broker' })).toBeNull()
    expect(view.getByText(/Static paper book\. Broker is off/)).toBeTruthy()
    await act(async () => {
      view.getByRole('button', { name: /Buy/ }).click()
    })
    expect(calls.filter((url) => url.includes('/api/broker'))).toEqual([])
    await act(async () => {
      view.getByRole('button', { name: 'Reset book' }).click()
    })
    expect(view.getByText(/Local book reset\. Flat on the 20-SMA/)).toBeTruthy()
    expect(view.queryByText(/Live broker position was not flattened/)).toBeNull()
    expect(document.body.textContent ?? '').not.toContain('secret-test-value')
  } finally {
    globalThis.fetch = original
  }
})

test('mark is the current close versus the previous close', () => {
  const candles = fixture()
  const mark = markFromCandles(candles, 20)
  expect(mark.close).toBe(candles[20]?.c)
  const prev = candles[19]?.c
  if (mark.close == null || prev == null) throw new Error('missing close')
  expect(mark.pct).toBeCloseTo(((mark.close - prev) / prev) * 100, 8)
  expect(markFromCandles(candles, 0).pct).toBeNull()
  expect(markFromCandles([], 3).close).toBeNull()
})

test('the locomotive is larger on a desktop width than at 390px', () => {
  expect(trainDrawScale(1280)).toBeGreaterThanOrEqual(2)
  expect(trainDrawScale(1280)).toBeLessThanOrEqual(3)
  expect(trainDrawScale(390)).toBeGreaterThan(1)
  expect(trainDrawScale(390)).toBeLessThan(trainDrawScale(1280))
  const desk = createDesk(fixture())
  const band = sampleBand(desk.bands, desk.progress)
  if (!band) throw new Error('missing band')
  expect(priceScale(280, band, 390).gapPx).toBeGreaterThanOrEqual(108)
})

test('keyboard map covers the desk controls', () => {
  expect(commandFromKey('w')).toBe('buy')
  expect(commandFromKey('ArrowUp')).toBe('buy')
  expect(commandFromKey('s')).toBe('sell')
  expect(commandFromKey('ArrowDown')).toBe('sell')
  expect(commandFromKey('f')).toBe('flat')
  expect(commandFromKey('[')).toBe('lev_down')
  expect(commandFromKey(']')).toBe('lev_up')
  expect(commandFromKey(' ')).toBe('pause')
  expect(commandFromKey('x')).toBeNull()
})
