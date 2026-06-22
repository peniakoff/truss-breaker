import { describe, expect, it } from 'vitest'
import { GRID_SIZE } from '@/utils/constants'
import {
  findNearestGridPointOnSegment,
  gridPointsOnSegment,
  elementLength,
  directionCosines,
} from '@/domain/physics/geometry'

describe('gridPointsOnSegment', () => {
  it('returns endpoints and midpoint for horizontal segment', () => {
    const points = gridPointsOnSegment(0, 0, 4 * GRID_SIZE, 0)
    expect(points).toHaveLength(5)
    expect(points[0]).toEqual({ x: 0, y: 0, t: 0 })
    expect(points[2]).toEqual({ x: 2 * GRID_SIZE, y: 0, t: 0.5 })
    expect(points[4]).toEqual({ x: 4 * GRID_SIZE, y: 0, t: 1 })
  })

  it('returns grid points on diagonal segment', () => {
    const points = gridPointsOnSegment(0, 0, 2 * GRID_SIZE, 2 * GRID_SIZE)
    expect(points).toHaveLength(3)
    expect(points[1]).toEqual({ x: GRID_SIZE, y: GRID_SIZE, t: 0.5 })
  })
})

describe('findNearestGridPointOnSegment', () => {
  it('snaps to nearest grid point on horizontal beam', () => {
    const result = findNearestGridPointOnSegment(
      0, 0,
      4 * GRID_SIZE, 0,
      2.1 * GRID_SIZE, 0.3 * GRID_SIZE,
    )
    expect(result).toEqual({ x: 2 * GRID_SIZE, y: 0, t: 0.5 })
  })

  it('snaps to endpoint when cursor is near start', () => {
    const result = findNearestGridPointOnSegment(
      0, 0,
      4 * GRID_SIZE, 0,
      0.1 * GRID_SIZE, 0.1 * GRID_SIZE,
    )
    expect(result?.t).toBe(0)
  })
})

describe('elementLength', () => {
  it('computes length in meters from pixel coordinates', () => {
    expect(elementLength(0, 0, 3 * GRID_SIZE, 4 * GRID_SIZE)).toBeCloseTo(5)
  })
})

describe('directionCosines', () => {
  it('returns cos=1, sin=0 for horizontal element', () => {
    const { cos, sin } = directionCosines(0, 0, 4 * GRID_SIZE, 0)
    expect(cos).toBeCloseTo(1)
    expect(sin).toBeCloseTo(0)
  })

  it('returns sin=-1 for element going down on screen (engineering Y-down)', () => {
    const { cos, sin } = directionCosines(0, 0, 0, GRID_SIZE)
    expect(cos).toBeCloseTo(0)
    expect(sin).toBeCloseTo(-1)
  })
})
