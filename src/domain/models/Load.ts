export interface Load {
  id: string
  forceX: number // kN
  forceY: number // kN
  nodeId?: string
  elementId?: string
  position?: number // 0–1 along element from startNode
}

export type LoadTarget =
  | { kind: 'node'; nodeId: string }
  | { kind: 'element'; elementId: string; position: number }

export function isNodeLoad(load: Load): boolean {
  return load.nodeId !== undefined
}

export function isElementLoad(load: Load): boolean {
  return load.elementId !== undefined && load.position !== undefined
}
