import { afterEach, expect, test, vi } from 'vitest'
import { handleBrokerRequest, scrubSecrets } from './lib/brokerProxy'
import {
  SESSION_KEY,
  clearBrokerSession,
  loadBrokerSession,
  saveBrokerSession,
  shouldRelayToBroker,
  type BrokerSession,
} from './lib/brokerSession'
import { resetGame, initialBook } from './lib/market'

const session: BrokerSession = {
  env: 'paper',
  keyId: 'key-test-id',
  secret: 'secret-test-value',
  liveAcknowledged: false,
}

afterEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  vi.restoreAllMocks()
})

function post(body: unknown): Request {
  return new Request('http://traderider.local/api/broker', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

test('broker keys are refused by localStorage and kept in sessionStorage', () => {
  expect(() => saveBrokerSession(localStorage, session)).toThrow(/sessionStorage/)
  expect(localStorage.getItem(SESSION_KEY)).toBeNull()
  saveBrokerSession(sessionStorage, session)
  expect(sessionStorage.getItem(SESSION_KEY)).toContain('key-test-id')
  expect(localStorage.getItem(SESSION_KEY)).toBeNull()
  expect(loadBrokerSession(sessionStorage)?.env).toBe('paper')
  clearBrokerSession(sessionStorage)
  expect(loadBrokerSession(sessionStorage)).toBeNull()
})

test('reset and liquidation never relay, and live needs an acknowledgement', () => {
  expect(shouldRelayToBroker({ kind: 'reset', env: 'live', liveAcknowledged: true })).toBe(false)
  expect(shouldRelayToBroker({ kind: 'liquidation', env: 'live', liveAcknowledged: true })).toBe(false)
  expect(shouldRelayToBroker({ kind: 'user_order', env: 'live', liveAcknowledged: false })).toBe(false)
  expect(shouldRelayToBroker({ kind: 'user_flatten', env: 'live', liveAcknowledged: true })).toBe(true)
  expect(shouldRelayToBroker({ kind: 'user_order', env: 'paper', liveAcknowledged: false })).toBe(true)
  expect(shouldRelayToBroker({ kind: 'user_order', env: 'off', liveAcknowledged: true })).toBe(false)
  expect(resetGame(initialBook(), 'live').brokerFlattenSent).toBe(false)
})

test('proxy defaults to Alpaca paper, NVDA market orders, and whole shares', async () => {
  const calls: Array<{ url: string; body: string | undefined }> = []
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), body: typeof init?.body === 'string' ? init.body : undefined })
    return new Response(JSON.stringify({ id: 'order-1', symbol: 'NVDA', qty: '2', side: 'buy', type: 'market', status: 'accepted' }), {
      status: 200,
    })
  }

  const missingAck = await handleBrokerRequest(
    post({
      env: 'live',
      keyId: session.keyId,
      secret: session.secret,
      action: 'order',
      order: { symbol: 'NVDA', side: 'buy', qty: 2, type: 'market' },
    }),
    { fetchImpl },
  )
  expect(missingAck.status).toBe(403)
  expect(calls).toHaveLength(0)

  const otherSymbol = await handleBrokerRequest(
    post({
      env: 'paper',
      keyId: session.keyId,
      secret: session.secret,
      action: 'order',
      order: { symbol: 'AAPL', side: 'buy', qty: 2, type: 'market' },
    }),
    { fetchImpl },
  )
  expect(otherSymbol.status).toBe(400)
  expect(calls).toHaveLength(0)

  const limit = await handleBrokerRequest(
    post({
      env: 'paper',
      keyId: session.keyId,
      secret: session.secret,
      action: 'order',
      order: { symbol: 'NVDA', side: 'buy', qty: 2, type: 'limit' },
    }),
    { fetchImpl },
  )
  expect(limit.status).toBe(400)

  const fraction = await handleBrokerRequest(
    post({
      env: 'paper',
      keyId: session.keyId,
      secret: session.secret,
      action: 'order',
      order: { symbol: 'NVDA', side: 'buy', qty: 1.5, type: 'market' },
    }),
    { fetchImpl },
  )
  expect(fraction.status).toBe(400)
  expect(calls).toHaveLength(0)

  const ok = await handleBrokerRequest(
    post({
      keyId: session.keyId,
      secret: session.secret,
      action: 'order',
      order: { symbol: 'NVDA', side: 'buy', qty: 2, type: 'market' },
    }),
    { fetchImpl },
  )
  expect(ok.status).toBe(200)
  expect(calls).toHaveLength(1)
  expect(calls[0]?.url.startsWith('https://paper-api.alpaca.markets/v2/orders')).toBe(true)
  expect(calls[0]?.body).toContain('"symbol":"NVDA"')
  expect(calls[0]?.body).toContain('"type":"market"')
  expect(calls[0]?.body).toContain('"qty":"2"')
  const payload = await ok.json()
  expect(JSON.stringify(payload)).not.toContain(session.secret)
  expect(JSON.stringify(payload)).not.toContain(session.keyId)
})

test('proxy responses and console output do not contain secrets', async () => {
  const secret = 'super-secret-value-xyz'
  const keyId = 'AKIA-TEST-KEY'
  const lines: string[] = []
  const methods = ['log', 'info', 'warn', 'error', 'debug'] as const
  for (const method of methods) {
    vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
      lines.push(args.map((part) => String(part)).join(' '))
    })
  }
  const fetchImpl: typeof fetch = async () =>
    new Response(JSON.stringify({ message: `rejected ${secret} ${keyId}` }), { status: 401 })

  const res = await handleBrokerRequest(
    post({
      env: 'paper',
      keyId,
      secret,
      action: 'account',
    }),
    { fetchImpl },
  )
  const text = await res.text()
  expect(text).not.toContain(secret)
  expect(text).not.toContain(keyId)
  expect(text).toContain('[redacted]')
  expect(lines.join('\n')).not.toContain(secret)
  expect(lines.join('\n')).not.toContain(keyId)
  expect(scrubSecrets(`${secret} visible`, [secret])).toBe('[redacted] visible')
})
