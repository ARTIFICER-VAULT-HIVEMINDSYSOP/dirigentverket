export type BrokerAction = 'account' | 'position' | 'order'

export type BrokerRequestBody = {
  env?: string
  keyId?: string
  secret?: string
  liveAck?: boolean
  action?: string
  order?: {
    symbol?: string
    side?: string
    qty?: number
    type?: string
    time_in_force?: string
  }
}

const PAPER_BASE = 'https://paper-api.alpaca.markets'
const LIVE_BASE = 'https://api.alpaca.markets'

export function scrubSecrets(text: string, secrets: string[]): string {
  let out = text
  for (const secret of secrets) {
    if (secret && secret.length >= 4) out = out.split(secret).join('[redacted]')
  }
  return out
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

function clip(text: string): string {
  return text.length > 400 ? text.slice(0, 400) : text
}

function viewResult(action: BrokerAction, parsed: unknown): unknown {
  const o = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  if (action === 'account') {
    return {
      status: o.status ?? null,
      equity: o.equity ?? null,
      buying_power: o.buying_power ?? null,
      cash: o.cash ?? null,
    }
  }
  if (action === 'position') {
    return {
      symbol: o.symbol ?? null,
      qty: o.qty ?? null,
      side: o.side ?? null,
      avg_entry_price: o.avg_entry_price ?? null,
    }
  }
  return {
    id: o.id ?? null,
    symbol: o.symbol ?? null,
    qty: o.qty ?? null,
    side: o.side ?? null,
    type: o.type ?? null,
    status: o.status ?? null,
  }
}

/**
 * Proxies Alpaca. Paper is the default host.
 * Keys are forwarded as headers and never written to logs or to the JSON we return.
 * There is no close-all / flatten route — game reset must not gain one.
 */
export async function handleBrokerRequest(
  request: Request,
  deps?: { fetchImpl?: typeof fetch },
): Promise<Response> {
  const fetchImpl = deps?.fetchImpl ?? fetch
  let body: BrokerRequestBody
  try {
    body = (await request.json()) as BrokerRequestBody
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400)
  }

  const env = body.env === 'live' ? 'live' : 'paper'
  const keyId = typeof body.keyId === 'string' ? body.keyId.trim() : ''
  const secret = typeof body.secret === 'string' ? body.secret.trim() : ''
  if (!keyId || !secret) return json({ ok: false, error: 'missing_keys' }, 400)
  if (env === 'live' && body.liveAck !== true) {
    return json({ ok: false, error: 'live_ack_required' }, 403)
  }

  const action = body.action
  if (action !== 'account' && action !== 'position' && action !== 'order') {
    return json({ ok: false, error: 'bad_action' }, 400)
  }

  let path = '/v2/account'
  let method = 'GET'
  let payload: string | undefined

  if (action === 'position') path = '/v2/positions/NVDA'

  if (action === 'order') {
    const order = body.order
    const symbol = order?.symbol
    const side = order?.side
    const type = order?.type ?? 'market'
    const qty = order?.qty
    if (symbol !== 'NVDA') return json({ ok: false, error: 'symbol_nvda_only' }, 400)
    if (side !== 'buy' && side !== 'sell') return json({ ok: false, error: 'bad_side' }, 400)
    if (type !== 'market') return json({ ok: false, error: 'market_orders_only' }, 400)
    if (typeof qty !== 'number' || !Number.isInteger(qty) || qty < 1) {
      return json({ ok: false, error: 'whole_shares_only' }, 400)
    }
    method = 'POST'
    path = '/v2/orders'
    payload = JSON.stringify({
      symbol: 'NVDA',
      qty: String(qty),
      side,
      type: 'market',
      time_in_force: 'day',
    })
  }

  const base = env === 'live' ? LIVE_BASE : PAPER_BASE
  const url = base + path

  let upstream: Response
  try {
    upstream = await fetchImpl(url, {
      method,
      headers: {
        'APCA-API-KEY-ID': keyId,
        'APCA-API-SECRET-KEY': secret,
        accept: 'application/json',
        ...(payload ? { 'content-type': 'application/json' } : {}),
      },
      body: payload,
    })
  } catch {
    return json({ ok: false, error: 'broker_unreachable' }, 502)
  }

  const text = await upstream.text()
  const scrubbed = scrubSecrets(text, [keyId, secret])

  if (action === 'position' && upstream.status === 404) {
    return json({ ok: true, env, action, result: null }, 200)
  }

  if (!upstream.ok) {
    return json(
      { ok: false, error: 'broker_rejected', status: upstream.status, message: clip(scrubbed) },
      502,
    )
  }

  let parsed: unknown = null
  try {
    parsed = JSON.parse(scrubbed)
  } catch {
    parsed = null
  }
  return json({ ok: true, env, action, result: viewResult(action, parsed) }, 200)
}
