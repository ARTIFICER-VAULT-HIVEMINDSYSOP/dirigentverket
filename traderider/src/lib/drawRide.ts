import type { Band } from './bollinger'
import { sideOf } from './market'
import { priceScale, railPrice, sampleBand, type DeskState } from './deskState'
import type { Side } from './types'

type Pt = { x: number; y: number }

function pxPerCandle(width: number): number {
  return Math.max(8, Math.min(16, width / 52))
}

function xFor(progress: number, index: number, width: number): number {
  return width * 0.3 + (index - progress) * pxPerCandle(width)
}

function visibleRange(state: DeskState, width: number): { i0: number; i1: number } {
  const px = pxPerCandle(width)
  const trainX = width * 0.3
  const i0 = Math.max(0, Math.floor(state.progress - trainX / px) - 1)
  const i1 = Math.min(state.candles.length - 1, Math.ceil(state.progress + (width - trainX) / px) + 1)
  return { i0, i1 }
}

function normalAt(pts: Pt[], i: number): Pt {
  const a = pts[Math.max(0, i - 1)]
  const b = pts[Math.min(pts.length - 1, i + 1)]
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  return { x: -dy / len, y: dx / len }
}

function trackPoints(
  state: DeskState,
  which: 'upper' | 'mid' | 'lower',
  width: number,
  yOf: (price: number) => number,
): Pt[] {
  const { i0, i1 } = visibleRange(state, width)
  const pts: Pt[] = []
  for (let i = i0; i <= i1; i++) {
    const band = state.bands[i]
    if (!band) continue
    const price = which === 'upper' ? band.upper : which === 'lower' ? band.lower : band.sma
    pts.push({ x: xFor(state.progress, i, width), y: yOf(price) })
  }
  return pts
}

