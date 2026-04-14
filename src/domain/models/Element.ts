import type { CrossSection } from './CrossSection'

export interface TrussElement {
  id: string
  startNodeId: string
  endNodeId: string
  materialId: string
  crossSection: CrossSection
}
