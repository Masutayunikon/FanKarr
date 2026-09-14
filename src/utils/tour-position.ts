import type { TourPlacement } from '@/tour/steps'

export interface Rect { top: number; left: number; width: number; height: number }
export interface Size { width: number; height: number }
export interface BubblePosition { top: number; left: number; placement: TourPlacement | 'inside' | 'center' }

const OPPOSITE: Record<TourPlacement, TourPlacement> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max))

export function clampRect(rect: Rect, viewport: Size): Rect | null {
  const top    = Math.max(rect.top, 0)
  const left   = Math.max(rect.left, 0)
  const bottom = Math.min(rect.top + rect.height, viewport.height)
  const right  = Math.min(rect.left + rect.width, viewport.width)
  if (bottom <= top || right <= left) return null
  return { top, left, width: right - left, height: bottom - top }
}

export function computeBubblePosition(
  target   : Rect | null,
  bubble   : Size,
  viewport : Size,
  placement: TourPlacement = 'bottom',
  gap      = 12,
  margin   = 12,
): BubblePosition {
  const centered: BubblePosition = {
    top : Math.max(margin, (viewport.height - bubble.height) / 2),
    left: Math.max(margin, (viewport.width - bubble.width) / 2),
    placement: 'center',
  }
  const t = target && clampRect(target, viewport)
  if (!t) return centered

  const maxLeft = viewport.width - bubble.width - margin
  const maxTop  = viewport.height - bubble.height - margin
  const hCenter = clamp(t.left + t.width / 2 - bubble.width / 2, margin, maxLeft)
  const vCenter = clamp(t.top + t.height / 2 - bubble.height / 2, margin, maxTop)

  const candidates: Record<TourPlacement, () => BubblePosition | null> = {
    bottom: () => {
      const top = t.top + t.height + gap
      return top <= maxTop ? { top, left: hCenter, placement: 'bottom' } : null
    },
    top: () => {
      const top = t.top - gap - bubble.height
      return top >= margin ? { top, left: hCenter, placement: 'top' } : null
    },
    right: () => {
      const left = t.left + t.width + gap
      return left <= maxLeft ? { top: vCenter, left, placement: 'right' } : null
    },
    left: () => {
      const left = t.left - gap - bubble.width
      return left >= margin ? { top: vCenter, left, placement: 'left' } : null
    },
  }

  const order = [placement, OPPOSITE[placement], ...(['bottom', 'top', 'right', 'left'] as const)]
  for (const p of order) {
    const pos = candidates[p]()
    if (pos) return pos
  }

  // Cible trop grande : bulle posée dans sa partie visible, en bas
  return {
    top : clamp(t.top + t.height - bubble.height - margin, margin, maxTop),
    left: hCenter,
    placement: 'inside',
  }
}
