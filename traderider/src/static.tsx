import { createRoot } from 'react-dom/client'
import { Desk } from './components/Desk'
import { loadNvdaForStatic } from './lib/loadNvda'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('missing root')

const mount = createRoot(root)
mount.render(<p className="p-6 font-display text-3xl">Loading NVDA candles…</p>)

void loadNvdaForStatic().then((data) => {
  mount.render(
    <Desk candles={data.candles} source={data.source} label={data.label} brokerEnabled={false} />,
  )
})
