import type { Band } from './bollinger'
import type { Side } from './types'

/** Practice-rail change between two closes on one Bollinger snapshot. */
export type RailChange = 'crossed_upper' | 'returned_to_sma' | 'crossed_lower'

export type RailNote = {
  index: number
  change: RailChange
}

export type PositionSizeInput = {
  accountSize: number | null
  riskPct: number | null
  entry: number | null
  stop: number | null
  takeProfit: number | null
}

export type PositionSizeResult = {
  riskAmount: number | null
  stopDistance: number | null
  shares: number | null
  rewardDistance: number | null
  riskReward: number | null
  riskAboveTwoPct: boolean
  takeProfitSet: boolean
}

export const SKOLA_STORAGE_KEY = 'traderider-skola-lage'

export const DEFAULT_LESSON_BASE = '../tradingskolan/'

export const LESSONS = [
  {
    id: 1,
    file: 'lektion-1-risk-och-positionsstorlek.html',
    title: 'Risk och positionsstorlek',
  },
  {
    id: 2,
    file: 'lektion-2-risk-och-beloning.html',
    title: 'Risk och belöning',
  },
  {
    id: 3,
    file: 'lektion-3-bollingerband.html',
    title: 'Bollingerband',
  },
] as const

const RAIL_EXPLANATION: Record<RailChange, string> = {
  crossed_upper: 'Priset stängde över övre bandet. Enligt övningsregeln betyder det köp.',
  crossed_lower: 'Priset stängde under nedre bandet. Enligt övningsregeln betyder det sälj.',
  returned_to_sma:
    'Priset återvände till 20-SMA. Enligt övningsregeln betyder det att övningspositionen stängs.',
}

export function railExplanation(change: RailChange): string {
  return RAIL_EXPLANATION[change]
}

/**
 * Destination rail of this close versus the previous close.
 * A close above the upper band wins over a mean cross in the same step.
 * A close below the lower band is next. Returning to the 20-SMA is a cross of the mean
 * while the new close is still strictly inside the bands.
 */
export function detectRailChange(prevClose: number, close: number, band: Band): RailChange | null {
  if (!Number.isFinite(prevClose) || !Number.isFinite(close)) return null
  if (!Number.isFinite(band.upper) || !Number.isFinite(band.lower) || !Number.isFinite(band.sma)) return null
  if (prevClose <= band.upper && close > band.upper) return 'crossed_upper'
  if (prevClose >= band.lower && close < band.lower) return 'crossed_lower'
  const prevDelta = prevClose - band.sma
  const nowDelta = close - band.sma
  const crossedSma = prevDelta !== 0 && (nowDelta === 0 || prevDelta * nowDelta < 0)
  const strictlyInside = close < band.upper && close > band.lower
  if (crossedSma && strictlyInside) return 'returned_to_sma'
  return null
}

export function railChangeAt(
  candles: Array<{ c: number }>,
  bands: Array<Band | null>,
  index: number,
): RailChange | null {
  if (!Number.isInteger(index) || index < 1) return null
  const band = bands[index]
  const close = candles[index]?.c
  const prev = candles[index - 1]?.c
  if (!band || close == null || prev == null) return null
  return detectRailChange(prev, close, band)
}

/** Latest rail change in (fromIndex, toIndex], using each candle's own band. */
export function railChangeBetween(
  candles: Array<{ c: number }>,
  bands: Array<Band | null>,
  fromIndex: number,
  toIndex: number,
): RailNote | null {
  if (!Number.isFinite(fromIndex) || !Number.isFinite(toIndex)) return null
  const start = Math.floor(fromIndex) + 1
  const end = Math.min(Math.floor(toIndex), candles.length - 1)
  if (end < start) return null
  let found: RailNote | null = null
  for (let i = Math.max(1, start); i <= end; i++) {
    const change = railChangeAt(candles, bands, i)
    if (change) found = { index: i, change }
  }
  return found
}

export function bandAtProgress(bands: Array<Band | null>, progress: number): Band | null {
  if (!Number.isFinite(progress) || bands.length === 0) return null
  const index = Math.min(bands.length - 1, Math.max(0, Math.floor(progress)))
  return bands[index] ?? null
}

/** Long uses the lower band, short uses the upper band, flat uses the 20-SMA. */
export function suggestedStop(side: Side, band: Band | null): number | null {
  if (!band) return null
  if (![band.sma, band.upper, band.lower].every((n) => Number.isFinite(n))) return null
  if (side === 'long') return band.lower
  if (side === 'short') return band.upper
  return band.sma
}

export function normalizeLessonBase(raw: string | undefined): string {
  const value = (raw ?? '').trim()
  if (value === '' || /^javascript:/i.test(value)) return DEFAULT_LESSON_BASE
  return value.endsWith('/') ? value : `${value}/`
}

