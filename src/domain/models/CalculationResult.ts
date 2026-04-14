export interface NodeDisplacement {
  nodeId: string
  dx: number // m
  dy: number // m
}

export interface ElementResult {
  elementId: string
  axialForce: number // kN (positive = tension, negative = compression)
  stress: number // Pa
}

export interface ReactionResult {
  nodeId: string
  forceX: number // kN
  forceY: number // kN
}

export interface CalculationResult {
  displacements: NodeDisplacement[]
  elementResults: ElementResult[]
  reactions: ReactionResult[]
}
