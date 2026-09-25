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

const ARMOR = '#2f5a45'
const NVDA = '#76b900'
const BRASS = '#a68446'
const BRASS_HI = '#e6d3a4'
const INK = '#1c1915'
const PAPER = '#f3ede2'
const BRICK = '#9a3b2a'

function steelFill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const g = ctx.createLinearGradient(x, y, x + w * 0.2, y + h)
  g.addColorStop(0, '#f2eee6')
  g.addColorStop(0.32, '#c9c4ba')
  g.addColorStop(0.5, '#8d8880')
  g.addColorStop(0.7, '#ddd8ce')
  g.addColorStop(1, '#a39e94')
  return g
}

function armorPlate(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  roundRect(ctx, x, y, w, h, 2)
  ctx.fillStyle = steelFill(ctx, x, y, w, h)
  ctx.fill()
  ctx.strokeStyle = BRASS
  ctx.lineWidth = 1.15
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x + 2, y + 1.6)
  ctx.lineTo(x + w - 2, y + 1.6)
  ctx.strokeStyle = BRASS_HI
  ctx.lineWidth = 0.8
  ctx.stroke()
}

function drawChevronPlate(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  armorPlate(ctx, x, y, w, h)
  ctx.strokeStyle = BRASS_HI
  ctx.lineWidth = 0.7
  ctx.strokeRect(x + 2.2, y + 2.2, w - 4.4, h - 4.4)
  ctx.beginPath()
  ctx.moveTo(x + 4, y + 4)
  ctx.lineTo(x + w / 2, y + h - 3.2)
  ctx.lineTo(x + w - 4, y + 4)
  ctx.strokeStyle = NVDA
  ctx.lineWidth = 2.1
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.stroke()
}

function drawTrain(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, side: Side) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  const accent = side === 'short' ? BRICK : side === 'long' ? NVDA : BRASS

  ctx.strokeStyle = BRASS
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(-30, -6)
  ctx.lineTo(30, -6)
  ctx.stroke()

  for (const wx of [-26, -10, 8, 24]) {
    ctx.beginPath()
    ctx.arc(wx, -6, 5.6, 0, Math.PI * 2)
    ctx.fillStyle = steelFill(ctx, wx - 6, -12, 12, 12)
    ctx.fill()
    ctx.strokeStyle = BRASS
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(wx, -6, 2.1, 0, Math.PI * 2)
    ctx.fillStyle = INK
    ctx.fill()
    ctx.beginPath()
    ctx.arc(wx, -6, 0.85, 0, Math.PI * 2)
    ctx.fillStyle = BRASS_HI
    ctx.fill()
  }

  const body = ctx.createLinearGradient(0, -27, 0, -8)
  body.addColorStop(0, '#3d6b54')
  body.addColorStop(0.55, ARMOR)
  body.addColorStop(1, '#243f32')
  ctx.fillStyle = body
  roundRect(ctx, -40, -27, 70, 19, 6)
  ctx.fill()
  ctx.strokeStyle = BRASS
  ctx.lineWidth = 1.25
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(-32, -25.4)
  ctx.lineTo(24, -25.4)
  ctx.strokeStyle = BRASS_HI
  ctx.lineWidth = 0.9
  ctx.stroke()

  armorPlate(ctx, -36, -24, 14, 13)
  armorPlate(ctx, -20, -24, 14, 13)
  ctx.fillStyle = accent
  ctx.fillRect(-36, -12.4, 48, 1.7)

  armorPlate(ctx, 4, -42, 28, 24)
  ctx.fillStyle = PAPER
  ctx.fillRect(9, -37, 16, 8)
  ctx.strokeStyle = BRASS
  ctx.lineWidth = 0.8
  ctx.strokeRect(9, -37, 16, 8)
  ctx.beginPath()
  ctx.moveTo(17, -37)
  ctx.lineTo(17, -29)
  ctx.stroke()

  drawChevronPlate(ctx, 9, -28, 18, 13)

  armorPlate(ctx, -30, -38, 12, 12)
  ctx.fillStyle = BRASS
  ctx.fillRect(-32, -39.2, 16, 2)

  ctx.beginPath()
  ctx.arc(30, -20, 2.5, 0, Math.PI * 2)
  ctx.fillStyle = accent
  ctx.fill()
  ctx.strokeStyle = BRASS
  ctx.lineWidth = 0.8
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(30, -14)
  ctx.lineTo(46, -3)
  ctx.lineTo(30, -4)
  ctx.closePath()
  ctx.fillStyle = steelFill(ctx, 30, -14, 16, 12)
  ctx.fill()
  ctx.strokeStyle = BRASS
  ctx.lineWidth = 1.1
  ctx.stroke()

  ctx.globalAlpha = 0.28
  ctx.fillStyle = INK
  ctx.beginPath()
  ctx.arc(-36, -44, 3.2, 0, Math.PI * 2)
  ctx.arc(-44, -52, 5, 0, Math.PI * 2)
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
