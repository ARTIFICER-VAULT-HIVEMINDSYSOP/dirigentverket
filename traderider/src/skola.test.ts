import { expect, test } from 'vitest'
import { bollinger } from './lib/bollinger'
import {
  DEFAULT_LESSON_BASE,
  LESSONS,
  describePosition,
  detectRailChange,
  floorShares,
  formatAmount,
  lessonHref,
  normalizeLessonBase,
  parsePracticeNumber,
  positionSize,
  railChangeBetween,
  railExplanation,
  readSkolaEnabled,
  suggestedStop,
  writeSkolaEnabled,
  type PositionSizeInput,
} from './lib/skola'

const band = { sma: 100, upper: 110, lower: 90, stdev: 5 }

function size(overrides: Partial<PositionSizeInput> = {}) {
  return positionSize({
    accountSize: 20_000,
    riskPct: 1,
    entry: 100,
    stop: 97,
    takeProfit: null,
    ...overrides,
  })
}

test('position size uses 1 percent of the example account and floors the share count', () => {
  const result = size()
  expect(result.riskAmount).toBe(200)
  expect(result.stopDistance).toBe(3)
  expect(result.shares).toBe(66)
  expect(floorShares(200, 3)).toBe(66)
  expect(floorShares(200, 2)).toBe(100)
  expect(floorShares(200, 3.5)).toBe(57)
  expect(result.riskAboveTwoPct).toBe(false)
  expect(result.riskReward).toBeNull()
  expect(result.takeProfitSet).toBe(false)
})

test('a 20000 example at 1 percent survives binary division', () => {
  const result = size({ entry: 50, stop: 46 })
  expect(result.riskAmount).toBe(200)
  expect(result.shares).toBe(50)
})

test('missing or zero stop distance leaves the share count empty', () => {
  expect(size({ entry: null }).shares).toBeNull()
  expect(size({ stop: null }).stopDistance).toBeNull()
  expect(size({ entry: 100, stop: 100 }).shares).toBeNull()
  expect(size({ entry: 100, stop: 100 }).stopDistance).toBe(0)
  expect(size({ accountSize: null }).riskAmount).toBeNull()
  expect(size({ riskPct: -1 }).riskAmount).toBeNull()
  expect(size({ accountSize: -5 }).riskAmount).toBeNull()
  expect(floorShares(10, 0)).toBeNull()
})

test('risk above 2 percent warns and a take-profit shows risk against reward', () => {
  expect(size({ riskPct: 2 }).riskAboveTwoPct).toBe(false)
  expect(size({ riskPct: 2.01 }).riskAboveTwoPct).toBe(true)
  const withTarget = size({ entry: 100, stop: 98, takeProfit: 104, riskPct: 3 })
  expect(withTarget.riskAmount).toBe(600)
  expect(withTarget.stopDistance).toBe(2)
  expect(withTarget.shares).toBe(300)
  expect(withTarget.rewardDistance).toBe(4)
  expect(withTarget.riskReward).toBe(2)
  expect(withTarget.takeProfitSet).toBe(true)
  const text = describePosition(withTarget)
  expect(text.warning).toBe('Risken är högre än 2 procent. Övningsregeln i lektion 1 stannar vid 1 procent.')
  expect(text.reward).toBe(`Risk mot belöning är 1 till ${formatAmount(2)}.`)
  expect(text.shares).toContain('300')
  expect(text.shares).toContain('avrundat nedåt')
})

test('an empty take-profit does not invent a reward ratio', () => {
  const text = describePosition(size())
  expect(text.reward).toBeNull()
  expect(text.warning).toBeNull()
  expect(text.risk).toBe(`Riskbeloppet är ${formatAmount(200)}.`)
  expect(text.distance).toBe(`Stoppavståndet är ${formatAmount(3)}.`)
  expect(describePosition(size({ takeProfit: -1 })).reward).toBe('Risk mot belöning saknas.')
})

test('practice numbers accept Swedish grouping and a decimal comma', () => {
  expect(parsePracticeNumber('20 000')).toBe(20000)
  expect(parsePracticeNumber('1,5')).toBe(1.5)
  expect(parsePracticeNumber('')).toBeNull()
  expect(parsePracticeNumber('nej')).toBeNull()
})

test('stop prefills from the opposite band, or the 20-SMA when flat', () => {
  expect(suggestedStop('long', band)).toBe(90)
  expect(suggestedStop('short', band)).toBe(110)
  expect(suggestedStop('flat', band)).toBe(100)
  expect(suggestedStop('flat', null)).toBeNull()
})

test('lesson links keep the configurable base and the lesson 1 file name', () => {
  expect(LESSONS.map((lesson) => lesson.id)).toEqual([1, 2, 3])
  expect(normalizeLessonBase(undefined)).toBe(DEFAULT_LESSON_BASE)
  expect(lessonHref('../tradingskolan', LESSONS[0].file)).toBe(
    '../tradingskolan/lektion-1-risk-och-positionsstorlek.html',
  )
  expect(lessonHref('/tradingskolan/', LESSONS[2].file)).toBe('/tradingskolan/lektion-3-bollingerband.html')
  expect(normalizeLessonBase('javascript:alert(1)')).toBe(DEFAULT_LESSON_BASE)
})

test('rail changes are the upper cross, the lower cross, and the return to the 20-SMA', () => {
  expect(railExplanation('crossed_upper')).toBe(
    'Priset stängde över övre bandet. Enligt övningsregeln betyder det köp.',
  )
  expect(detectRailChange(100, 111, band)).toBe('crossed_upper')
  expect(detectRailChange(100, 89, band)).toBe('crossed_lower')
  expect(detectRailChange(104, 96, band)).toBe('returned_to_sma')
  expect(detectRailChange(96, 100, band)).toBe('returned_to_sma')
  expect(detectRailChange(112, 114, band)).toBeNull()
  expect(detectRailChange(101, 103, band)).toBeNull()
  expect(detectRailChange(104, 110, band)).toBeNull()
  expect(detectRailChange(96, 111, band)).toBe('crossed_upper')
  expect(detectRailChange(Number.NaN, 111, band)).toBeNull()
})

test('a later rail change in the same step wins, and a flat series only notes the break', () => {
  const candles = [{ c: 100 }, { c: 112 }, { c: 96 }]
  const bands = [null, band, band]
  expect(railChangeBetween(candles, bands, 0, 1)).toEqual({ index: 1, change: 'crossed_upper' })
  expect(railChangeBetween(candles, bands, 0, 2)).toEqual({ index: 2, change: 'returned_to_sma' })
  expect(railChangeBetween(candles, bands, 2, 2)).toBeNull()

  const closes = Array.from({ length: 30 }, () => 100)
  closes[29] = 130
  const series = closes.map((c) => ({ c }))
  const computed = bollinger(closes, 20, 2)
  expect(railChangeBetween(series, computed, 19, 29)?.change).toBe('crossed_upper')
  expect(railExplanation('crossed_lower')).toContain('sälj')
  expect(railExplanation('returned_to_sma')).toContain('20-SMA')
})

test('skola mode defaults to on and stores the off switch', () => {
  const memory = new Map<string, string>()
  const storage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value)
    },
  }
  expect(readSkolaEnabled(storage)).toBe(true)
  writeSkolaEnabled(storage, false)
  expect(readSkolaEnabled(storage)).toBe(false)
  writeSkolaEnabled(storage, true)
  expect(readSkolaEnabled(storage)).toBe(true)
  expect(readSkolaEnabled(null)).toBe(true)
})
