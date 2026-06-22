import { GRID_SIZE } from '@/utils/constants'

/**
 * Calculate element length in meters from node pixel coordinates
 */
export function elementLength(
  x1: number, y1: number,
  x2: number, y2: number,
): number {
  const dx = (x2 - x1) / GRID_SIZE
  const dy = (y2 - y1) / GRID_SIZE
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Calculate direction cosines for an element.
 * NOTE: The Y-axis difference is inverted (-dy) to convert SVG coordinates (Y-down)
 * into standard engineering Cartesian coordinates (Y-up).
 */
export function directionCosines(
  x1: number, y1: number,
  x2: number, y2: number,
): { cos: number; sin: number } {
  const dx = (x2 - x1) / GRID_SIZE
  const dy = -(y2 - y1) / GRID_SIZE
  const L = Math.sqrt(dx * dx + dy * dy)
  if (L === 0) throw new Error('Element has zero length')
  return { cos: dx / L, sin: dy / L }
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) {
    const temp = y
    y = x % y
    x = temp
  }
  return x
}

export interface GridPointOnSegment {
  x: number
  y: number
  t: number
}

/**
 * Enumerate grid intersection points lying on a segment between two grid-aligned endpoints.
 */
export function gridPointsOnSegment(
  x1: number, y1: number,
  x2: number, y2: number,
): GridPointOnSegment[] {
  const gx1 = Math.round(x1 / GRID_SIZE)
  const gy1 = Math.round(y1 / GRID_SIZE)
  const gx2 = Math.round(x2 / GRID_SIZE)
  const gy2 = Math.round(y2 / GRID_SIZE)

  const dgx = gx2 - gx1
  const dgy = gy2 - gy1
  const steps = gcd(dgx, dgy)
  if (steps === 0) {
    return [{ x: x1, y: y1, t: 0 }]
  }

  const points: GridPointOnSegment[] = []
  for (let i = 0; i <= steps; i++) {
    const x = (gx1 + (dgx * i) / steps) * GRID_SIZE
    const y = (gy1 + (dgy * i) / steps) * GRID_SIZE
    points.push({ x, y, t: i / steps })
  }
  return points
}

/**
 * Find the nearest grid point on a segment to a given cursor position.
 */
export function findNearestGridPointOnSegment(
  x1: number, y1: number,
  x2: number, y2: number,
  px: number, py: number,
): GridPointOnSegment | null {
  const points = gridPointsOnSegment(x1, y1, x2, y2)
  if (points.length === 0) return null

  let best = points[0]
  let bestDistSq = (px - best.x) ** 2 + (py - best.y) ** 2

  for (let i = 1; i < points.length; i++) {
    const point = points[i]
    const distSq = (px - point.x) ** 2 + (py - point.y) ** 2
    if (distSq < bestDistSq) {
      bestDistSq = distSq
      best = point
    }
  }

  return best
}

/**
 * Interpolate a position along an element from parameter t (0 = start, 1 = end).
 */
export function interpolateOnSegment(
  x1: number, y1: number,
  x2: number, y2: number,
  t: number,
): { x: number; y: number } {
  return {
    x: x1 + t * (x2 - x1),
    y: y1 + t * (y2 - y1),
  }
}
