export type Command = 'buy' | 'sell' | 'flat' | 'lev_down' | 'lev_up' | 'pause'

export function commandFromKey(key: string): Command | null {
  switch (key) {
    case 'w':
    case 'W':
    case 'ArrowUp':
      return 'buy'
    case 's':
    case 'S':
    case 'ArrowDown':
      return 'sell'
    case 'f':
    case 'F':
      return 'flat'
    case '[':
      return 'lev_down'
    case ']':
      return 'lev_up'
    case ' ':
    case 'Spacebar':
      return 'pause'
    default:
      return null
  }
}
