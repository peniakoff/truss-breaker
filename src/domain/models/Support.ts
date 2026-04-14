export const SupportType = {
  FIXED: 'FIXED',
  ROLLER_X: 'ROLLER_X',
  ROLLER_Y: 'ROLLER_Y',
} as const

export type SupportType = (typeof SupportType)[keyof typeof SupportType]

export interface Support {
  nodeId: string
  type: SupportType
}
