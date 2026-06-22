/**
 * Steel profile catalog — cross-section areas (m²).
 * Source: approximate values from EN 10365 (IPE/HEB) and standard pipe tables.
 */

import type { ProfileType } from '@/domain/models/ProfileType'

export interface SteelProfile {
  name: string
  area: number // m²
}

export const STEEL_PROFILES: Record<Exclude<ProfileType, 'custom'>, SteelProfile[]> = {
  ipe: [
    { name: 'IPE80', area: 7.64e-4 },
    { name: 'IPE100', area: 10.3e-4 },
    { name: 'IPE120', area: 13.2e-4 },
    { name: 'IPE140', area: 16.4e-4 },
    { name: 'IPE160', area: 20.1e-4 },
    { name: 'IPE180', area: 23.9e-4 },
    { name: 'IPE200', area: 28.5e-4 },
    { name: 'IPE220', area: 33.4e-4 },
    { name: 'IPE240', area: 39.1e-4 },
    { name: 'IPE270', area: 45.9e-4 },
    { name: 'IPE300', area: 53.8e-4 },
    { name: 'IPE330', area: 62.6e-4 },
    { name: 'IPE360', area: 72.7e-4 },
    { name: 'IPE400', area: 84.5e-4 },
    { name: 'IPE450', area: 98.8e-4 },
    { name: 'IPE500', area: 116.0e-4 },
  ],
  heb: [
    { name: 'HEB100', area: 26.04e-4 },
    { name: 'HEB120', area: 34.3e-4 },
    { name: 'HEB140', area: 42.7e-4 },
    { name: 'HEB160', area: 51.2e-4 },
    { name: 'HEB180', area: 60.6e-4 },
    { name: 'HEB200', area: 78.1e-4 },
    { name: 'HEB220', area: 91.0e-4 },
    { name: 'HEB240', area: 106.0e-4 },
    { name: 'HEB260', area: 122.0e-4 },
    { name: 'HEB280', area: 131.0e-4 },
    { name: 'HEB300', area: 149.0e-4 },
    { name: 'HEB320', area: 161.0e-4 },
    { name: 'HEB340', area: 171.0e-4 },
    { name: 'HEB360', area: 181.0e-4 },
    { name: 'HEB400', area: 198.0e-4 },
  ],
  pipe: [
    { name: 'DN40 (48.3×3.2)', area: 4.52e-4 },
    { name: 'DN50 (60.3×3.2)', area: 5.77e-4 },
    { name: 'DN65 (76.1×3.2)', area: 7.48e-4 },
    { name: 'DN80 (88.9×3.2)', area: 8.75e-4 },
    { name: 'DN100 (114.3×3.6)', area: 12.7e-4 },
    { name: 'DN125 (139.7×4.0)', area: 16.9e-4 },
    { name: 'DN150 (168.3×4.5)', area: 23.1e-4 },
    { name: 'DN200 (219.1×6.3)', area: 41.6e-4 },
  ],
}

export function findProfile(type: ProfileType, name: string): SteelProfile | undefined {
  if (type === 'custom') return undefined
  return STEEL_PROFILES[type].find((p) => p.name === name)
}

export type { ProfileType } from '@/domain/models/ProfileType'
