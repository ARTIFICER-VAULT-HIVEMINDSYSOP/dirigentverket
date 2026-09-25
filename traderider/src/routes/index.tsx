import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { Desk } from '../components/Desk'
import { loadNvdaCandles } from '../lib/loadNvda'

const loadNvda = createServerFn({ method: 'GET' }).handler(async () => {
  return loadNvdaCandles()
})

export const Route = createFileRoute('/')({
  loader: () => loadNvda(),
  component: Home,
  pendingComponent: Pending,
  errorComponent: CandleError,
})

function Pending() {
  return <p className="p-6 font-display text-3xl">Loading NVDA candles…</p>
}

function CandleError() {
  return <p className="p-6 text-sm">Candles unavailable.</p>
}

function Home() {
  const data = Route.useLoaderData()
  return <Desk candles={data.candles} source={data.source} label={data.label} />
}
