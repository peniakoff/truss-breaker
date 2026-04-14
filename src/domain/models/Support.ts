export enum SupportType {
  FIXED = 'FIXED',
  ROLLER_X = 'ROLLER_X',
  ROLLER_Y = 'ROLLER_Y',
}

export interface Support {
  nodeId: string
  type: SupportType
}
