import type { Band } from './bollinger'
import { markFromCandles, priceScale, railPrice, sampleBand, trainDrawScale, type DeskState } from './deskState'
import { formatPct, px } from './format'
import { sideOf } from './market'
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

function strokeCenter(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  ctx.beginPath()
  for (let i = 0; i < pts.length; i++) {
    if (i === 0) ctx.moveTo(pts[i].x, pts[i].y)
    else ctx.lineTo(pts[i].x, pts[i].y)
  }
}

function drawTrack(ctx: CanvasRenderingContext2D, pts: Pt[], color: string, active: boolean) {
  if (pts.length < 2) return
  const railOffset = active ? 4.5 : 3.2
  strokeCenter(ctx, pts)
  ctx.strokeStyle = '#101412'
  ctx.lineWidth = active ? 14 : 10
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.stroke()

  let dist = 0
  let nextTie = 12
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
      ctx.moveTo(x + nx * 9, y + ny * 9)
      ctx.lineTo(x - nx * 9, y - ny * 9)
      ctx.strokeStyle = active ? 'rgba(166,132,70,0.85)' : 'rgba(185,180,170,0.35)'
      ctx.lineWidth = active ? 2.4 : 1.4
      ctx.stroke()
      nextTie += 16
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
    ctx.lineWidth = active ? 2.4 : 1.5
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
const GROUND = '#101412'
const LIGHT = '#e9e3d6'
const BRICK = '#9a3b2a'
const GLASS = '#1a2420'

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

/** Local y=0 is the rail. Wheel bottoms sit on that line. Caller rotates to the rail tangent. */
function drawTrain(ctx: CanvasRenderingContext2D, side: Side) {
  const accent = side === 'short' ? BRICK : side === 'long' ? NVDA : BRASS
  const wheelR = 6

  ctx.strokeStyle = BRASS
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(-32, -wheelR)
  ctx.lineTo(32, -wheelR)
  ctx.stroke()

  for (const wx of [-26, -10, 8, 24]) {
    ctx.beginPath()
    ctx.arc(wx, -wheelR, wheelR, 0, Math.PI * 2)
    ctx.fillStyle = steelFill(ctx, wx - 6, -12, 12, 12)
    ctx.fill()
    ctx.strokeStyle = BRASS
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(wx, -wheelR, 2.1, 0, Math.PI * 2)
    ctx.fillStyle = GROUND
    ctx.fill()
    ctx.beginPath()
    ctx.arc(wx, -wheelR, 0.85, 0, Math.PI * 2)
    ctx.fillStyle = BRASS_HI
    ctx.fill()
  }

  const body = ctx.createLinearGradient(0, -28, 0, -8)
  body.addColorStop(0, '#3d6b54')
  body.addColorStop(0.55, ARMOR)
  body.addColorStop(1, '#243f32')
  ctx.fillStyle = body
  roundRect(ctx, -40, -28, 72, 20, 6)
  ctx.fill()
  ctx.strokeStyle = BRASS
  ctx.lineWidth = 1.25
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(-32, -26.4)
  ctx.lineTo(26, -26.4)
  ctx.strokeStyle = BRASS_HI
  ctx.lineWidth = 0.9
  ctx.stroke()

  armorPlate(ctx, -36, -25, 14, 13)
  armorPlate(ctx, -20, -25, 14, 13)
  ctx.fillStyle = accent
  ctx.fillRect(-36, -13, 50, 1.8)

  armorPlate(ctx, 6, -46, 28, 26)
  ctx.fillStyle = GLASS
  ctx.fillRect(11, -41, 16, 8)
  ctx.strokeStyle = BRASS
  ctx.lineWidth = 0.8
  ctx.strokeRect(11, -41, 16, 8)
  ctx.beginPath()
  ctx.moveTo(19, -41)
  ctx.lineTo(19, -33)
  ctx.stroke()

  drawChevronPlate(ctx, 11, -31, 18, 13)

  armorPlate(ctx, -30, -42, 12, 14)
  ctx.fillStyle = BRASS
  ctx.fillRect(-32, -43.2, 16, 2.2)

  ctx.beginPath()
  ctx.arc(32, -24, 2.6, 0, Math.PI * 2)
  ctx.fillStyle = accent
  ctx.fill()
  ctx.strokeStyle = BRASS
  ctx.lineWidth = 0.8
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(32, -16)
  ctx.lineTo(48, -2)
  ctx.lineTo(32, -4)
  ctx.closePath()
  ctx.fillStyle = steelFill(ctx, 32, -16, 16, 14)
  ctx.fill()
  ctx.strokeStyle = BRASS
  ctx.lineWidth = 1.1
  ctx.stroke()

  ctx.globalAlpha = 0.35
  ctx.fillStyle = LIGHT
  ctx.beginPath()
  ctx.arc(-36, -50, 3.2, 0, Math.PI * 2)
  ctx.arc(-44, -58, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
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
    ctx.strokeStyle = 'rgba(233,227,214,0.22)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, yOf(candle.h))
    ctx.lineTo(x, yOf(candle.l))
    ctx.stroke()
    const yOpen = yOf(candle.o)
    const yClose = yOf(candle.c)
    const top = Math.min(yOpen, yClose)
    const h = Math.max(1.2, Math.abs(yClose - yOpen))
    ctx.fillStyle = candle.c >= candle.o ? 'rgba(118,185,0,0.22)' : 'rgba(154,59,42,0.22)'
    ctx.fillRect(x - px * 0.16, top, Math.max(1.5, px * 0.32), h)
  }
}

function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) {
  ctx.font = '11px "IBM Plex Sans", sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  const w = ctx.measureText(text).width
  const boxW = w + 12
  const boxH = 16
  ctx.fillStyle = GROUND
  ctx.strokeStyle = BRASS
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.rect(x - boxW, y - boxH / 2, boxW, boxH)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = color
  ctx.fillText(text, x - 6, y)
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
  ctx.fillStyle = '#161b18'
  ctx.fillRect(0, 0, width, height)

  const focus: Band | null = sampleBand(state.bands, state.progress)
  if (!focus) {
    ctx.fillStyle = LIGHT
    ctx.font = '14px "IBM Plex Sans", sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('Waiting for a 20-period band.', 16, 32)
    return
  }

  const scale = priceScale(height, focus, width)
  const yOf = (price: number) => scale.y(price)
  const side = sideOf(state.book)
  const marked = markFromCandles(state.candles, state.progress)

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, width, height)
  ctx.clip()
  drawCandles(ctx, state, width, yOf)

  const layers: Array<{ which: 'upper' | 'mid' | 'lower'; color: string; on: boolean }> = [
    { which: 'upper', color: NVDA, on: side === 'long' },
    { which: 'mid', color: side === 'flat' ? BRASS_HI : '#c8c2b6', on: side === 'flat' },
    { which: 'lower', color: BRICK, on: side === 'short' },
  ]
  for (const layer of layers.filter((layer) => !layer.on)) {
    drawTrack(ctx, trackPoints(state, layer.which, width, yOf), layer.color, false)
  }
  for (const layer of layers.filter((layer) => layer.on)) {
    drawTrack(ctx, trackPoints(state, layer.which, width, yOf), layer.color, true)
  }

  const here = pointOnRail(state, state.progress, side, width, yOf)
  const ahead = pointOnRail(state, state.progress + 0.45, side, width, yOf)
  const behind = pointOnRail(state, Math.max(0, state.progress - 0.45), side, width, yOf)
  const angle = Math.atan2(ahead.y - behind.y, ahead.x - behind.x)
  ctx.save()
  ctx.translate(here.x, here.y)
  ctx.rotate(angle)
  ctx.scale(trainDrawScale(width), trainDrawScale(width))
  drawTrain(ctx, side)
  ctx.restore()
  ctx.restore()

  ctx.fillStyle = LIGHT
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.font = '600 15px Fraunces, Georgia, serif'
  ctx.fillText('NVDA', 12, 10)
  ctx.font = '600 22px Fraunces, Georgia, serif'
  ctx.fillText(px(marked.close), 12, 30)
  ctx.font = '12px "IBM Plex Sans", sans-serif'
  ctx.fillStyle = marked.pct == null ? LIGHT : marked.pct > 0 ? NVDA : marked.pct < 0 ? BRICK : LIGHT
  ctx.fillText(`${formatPct(marked.pct)} vs previous close`, 12, 56)
  ctx.fillStyle = 'rgba(233,227,214,0.72)'
  ctx.font = '11px "IBM Plex Sans", sans-serif'
  const railName = side === 'long' ? 'LONG · upper rail' : side === 'short' ? 'SHORT · lower rail' : 'FLAT · mid rail'
  ctx.fillText(railName, 12, 74)
  if (state.paused) {
    ctx.fillStyle = BRICK
    ctx.fillText('PAUSED', 12, 90)
  }

  drawLabel(ctx, `Upper ${focus.upper.toFixed(2)}`, width - 8, yOf(focus.upper), NVDA)
  drawLabel(ctx, `20-SMA ${focus.sma.toFixed(2)}`, width - 8, yOf(focus.sma), LIGHT)
  drawLabel(ctx, `Lower ${focus.lower.toFixed(2)}`, width - 8, yOf(focus.lower), BRICK)
}
