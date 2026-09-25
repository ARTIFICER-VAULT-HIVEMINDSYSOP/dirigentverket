export type Candle = {
  t: number
  o: number
  h: number
  l: number
  c: number
  v: number
}

export type NvdaSource = 'yahoo' | 'fallback'

export type NvdaPayload = {
  source: NvdaSource
  fallback: boolean
  label: string
  symbol: 'NVDA'
  interval: string
  candles: Candle[]
}

export type Side = 'long' | 'short' | 'flat'

export type Quote = {
  bid: number
  offer: number
  last: number
  slippage: number
}
