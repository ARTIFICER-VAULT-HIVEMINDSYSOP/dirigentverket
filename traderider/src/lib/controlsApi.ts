import type { Side } from './types'

export type ControlsTestApi = {
  getTrainY: () => number
  getSpeed: () => number
  getLeverage: () => number
  getProgress: () => number
  getSide: () => Side
  buy: () => void
  sell: () => void
  flatten: () => void
  setLeverage: (n: number) => void
  step: (dtMs: number) => void
  pause: () => void
}

declare global {
  interface Window {
    __controlsTest?: ControlsTestApi
  }
}
