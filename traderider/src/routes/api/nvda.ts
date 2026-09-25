import { createFileRoute } from '@tanstack/react-router'
import { loadNvdaCandles } from '../../lib/loadNvda'

export const Route = createFileRoute('/api/nvda')({
  server: {
    handlers: {
      GET: async () => {
        const payload = await loadNvdaCandles()
        return Response.json(payload)
      },
    },
  },
})
