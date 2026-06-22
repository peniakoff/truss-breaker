import type { ProfileType } from './ProfileType'

export interface CrossSection {
  area: number // m²
  profileType?: ProfileType
  profileName?: string
}
