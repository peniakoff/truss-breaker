import type { TrussNode } from './Node'
import type { TrussElement } from './Element'
import type { Material } from './Material'
import type { Support } from './Support'
import type { Load } from './Load'
import type { CalculationResult } from './CalculationResult'

export interface TrussData {
  nodes: TrussNode[]
  elements: TrussElement[]
  materials: Material[]
  supports: Support[]
  loads: Load[]
}

export interface Project {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  data: TrussData
  results: CalculationResult | null
}
