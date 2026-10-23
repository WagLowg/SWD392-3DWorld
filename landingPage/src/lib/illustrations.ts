import * as THREE from 'three'
import type { FigureKind } from '../config/content'

/**
 * Flat 2D "input photos" for the AI Studio demo, drawn procedurally so the
 * page ships without image files. Each matches its 3D model.
 */
const W = 512
const H = 640

const cache = new Map<string, { canvas: HTMLCanvasElement; texture: THREE.CanvasTexture; url: string }>()

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
}
function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string, rot = 0) {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
}
function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fillStyle = fill
  ctx.fill()
}
function eye(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  circle(ctx, x, y, r, '#23222B')
  circle(ctx, x + r * 0.35, y - r * 0.35, r * 0.32, '#fff')
}
function smile(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color = '#23222B') {
  ctx.beginPath()
  ctx.arc(x, y, r, 0.15 * Math.PI, 0.85 * Math.PI)
  ctx.strokeStyle = color
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  ctx.stroke()
}

function background(ctx: CanvasRenderingContext2D, a: string, b: string) {
  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, a)
  g.addColorStop(1, b)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.roundRect(0, 0, W, H, 48)
  ctx.fill()
  // soft halftone dots
  ctx.globalAlpha = 0.18
  for (let y = 30; y < H; y += 34)
    for (let x = 30 + ((y / 34) % 2) * 17; x < W; x += 34) circle(ctx, x, y, 3, '#ffffff')
  ctx.globalAlpha = 1
  // ground shadow
  ellipse(ctx, W / 2, 545, 150, 26, 'rgba(32,32,39,0.12)')
}

function drawBear(ctx: CanvasRenderingContext2D) {
  background(ctx, '#E7E0FF', '#C9D9FF')
  const fur = '#C98B5B'
  // body
  ellipse(ctx, 256, 440, 120, 115, '#F5F3FF')
  rrect(ctx, 206, 410, 100, 64, 16, '#B9A7FF')
  ;['#FF8F7A', '#FFD166', '#7FE3C0'].forEach((c, i) => circle(ctx, 230 + i * 26, 442, 8, c))
  // feet + arms
  ellipse(ctx, 196, 548, 48, 26, '#8C7BFF')
  ellipse(ctx, 316, 548, 48, 26, '#8C7BFF')
  ellipse(ctx, 140, 430, 34, 60, '#F5F3FF', 0.7)
  ellipse(ctx, 372, 430, 34, 60, '#F5F3FF', -0.7)
  circle(ctx, 116, 470, 26, fur)
  circle(ctx, 396, 470, 26, fur)
  // collar
  ellipse(ctx, 256, 340, 105, 24, '#8C7BFF')
  // head
  circle(ctx, 176, 172, 38, fur)
  circle(ctx, 336, 172, 38, fur)
  circle(ctx, 176, 172, 20, '#F7B7A3')
  circle(ctx, 336, 172, 20, '#F7B7A3')
  circle(ctx, 256, 250, 110, fur)
  ellipse(ctx, 256, 285, 56, 42, '#F3DCC3')
  ellipse(ctx, 256, 268, 16, 12, '#23222B')
  eye(ctx, 212, 238, 14)
  eye(ctx, 300, 238, 14)
  ellipse(ctx, 186, 280, 18, 10, '#FF9DB4')
  ellipse(ctx, 326, 280, 18, 10, '#FF9DB4')
  smile(ctx, 256, 286, 16)
  // helmet glass
  ctx.beginPath()
  ctx.arc(256, 245, 158, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.lineWidth = 8
  ctx.stroke()
  ctx.fillStyle = 'rgba(220,235,255,0.25)'
  ctx.fill()
  ellipse(ctx, 330, 150, 34, 12, 'rgba(255,255,255,0.8)', -0.6)
}

function drawRobot(ctx: CanvasRenderingContext2D) {
  background(ctx, '#DFF8EE', '#C7EEFF')
  rrect(ctx, 170, 500, 172, 50, 24, '#FFD166')
  rrect(ctx, 150, 330, 212, 180, 48, '#7FE3C0')
  rrect(ctx, 200, 380, 112, 66, 16, '#FFFFFF')
  ;['#FF8F7A', '#FFD166', '#7955FF'].forEach((c, i) => circle(ctx, 228 + i * 28, 413, 9, c))
  rrect(ctx, 104, 340, 44, 120, 22, '#98DFFF')
  rrect(ctx, 364, 340, 44, 120, 22, '#98DFFF')
  ellipse(ctx, 256, 320, 64, 18, '#FF8F7A')
  circle(ctx, 154, 222, 24, '#FF8F7A')
  circle(ctx, 358, 222, 24, '#FF8F7A')
  circle(ctx, 256, 222, 104, '#FBFAFF')
  rrect(ctx, 176, 176, 160, 96, 46, '#23222B')
  ellipse(ctx, 222, 216, 13, 18, '#7FFFD4')
  ellipse(ctx, 290, 216, 13, 18, '#7FFFD4')
  smile(ctx, 256, 236, 16, '#7FFFD4')
  ctx.fillStyle = '#9AA0B5'
  ctx.fillRect(252, 90, 8, 30)
  circle(ctx, 256, 84, 16, '#FF9A52')
}

function drawCreature(ctx: CanvasRenderingContext2D) {
  background(ctx, '#E3F3FF', '#EADFFF')
  ellipse(ctx, 140, 300, 50, 90, 'rgba(217,204,255,0.9)', -0.6)
  ellipse(ctx, 372, 300, 50, 90, 'rgba(217,204,255,0.9)', 0.6)
  ctx.beginPath()
  ctx.moveTo(176, 170)
  ctx.lineTo(196, 100)
  ctx.lineTo(222, 160)
  ctx.closePath()
  ctx.fillStyle = '#FFE58F'
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(336, 170)
  ctx.lineTo(316, 100)
  ctx.lineTo(290, 160)
  ctx.closePath()
  ctx.fill()
  ellipse(ctx, 196, 540, 40, 22, '#9CD7FF')
  ellipse(ctx, 316, 540, 40, 22, '#9CD7FF')
  circle(ctx, 256, 360, 180, '#BDE7FF')
  ellipse(ctx, 256, 430, 110, 100, '#FFFFFF')
  eye(ctx, 200, 320, 22)
  eye(ctx, 312, 320, 22)
  ellipse(ctx, 160, 360, 22, 12, '#FF9DB4')
  ellipse(ctx, 352, 360, 22, 12, '#FF9DB4')
  smile(ctx, 256, 352, 18)
}

const DRAW: Partial<Record<FigureKind, (c: CanvasRenderingContext2D) => void>> = {
  bear: drawBear,
  robot: drawRobot,
  creature: drawCreature,
}

export function getIllustration(kind: FigureKind) {
  const hit = cache.get(kind)
  if (hit) return hit
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ;(DRAW[kind] ?? drawBear)(ctx)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  const url = canvas.toDataURL('image/png')
  const entry = { canvas, texture, url }
  cache.set(kind, entry)
  return entry
}
