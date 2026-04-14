/**
 * Convert kN to N
 */
export function knToN(kn: number): number {
  return kn * 1000
}

/**
 * Convert N to kN
 */
export function nToKn(n: number): number {
  return n / 1000
}

/**
 * Convert Pa to MPa
 */
export function paToMpa(pa: number): number {
  return pa / 1e6
}
