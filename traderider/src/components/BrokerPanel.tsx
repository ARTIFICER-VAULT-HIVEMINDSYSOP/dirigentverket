import { useEffect, useState } from 'react'
import {
  clearBrokerSession,
  loadBrokerSession,
  saveBrokerSession,
  shouldRelayToBroker,
  type BrokerEnv,
  type BrokerSession,
} from '../lib/brokerSession'

export function BrokerPanel() {
  const [env, setEnv] = useState<BrokerEnv>('paper')
  const [keyId, setKeyId] = useState('')
  const [secret, setSecret] = useState('')
  const [acked, setAcked] = useState(false)
  const [stored, setStored] = useState<BrokerSession | null>(null)
  const [line, setLine] = useState('No broker keys in this tab.')

  useEffect(() => {
    const existing = loadBrokerSession(window.sessionStorage)
    setStored(existing)
    if (existing) {
      setEnv(existing.env)
      setAcked(existing.liveAcknowledged)
      setLine(
        existing.env === 'live'
          ? 'Live keys are in sessionStorage. Reset will not flatten that position.'
          : 'Paper keys are in sessionStorage.',
      )
    }
  }, [])

  function chooseEnv(next: BrokerEnv) {
    setEnv(next)
    if (next !== 'live') setAcked(false)
  }

  function save() {
    if (!keyId.trim() || !secret.trim()) {
      setLine('Key id and secret are both required to save.')
      return
    }
    if (env === 'live' && !acked) {
      setLine('Acknowledge live orders before saving live keys.')
      return
    }
    const session: BrokerSession = {
      env,
      keyId: keyId.trim(),
      secret: secret.trim(),
      liveAcknowledged: env === 'live' && acked,
    }
    saveBrokerSession(window.sessionStorage, session)
    setStored(session)
    setSecret('')
    setKeyId('')
    setLine(
      env === 'live'
        ? 'Live keys saved in sessionStorage. They are not in localStorage.'
        : 'Paper keys saved in sessionStorage. They are not in localStorage.',
    )
  }

  function clearKeys() {
    clearBrokerSession(window.sessionStorage)
    setStored(null)
    setSecret('')
    setKeyId('')
    setAcked(false)
    setEnv('paper')
    setLine('Broker keys cleared from this tab.')
  }

  async function checkAccount() {
    const session = loadBrokerSession(window.sessionStorage)
    if (!session) {
      setLine('No keys in this tab.')
      return
    }
    if (
      !shouldRelayToBroker({
        kind: 'user_order',
        env: session.env,
        liveAcknowledged: session.liveAcknowledged,
      })
    ) {
      setLine('Live mode needs the acknowledgement before the proxy is called.')
      return
    }
    try {
      const res = await fetch('/api/broker', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          env: session.env,
          keyId: session.keyId,
          secret: session.secret,
          liveAck: session.liveAcknowledged,
          action: 'account',
        }),
      })
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean
        error?: string
        result?: { equity?: string; buying_power?: string; status?: string } | null
      } | null
      if (!data?.ok) {
        setLine(`Account check failed (${data?.error ?? res.status}).`)
        return
      }
      const result = data.result
      setLine(
        `Alpaca ${session.env} · status ${result?.status ?? '—'} · equity ${result?.equity ?? '—'} · buying power ${result?.buying_power ?? '—'}`,
      )
    } catch {
      setLine('Broker unreachable.')
    }
  }

  return (
    <section className="armor-panel min-w-0 p-3">
      <h2 className="font-display text-2xl leading-none">Broker</h2>
      <p className="mt-1 text-xs leading-relaxed text-ink/65">
        Optional. NVDA market orders only, through /api/broker. Keys stay in sessionStorage for this tab and are not logged. The game book does not need a broker.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => chooseEnv('paper')}
          className={`min-h-11 px-2 text-sm ${env === 'paper' ? 'border border-brass bg-armor text-ink' : 'desk-key'}`}
        >
          Alpaca paper
        </button>
        <button
          type="button"
          onClick={() => chooseEnv('live')}
          className={`min-h-11 px-2 text-sm ${env === 'live' ? 'border border-brick bg-brick text-ink' : 'desk-key'}`}
        >
          Alpaca live
        </button>
      </div>

      {env === 'live' && !acked ? (
        <div className="mt-3 border border-brick/40 p-3">
          <p className="text-sm leading-relaxed">
            Live mode can send real NVDA market orders to Alpaca. Game reset will not flatten a live broker position.
          </p>
          <button
            type="button"
            onClick={() => setAcked(true)}
            className="mt-3 min-h-11 w-full border border-brick px-3 text-sm font-medium text-brick"
          >
            Acknowledge live orders
          </button>
        </div>
      ) : null}

      {env === 'live' && acked ? (
        <p className="mt-3 text-xs text-brick">Live acknowledged for this save.</p>
      ) : null}

      <label className="mt-3 block text-[10px] uppercase tracking-[0.14em] text-ink/55">
        Key id
        <input
          value={keyId}
          onChange={(event) => setKeyId(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          className="mt-1 w-full min-w-0 border border-brass bg-paper px-2 py-2 text-sm text-ink outline-none"
        />
      </label>
      <label className="mt-2 block text-[10px] uppercase tracking-[0.14em] text-ink/55">
        Secret
        <input
          value={secret}
          onChange={(event) => setSecret(event.target.value)}
          type="password"
          autoComplete="off"
          spellCheck={false}
          className="mt-1 w-full min-w-0 border border-brass bg-paper px-2 py-2 text-sm text-ink outline-none"
        />
      </label>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={save} className="desk-key min-h-11 px-2 text-sm">
          Save keys
        </button>
        <button type="button" onClick={clearKeys} className="desk-key min-h-11 px-2 text-sm">
          Clear keys
        </button>
      </div>
      <button type="button" onClick={() => void checkAccount()} className="desk-key mt-2 min-h-11 w-full px-2 text-sm">
        Check account
      </button>
      <p className="mt-3 break-words text-xs leading-relaxed text-ink/75">{line}</p>
      <p className="mt-1 text-[11px] text-ink/50">
        {stored ? `Stored for this tab: ${stored.env}.` : 'Nothing stored.'} Not written to localStorage.
      </p>
    </section>
  )
}
