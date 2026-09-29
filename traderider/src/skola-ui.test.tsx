import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { Desk } from './components/Desk'
import { createDesk, markFromCandles } from './lib/deskState'
import {
  LESSONS,
  SKOLA_STORAGE_KEY,
  bandAtProgress,
  describePosition,
  lessonHref,
  positionSize,
  suggestedStop,
} from './lib/skola'
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
  expect(view.getByText(copy.distance)).toBeTruthy()
  expect(view.getByText('Riskbeloppet saknas.')).toBeTruthy()
  expect(view.getByText('Antalet aktier saknas.')).toBeTruthy()
  expect(view.getByLabelText('Kontostorlek (exempel)')).toHaveProperty('value', '')
  expect(view.getByLabelText('Risk i procent')).toHaveProperty('value', '')
  expect(view.getByLabelText('Kontostorlek (exempel)')).toHaveProperty('placeholder', 'saknas')
  const canvas = view.container.querySelector('canvas')
  const secondary = view.container.querySelector('[data-skola-secondary]')
  if (!canvas || !secondary) throw new Error('missing chart or skola panel')
  expect(canvas.compareDocumentPosition(secondary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

  const menu = view.getByRole('navigation', { name: 'Lektioner' })
  expect(menu.getAttribute('data-lesson-base')).toBe('https://www.kapitalstrategi.com')
  expect(menu.querySelectorAll('a[href$=".html"]').length).toBe(0)
  for (const lesson of LESSONS) {
    const name = `Lektion ${lesson.id}: ${lesson.title}.`
    if (lessonHref(undefined, lesson)) {
      expect(view.getByRole('link', { name }).getAttribute('href')).toBe(lessonHref(undefined, lesson))
    } else {
      expect(view.queryByRole('link', { name })).toBeNull()
      expect(menu.querySelector(`[data-lesson-missing="${lesson.id}"]`)?.textContent).toBe(`${name} (länk saknas)`)
    }
  }
})

test('a custom lesson base is used for the lesson menu', () => {
  const view = render(
    <Desk candles={waving()} source="yahoo" label="Yahoo NVDA" autoRun={false} lessonBase="/ovning/skola/" />,
  )
  expect(view.getByRole('navigation', { name: 'Lektioner' }).getAttribute('data-lesson-base')).toBe('/ovning/skola')
  for (const lesson of LESSONS) {
    const href = lessonHref('/ovning/skola', lesson)
    if (href) {
      expect(view.getByRole('link', { name: `Lektion ${lesson.id}: ${lesson.title}.` }).getAttribute('href')).toBe(href)
    }
  }
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
    'Priset stängde över övre bandet. Enligt övningsregeln betyder det köp. Läs mer i lektion 3: Bollingerband (länk saknas).',
  )
  // The live site has no Bollinger lesson, so the note names it without a link.
  expect(note.querySelector('a')).toBeNull()
  expect(note.querySelector('[data-lesson-missing="3"]')?.textContent).toBe('Bollingerband (länk saknas)')

  fireEvent.click(view.getByRole('button', { name: 'Reset book' }))
  expect(view.getByRole('status').getAttribute('data-skola-note-phase')).toBe('out')
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

test('without a take-profit the position box names lesson 2, linked only when its live URL is verified', () => {
  const view = render(<Desk candles={waving()} source="yahoo" label="Yahoo NVDA" autoRun={false} />)
  const box = view.container.querySelector('[data-skola-position]')
  if (!box) throw new Error('missing position box')
  const href = lessonHref(undefined, LESSONS[1])
  if (href) {
    expect(box.querySelector('a')?.getAttribute('href')).toBe(href)
  } else {
    expect(box.querySelector('a')).toBeNull()
    expect(box.querySelector('[data-lesson-missing="2"]')?.textContent).toBe('lektion 2: Risk och belöning (länk saknas)')
  }
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
