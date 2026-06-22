import { describe, expect, it } from 'vitest'
import { distributeLoadsToNodes } from '@/domain/physics/loadDistribution'
import type { Load, TrussElement } from '@/domain/models'

const elements: TrussElement[] = [
  {
    id: 'e1',
    startNodeId: 'n1',
    endNodeId: 'n2',
    materialId: 'default-steel',
    crossSection: { area: 0.001 },
  },
]

describe('distributeLoadsToNodes', () => {
  it('passes nodal loads through unchanged', () => {
    const loads: Load[] = [
      { id: 'l1', nodeId: 'n1', forceX: 5, forceY: -10 },
    ]
    const result = distributeLoadsToNodes(loads, elements)
    expect(result).toEqual([{ nodeId: 'n1', forceX: 5, forceY: -10 }])
  })

  it('splits element load at midpoint equally between end nodes', () => {
    const loads: Load[] = [
      { id: 'l1', elementId: 'e1', position: 0.5, forceX: 0, forceY: -20 },
    ]
    const result = distributeLoadsToNodes(loads, elements)
    expect(result).toHaveLength(2)
    expect(result).toContainEqual({ nodeId: 'n1', forceX: 0, forceY: -10 })
    expect(result).toContainEqual({ nodeId: 'n2', forceX: 0, forceY: -10 })
  })

  it('distributes element load proportionally at t=0.25', () => {
    const loads: Load[] = [
      { id: 'l1', elementId: 'e1', position: 0.25, forceX: 8, forceY: 0 },
    ]
    const result = distributeLoadsToNodes(loads, elements)
    expect(result).toContainEqual({ nodeId: 'n1', forceX: 6, forceY: 0 })
    expect(result).toContainEqual({ nodeId: 'n2', forceX: 2, forceY: 0 })
  })
})
