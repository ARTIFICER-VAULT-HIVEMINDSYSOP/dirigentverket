export const SESSION_KEY = 'traderider.alpaca.session.v1'

export type BrokerEnv = 'paper' | 'live'

export type BrokerSession = {
  env: BrokerEnv
  keyId: string
  secret: string
  liveAcknowledged: boolean
}

export type RelayKind = 'user_order' | 'user_flatten' | 'liquidation' | 'reset'

export function shouldRelayToBroker(input: {
  kind: RelayKind
  env: 'off' | BrokerEnv
  liveAcknowledged: boolean
}): boolean {
  if (input.kind === 'liquidation' || input.kind === 'reset') return false
  if (input.env === 'off') return false
  if (input.env === 'live' && input.liveAcknowledged !== true) return false
  return input.kind === 'user_order' || input.kind === 'user_flatten'
}

function refuseLocalStorage(storage: Storage): void {
  if (typeof window !== 'undefined' && storage === window.localStorage) {
    throw new Error('refusing localStorage; broker keys belong in sessionStorage')
  }
}

export function saveBrokerSession(storage: Storage, session: BrokerSession): void {
  refuseLocalStorage(storage)
  storage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function loadBrokerSession(storage: Storage | null): BrokerSession | null {
  if (!storage) return null
  const raw = storage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<BrokerSession>
    if (parsed.env !== 'paper' && parsed.env !== 'live') return null
    if (typeof parsed.keyId !== 'string' || typeof parsed.secret !== 'string') return null
    if (!parsed.keyId || !parsed.secret) return null
    return {
      env: parsed.env,
      keyId: parsed.keyId,
      secret: parsed.secret,
      liveAcknowledged: parsed.liveAcknowledged === true,
    }
  } catch {
    return null
  }
}

export function clearBrokerSession(storage: Storage): void {
  refuseLocalStorage(storage)
  storage.removeItem(SESSION_KEY)
}