function drawTrack(ctx: CanvasRenderingContext2D, pts: Pt[], color: string, active: boolean) {
  if (pts.length < 2) return
  const railOffset = active ? 5 : 3.5
  let dist = 0
  let nextTie = 10
  ctx.lineCap = 'butt'
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy) || 1
    const nx = -dy / len
    const ny = dx / len
    while (nextTie <= dist + len) {
      const t = (nextTie - dist) / len
      const x = a.x + dx * t
      const y = a.y + dy * t
      ctx.beginPath()
      ctx.moveTo(x + nx * 11, y + ny * 11)
      ctx.lineTo(x - nx * 11, y - ny * 11)
      ctx.strokeStyle = active ? 'rgba(28,25,21,0.72)' : 'rgba(28,25,21,0.28)'
      ctx.lineWidth = active ? 3 : 2
      ctx.stroke()
      nextTie += 14
    }
    dist += len
  }
  for (const sign of [-1, 1]) {
    ctx.beginPath()
    for (let i = 0; i < pts.length; i++) {
      const n = normalAt(pts, i)
      const x = pts[i].x + n.x * railOffset * sign
      const y = pts[i].y + n.y * railOffset * sign
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.strokeStyle = color
    ctx.lineWidth = active ? 2.6 : 1.35
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.stroke()
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawTrain(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, side: Side) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  const body = side === 'long' ? '#76b900' : side === 'short' ? '#9a3b2a' : '#1c1915'

  ctx.strokeStyle = '#1c1915'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.moveTo(-28, -6)
  ctx.lineTo(26, -6)
  ctx.stroke()

  for (const wx of [-26, -10, 8, 24]) {
    ctx.beginPath()
    ctx.arc(wx, -6, 5.5, 0, Math.PI * 2)
    ctx.fillStyle = '#1c1915'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(wx, -6, 2, 0, Math.PI * 2)
    ctx.fillStyle = '#f3ede2'
    ctx.fill()
  }

  ctx.fillStyle = body
  roundRect(ctx, -36, -24, 64, 16, 7)
  ctx.fill()
  ctx.strokeStyle = '#1c1915'
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.fillStyle = '#1c1915'
  roundRect(ctx, 6, -38, 24, 22, 2)
  ctx.fill()
  ctx.fillStyle = '#f3ede2'
  ctx.fillRect(11, -33, 13, 8)

  ctx.fillStyle = '#1c1915'
  ctx.fillRect(-24, -34, 8, 12)
  ctx.fillRect(-27, -36, 14, 3)

  ctx.fillStyle = side === 'short' ? '#f3ede2' : '#76b900'
  ctx.beginPath()
  ctx.arc(26, -16, 2.4, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#1c1915'
  ctx.beginPath()
  ctx.moveTo(28, -10)
  ctx.lineTo(44, -2)
  ctx.lineTo(28, -2)
  ctx.closePath()
  ctx.fill()

  ctx.globalAlpha = 0.35
  ctx.fillStyle = '#1c1915'
  ctx.beginPath()
  ctx.arc(-34, -42, 3.5, 0, Math.PI * 2)
  ctx.arc(-42, -50, 5.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function pointOnRail(state: DeskState, progress: number, side: Side, width: number, yOf: (price: number) => number): Pt {
  const band = sampleBand(state.bands, progress)
  return {
    x: xFor(state.progress, progress, width),
    y: band ? yOf(railPrice(band, side)) : state.viewport.height / 2,
  }
}

function drawCandles(
  ctx: CanvasRenderingContext2D,
  state: DeskState,
  width: number,
  yOf: (price: number) => number,
) {
  const { i0, i1 } = visibleRange(state, width)
  const px = pxPerCandle(width)
  for (let i = i0; i <= i1; i++) {
    const candle = state.candles[i]
    if (!candle) continue
    const x = xFor(state.progress, i, width)
    ctx.strokeStyle = 'rgba(28,25,21,0.28)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, yOf(candle.h))
    ctx.lineTo(x, yOf(candle.l))
    ctx.stroke()
    const yOpen = yOf(candle.o)
    const yClose = yOf(candle.c)
    const top = Math.min(yOpen, yClose)
    const h = Math.max(1.5, Math.abs(yClose - yOpen))
    ctx.fillStyle = candle.c >= candle.o ? 'rgba(118,185,0,0.4)' : 'rgba(154,59,42,0.4)'
    ctx.fillRect(x - px * 0.28, top, Math.max(2, px * 0.56), h)
  }
}

function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) {
  ctx.font = '12px "IBM Plex Sans", sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  const w = ctx.measureText(text).width
  ctx.fillStyle = 'rgba(243,237,226,0.9)'
  ctx.fillRect(x - w - 8, y - 8, w + 12, 16)
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
}

export function drawRide(canvas: HTMLCanvasElement | null, state: DeskState): void {
  if (!canvas) return
  const width = state.viewport.width
  const height = state.viewport.height
  if (width < 10 || height < 10) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1
  const bitmapW = Math.round(width * dpr)
  const bitmapH = Math.round(height * dpr)
  if (canvas.width !== bitmapW || canvas.height !== bitmapH) {
    canvas.width = bitmapW
    canvas.height = bitmapH
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#f3ede2'
  ctx.fillRect(0, 0, width, height)

  const focus: Band | null = sampleBand(state.bands, state.progress)
  if (!focus) {
    ctx.fillStyle = '#1c1915'
    ctx.font = '14px "IBM Plex Sans", sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('Waiting for a 20-period band.', 16, 32)
    return
  }

  const scale = priceScale(height, focus)
  const yOf = (price: number) => scale.y(price)
  const side = sideOf(state.book)

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, width, height)
  ctx.clip()
  drawCandles(ctx, state, width, yOf)

  const layers: Array<{ which: 'upper' | 'mid' | 'lower'; color: string; on: boolean }> = [
    { which: 'upper', color: '#76b900', on: side === 'long' },
    { which: 'mid', color: '#1c1915', on: side === 'flat' },
    { which: 'lower', color: '#9a3b2a', on: side === 'short' },
  ]
  for (const layer of layers.filter((layer) => !layer.on)) {
    drawTrack(ctx, trackPoints(state, layer.which, width, yOf), layer.color, false)
  }
  for (const layer of layers.filter((layer) => layer.on)) {
    drawTrack(ctx, trackPoints(state, layer.which, width, yOf), layer.color, true)
  }

  const here = pointOnRail(state, state.progress, side, width, yOf)
  const ahead = pointOnRail(state, state.progress + 0.35, side, width, yOf)
  const behind = pointOnRail(state, Math.max(0, state.progress - 0.35), side, width, yOf)
  const angle = Math.max(-0.55, Math.min(0.55, Math.atan2(ahead.y - behind.y, ahead.x - behind.x)))
  drawTrain(ctx, here.x, here.y, angle, side)
  ctx.restore()

  ctx.fillStyle = '#1c1915'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.font = '600 15px Fraunces, Georgia, serif'
  ctx.fillText('NVDA', 12, 10)
  ctx.font = '11px "IBM Plex Sans", sans-serif'
  ctx.fillStyle = 'rgba(28,25,21,0.72)'
  const railName = side === 'long' ? 'LONG · upper rail' : side === 'short' ? 'SHORT · lower rail' : 'FLAT · mid rail'
  ctx.fillText(`Bollinger 20 · 2σ · ${railName}`, 12, 30)
  if (state.paused) {
    ctx.fillStyle = '#9a3b2a'
    ctx.fillText('PAUSED', 12, 46)
  }

  drawLabel(ctx, focus.upper.toFixed(2), width - 8, yOf(focus.upper), '#76b900')
  drawLabel(ctx, focus.sma.toFixed(2), width - 8, yOf(focus.sma), '#1c1915')
  drawLabel(ctx, focus.lower.toFixed(2), width - 8, yOf(focus.lower), '#9a3b2a')
}
