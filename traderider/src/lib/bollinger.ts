export type Band = {
  sma: number
  upper: number
  lower: number
  stdev: number
}

/** Population standard deviation, period 20, k = 2. Original Bollinger definition (divide by n). */
export function bollinger(closes: number[], period = 20, k = 2): (Band | null)[] {
  const out: (Band | null)[] = closes.map(() => null)
  if (period < 2) return out
  for (let i = period - 1; i < closes.length; i++) {
    let sum = 0
    for (let j = i - period + 1; j <= i; j++) sum += closes[j]
    const sma = sum / period
    let varSum = 0
    for (let j = i - period + 1; j <= i; j++) {
      const d = closes[j] - sma
      varSum += d * d
    }
    const stdev = Math.sqrt(varSum / period)
    out[i] = {
      sma,
      stdev,
      upper: sma + k * stdev,
      lower: sma - k * stdev,
    }
  }
  return out
}
