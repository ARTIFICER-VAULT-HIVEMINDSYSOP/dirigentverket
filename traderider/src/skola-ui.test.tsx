import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { Desk } from './components/Desk'
import { createDesk, markFromCandles } from './lib/deskState'
import { SKOLA_STORAGE_KEY, bandAtProgress, describePosition, positionSize, suggestedStop } from './lib/skola'
import type { Candle } from './lib/types'

function flatThenSpike(): Candle[] {
  const candles: Candle[] = []
  for (let i = 0; i < 36; i++) {
    const c = i === 30 ? 130 : 100
    candles.push({ t: 1_700_000_000 + i * 3600, o: c, h: c, l: c, c, v: 1 })
  }
  return candles
}

function waving(): Candle[] {
  const candles: Candle[] = []
  for (let i = 0; i < 48; i++) {
    const c = 100 + Math.sin(i / 2.5) * 4 + (i % 7) * 0.15
    candles.push({ t: 1_700_000_000 + i * 3600, o: c - 0.2, h: c + 0.5, l: c - 0.5, c, v: 1000 + i })
  }
  return candles
}

afterEach(() => {
  cleanup()
  localStorage.clear()
  delete window.__controlsTest
})

test('the desk shows the practice banner, the position box, and lesson links', () => {
  const candles = waving()
  const view = render(<Desk candles={candles} source="yahoo" label="Yahoo NVDA" autoRun={false} />)
  expect(view.getByText(/Övning, simulerad data/)).toBeTruthy()
  expect(view.getByLabelText('Skola-läge')).toBeTruthy()

  const desk = createDesk(candles)
  const mark = markFromCandles(desk.candles, desk.progress).close
  const stop = suggestedStop('flat', bandAtProgress(desk.bands, desk.progress))
  const result = positionSize({
    accountSize: 20_000,
    riskPct: 1,
    entry: mark == null ? null : Number(mark.toFixed(2)),
    stop: stop == null ? null : Number(stop.toFixed(2)),
    takeProfit: null,
  })
  const copy = describePosition(result)
  expect(view.getByText(copy.shares)).toBeTruthy()
  expect(view.getByText(copy.risk)).toBeTruthy()
  expect(view.getByText(copy.distance)).toBeTruthy()
  expect(view.getByLabelText('Kontostorlek (exempel)')).toHaveProperty('value', '20 000')
  expect(view.getByLabelText('Risk i procent')).toHaveProperty('value', '1')

  const lesson = view.getByRole('link', { name: 'Lektion 1: Risk och positionsstorlek.' })
  expect(lesson.getAttribute('href')).toBe('../tradingskolan/lektion-1-risk-och-positionsstorlek.html')
  expect(view.getByRole('link', { name: 'Lektion 3: Bollingerband.' }).getAttribute('href')).toBe(
    '../tradingskolan/lektion-3-bollingerband.html',
  )
})

test('a custom lesson base is used for the lesson menu', () => {
  const view = render(
    <Desk candles={waving()} source="yahoo" label="Yahoo NVDA" autoRun={false} lessonBase="/ovning/skola" />,
  )
  expect(view.getByRole('link', { name: 'Lektion 2: Risk och belöning.' }).getAttribute('href')).toBe(
    '/ovning/skola/lektion-2-risk-och-beloning.html',
  )
})

test('crossing the upper band shows the practice note, and reset clears it', () => {
  const view = render(<Desk candles={flatThenSpike()} source="yahoo" label="Yahoo NVDA" autoRun={false} />)
  const api = window.__controlsTest
  if (!api) throw new Error('missing __controlsTest')
  const start = api.getProgress()
  const dt = ((30.2 - start) / api.getSpeed()) * 1000
  act(() => api.step(dt))
  const note = view.getByRole('status')
  expect(note.textContent?.replace(/\s+/g, ' ')).toContain(
    'Priset stängde över övre bandet. Enligt övningsregeln betyder det köp. Läs mer i lektion 3: Bollingerband.',
  )
  expect(note.querySelector('a')?.getAttribute('href')).toBe('../tradingskolan/lektion-3-bollingerband.html')

  fireEvent.click(view.getByRole('button', { name: 'Reset book' }))
  expect(view.queryByText(/Priset stängde över övre bandet/)).toBeNull()
})

test('risk above 2 percent is warned in plain text and a take-profit shows the ratio', () => {
  const view = render(<Desk candles={waving()} source="yahoo" label="Yahoo NVDA" autoRun={false} />)
  fireEvent.change(view.getByLabelText('Risk i procent'), { target: { value: '3' } })
  expect(view.getByText('Risken är högre än 2 procent. Övningsregeln i lektion 1 stannar vid 1 procent.')).toBeTruthy()
  fireEvent.change(view.getByLabelText('Ingångskurs'), { target: { value: '100' } })
  fireEvent.change(view.getByLabelText('Stoppförlust'), { target: { value: '98' } })
  fireEvent.change(view.getByLabelText('Vinstmål'), { target: { value: '104' } })
  expect(view.getByText(/Risk mot belöning är 1 till/)).toBeTruthy()
  expect(view.queryByText(/Vinstmål saknas/)).toBeNull()
})

test('skola mode turns off, stays off, and keeps the practice banner', () => {
  const view = render(<Desk candles={waving()} source="yahoo" label="Yahoo NVDA" autoRun={false} />)
  fireEvent.click(view.getByLabelText('Skola-läge'))
  expect(localStorage.getItem(SKOLA_STORAGE_KEY)).toBe('0')
  expect(view.queryByRole('heading', { name: 'Positionsstorlek' })).toBeNull()
  expect(view.queryByRole('navigation', { name: 'Lektioner' })).toBeNull()
  expect(view.getByText(/Övning, simulerad data/)).toBeTruthy()
  expect(view.getByText(/Skola-läget är av/)).toBeTruthy()

  view.unmount()
  const again = render(<Desk candles={waving()} source="yahoo" label="Yahoo NVDA" autoRun={false} />)
  expect(again.queryByRole('heading', { name: 'Positionsstorlek' })).toBeNull()
  fireEvent.click(again.getByLabelText('Skola-läge'))
  expect(localStorage.getItem(SKOLA_STORAGE_KEY)).toBe('1')
  expect(again.getByRole('heading', { name: 'Positionsstorlek' })).toBeTruthy()
})
