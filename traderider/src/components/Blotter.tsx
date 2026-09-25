import { candleAt, type DeskState } from '../lib/deskState'
import { formatTime, money, px } from '../lib/format'
import {
  buyingPower,
  deriveQuote,
  maintenanceRequirement,
  markEquity,
  sideOf,
  unrealizedPnl,
} from '../lib/market'

function Cell({ label, value, tone }: { label: string; value: string; tone?: 'brick' | 'nvda' }) {
  const color = tone === 'brick' ? 'text-brick' : tone === 'nvda' ? 'text-nvda' : 'text-ink'
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-[0.14em] text-ink/55">{label}</div>
      <div className={`truncate text-sm font-medium tabular-nums ${color}`}>{value}</div>
    </div>
  )
}

export function Blotter({ state, onReset }: { state: DeskState; onReset: () => void }) {
  const candle = candleAt(state)
  const quote = candle ? deriveQuote(candle.c) : null
  const mark = quote?.last ?? null
  const equity = mark === null ? null : markEquity(state.book, mark)
  const requirement = mark === null ? null : maintenanceRequirement(state.book, mark)
  const unrealized = mark === null ? null : unrealizedPnl(state.book, mark)
  const power = equity === null ? null : buyingPower(equity, state.leverage)
  const side = sideOf(state.book)
  const maintenance =
    state.book.liquidated ? 'Liquidated' : side === 'flat' ? 'Flat' : equity !== null && requirement !== null && equity < requirement ? 'Breach' : 'Met'
  const maintenanceTone = maintenance === 'Met' || maintenance === 'Flat' ? undefined : 'brick'
  const sideTone = side === 'long' ? 'nvda' : side === 'short' ? 'brick' : undefined
  const fills = state.book.fills.slice(-8).reverse()

  return (
    <section className="armor-panel min-w-0 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-2xl leading-none">Book</h2>
          <p className="mt-1 text-xs text-ink/60">Paper account. Whole shares. Fills at the touch plus slippage.</p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="desk-key shrink-0 px-3 py-2 text-xs font-medium uppercase tracking-wide"
        >
          Reset book
        </button>
      </div>

      <p className="mt-3 font-display text-3xl leading-none">
        <span className={side === 'long' ? 'text-nvda' : side === 'short' ? 'text-brick' : 'text-ink'}>
          {side === 'long' ? 'LONG' : side === 'short' ? 'SHORT' : 'FLAT'}
        </span>
        <span className="ml-3 text-ink">{state.leverage}×</span>
      </p>

      <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3">
        <Cell label="Shares" value={side === 'flat' ? '0' : String(Math.abs(state.book.shares))} tone={sideTone} />
        <Cell label="Avg fill" value={px(state.book.avgFill)} />
        <Cell label="Last" value={px(mark)} />
        <Cell label="Bid" value={px(quote?.bid)} />
        <Cell label="Offer" value={px(quote?.offer)} />
        <Cell label="Slip" value={px(quote?.slippage)} />
        <Cell label="Equity" value={money(equity)} />
        <Cell label="Cash" value={money(state.book.cash)} />
        <Cell label="Buying power" value={money(power)} />
        <Cell label="Leverage" value={`${state.leverage}× of 4×`} />
        <Cell label="Maintenance" value={maintenance} tone={maintenanceTone} />
        <Cell label="Requirement" value={side === 'flat' ? '—' : money(requirement)} />
        <Cell label="Unrealized" value={unrealized === null ? '—' : money(unrealized)} />
        <Cell label="Realized" value={money(state.book.realized)} />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ink/70">
        Buy fills at offer + slip. Sell fills at bid − slip. Mark is the candle close. Maintenance is 25% on longs and 30% on shorts. A breach liquidates the local book.
      </p>

      <h3 className="mt-4 border-t border-brass pt-3 font-display text-lg">Fills</h3>
      {fills.length === 0 ? (
        <p className="mt-2 text-sm text-ink/60">No fills.</p>
      ) : (
        <ul className="mt-2 divide-y divide-ink/10">
          {fills.map((fill) => (
            <li key={fill.id} className="py-2 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 font-medium">
                  {fill.action.toUpperCase()} {fill.qty || '—'}
                  <span className="ml-2 text-xs font-normal uppercase tracking-wide text-ink/55">
                    {fill.note}
                    {fill.reason ? ` · ${fill.reason}` : ''}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums">{px(fill.fill)}</span>
              </div>
              <div className="mt-0.5 text-xs text-ink/65">
                {formatTime(fill.candleTime)} · bid {px(fill.bid)} · offer {px(fill.offer)} · slip {px(fill.slippage)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
