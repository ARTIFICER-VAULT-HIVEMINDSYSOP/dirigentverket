import { defineNitroPlugin } from 'nitro/runtime'
import { installNodeRequestPatch } from './install-node-request-patch'

export default defineNitroPlugin(() => {
  installNodeRequestPatch()
})