export function lessonHref(base: string, file: string): string {
  return `${normalizeLessonBase(base)}${file}`
}

export function readSkolaEnabled(storage: Pick<Storage, 'getItem'> | null | undefined): boolean {
  if (!storage) return true
  try {
    const value = storage.getItem(SKOLA_STORAGE_KEY)
    if (value === '0' || value === 'off' || value === 'av') return false
    return true
  } catch {
    return true
  }
}

export function writeSkolaEnabled(storage: Pick<Storage, 'setItem'> | null | undefined, on: boolean): void {
  if (!storage) return
  try {
    storage.setItem(SKOLA_STORAGE_KEY, on ? '1' : '0')
  } catch {
    // The switch still updates on screen when storage is blocked.
  }
}

export function parsePracticeNumber(raw: string): number | null {
  const trimmed = raw.trim().replace(/[\s\u00a0\u202f]/g, '').replace(',', '.')
  if (!/^[+-]?\d*\.?\d+$/.test(trimmed)) return null
  const value = Number(trimmed)
  if (!Number.isFinite(value)) return null
  return value
}

function finite(n: number | null): number | null {
  if (n == null || !Number.isFinite(n)) return null
  return n
}

/** Strip binary dust. This does not round the practice amount to cents. */
function clean(n: number): number {
  return Math.round(n * 1e8) / 1e8
}

/** Whole shares. floor(risk / stop distance), or null when the distance is missing or zero. */
export function floorShares(riskAmount: number, stopDistance: number): number | null {
  if (!Number.isFinite(riskAmount) || !Number.isFinite(stopDistance)) return null
  if (!(riskAmount >= 0) || !(stopDistance > 0)) return null
  const ratio = clean(riskAmount) / clean(stopDistance)
  if (!Number.isFinite(ratio) || ratio < 0) return null
  const nearest = Math.round(ratio)
  if (Math.abs(ratio - nearest) <= 1e-6) return nearest
  return Math.floor(ratio + 1e-9)
}

export function positionSize(input: PositionSizeInput): PositionSizeResult {
  const account = finite(input.accountSize)
  const riskPct = finite(input.riskPct)
  const entry = finite(input.entry)
  const stop = finite(input.stop)
  const takeProfit = finite(input.takeProfit)
  const riskAboveTwoPct = riskPct != null && riskPct > 2
  const riskAmount =
    account != null && account >= 0 && riskPct != null && riskPct >= 0
      ? clean(account * (riskPct / 100))
      : null
  const entryOk = entry != null && entry >= 0
  const stopOk = stop != null && stop >= 0
  const stopDistance = entryOk && stopOk ? clean(Math.abs(entry - stop)) : null
  const shares = riskAmount != null && stopDistance != null ? floorShares(riskAmount, stopDistance) : null
  const takeProfitSet = takeProfit != null
  const tpOk = takeProfit != null && takeProfit >= 0
  const rewardDistance = entryOk && tpOk ? clean(Math.abs(takeProfit - entry)) : null
  const riskReward =
    rewardDistance != null && stopDistance != null && stopDistance > 0
      ? clean(rewardDistance / stopDistance)
      : null
  return {
    riskAmount,
    stopDistance,
    shares,
    rewardDistance,
    riskReward,
    riskAboveTwoPct,
    takeProfitSet,
  }
}

export function formatAmount(n: number): string {
  return new Intl.NumberFormat('sv-SE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

export function formatShares(n: number): string {
  return new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 }).format(n)
}

export function describePosition(result: PositionSizeResult): {
  risk: string
  distance: string
  shares: string
  reward: string | null
  warning: string | null
} {
  const risk = result.riskAmount == null ? 'Riskbeloppet saknas.' : `Riskbeloppet är ${formatAmount(result.riskAmount)}.`
  const distance =
    result.stopDistance == null
      ? 'Stoppavståndet saknas.'
      : `Stoppavståndet är ${formatAmount(result.stopDistance)}.`
  const shares =
    result.shares == null
      ? 'Antalet aktier saknas.'
      : `Antalet aktier är ${formatShares(result.shares)}. Talet är riskbeloppet delat med stoppavståndet, avrundat nedåt.`
  const reward = !result.takeProfitSet
    ? null
    : result.riskReward == null
      ? 'Risk mot belöning saknas.'
      : `Risk mot belöning är 1 till ${formatAmount(result.riskReward)}.`
  const warning = result.riskAboveTwoPct
    ? 'Risken är högre än 2 procent. Övningsregeln i lektion 1 stannar vid 1 procent.'
    : null
  return { risk, distance, shares, reward, warning }
}
