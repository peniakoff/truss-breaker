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
 * Calculate direction cosines for an element
 */
export function directionCosines(
  x1: number, y1: number,
  x2: number, y2: number,
): { cos: number; sin: number } {
  const dx = (x2 - x1) / GRID_SIZE
  const dy = (y2 - y1) / GRID_SIZE
  const L = Math.sqrt(dx * dx + dy * dy)
  if (L === 0) throw new Error('Element has zero length')
  return { cos: dx / L, sin: dy / L }
}
