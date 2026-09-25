import { createFileRoute } from '@tanstack/react-router'
import { handleBrokerRequest } from '../../lib/brokerProxy'

export const Route = createFileRoute('/api/broker')({
  server: {
    handlers: {
      POST: async ({ request }) => handleBrokerRequest(request),
    },
  },
})
