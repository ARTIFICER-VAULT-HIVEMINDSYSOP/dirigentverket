import { IncomingMessage } from 'node:http'

type Once = (this: IncomingMessage, event: string, listener: (...args: never[]) => void) => IncomingMessage

/**
 * srvx aborts the web Request on IncomingMessage "close".
 * On Node that event also means the request body finished, so POST handlers die
 * before they can answer. Client disconnects emit "aborted" instead.
 */
export function installNodeRequestPatch(): void {
  const proto = IncomingMessage.prototype as { once: Once }
  const originalOnce = proto.once
  if ((originalOnce as { __traderider?: boolean }).__traderider) return

  const patched: Once = function (this: IncomingMessage, event, listener) {
    let source = ''
    try {
      source = Function.prototype.toString.call(listener)
    } catch {
      source = ''
    }
    if (event === 'close' && source.includes('abort')) {
      return originalOnce.call(this, 'aborted', listener)
    }
    return originalOnce.call(this, event, listener)
  }
  ;(patched as { __traderider?: boolean }).__traderider = true
  proto.once = patched
}
