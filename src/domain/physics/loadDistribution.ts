import type { Load, TrussElement, TrussNode } from '@/domain/models'
import { isElementLoad, isNodeLoad } from '@/domain/models/Load'

export interface NodalForceContribution {
  nodeId: string
  forceX: number
  forceY: number
}

/**
 * Distribute loads to nodal force contributions for the stiffness solver.
 * Element loads at position t are split: F_start = (1-t)*F, F_end = t*F.
 */
export function distributeLoadsToNodes(
  loads: Load[],
  elements: TrussElement[],
): NodalForceContribution[] {
  const contributions = new Map<string, { forceX: number; forceY: number }>()

  function add(nodeId: string, forceX: number, forceY: number): void {
    const existing = contributions.get(nodeId)
    if (existing) {
      existing.forceX += forceX
      existing.forceY += forceY
    } else {
      contributions.set(nodeId, { forceX, forceY })
    }
  }

  for (const load of loads) {
    if (isNodeLoad(load) && load.nodeId) {
      add(load.nodeId, load.forceX, load.forceY)
      continue
    }

    if (isElementLoad(load) && load.elementId !== undefined && load.position !== undefined) {
      const element = elements.find((el) => el.id === load.elementId)
      if (!element) continue

      const t = load.position
      add(element.startNodeId, load.forceX * (1 - t), load.forceY * (1 - t))
      add(element.endNodeId, load.forceX * t, load.forceY * t)
    }
  }

  return Array.from(contributions.entries()).map(([nodeId, forces]) => ({
    nodeId,
    forceX: forces.forceX,
    forceY: forces.forceY,
  }))
}

/**
 * Resolve world coordinates for rendering a load arrow.
 */
export function resolveLoadPosition(
  load: Load,
  nodes: TrussNode[],
  elements: TrussElement[],
): { x: number; y: number } | null {
  if (isNodeLoad(load) && load.nodeId) {
    const node = nodes.find((n) => n.id === load.nodeId)
    return node ? { x: node.x, y: node.y } : null
  }

  if (isElementLoad(load) && load.elementId !== undefined && load.position !== undefined) {
    const element = elements.find((el) => el.id === load.elementId)
    if (!element) return null
    const start = nodes.find((n) => n.id === element.startNodeId)
    const end = nodes.find((n) => n.id === element.endNodeId)
    if (!start || !end) return null
    const t = load.position
    return {
      x: start.x + t * (end.x - start.x),
      y: start.y + t * (end.y - start.y),
    }
  }

  return null
}
