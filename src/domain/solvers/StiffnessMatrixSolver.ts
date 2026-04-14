import { lusolve } from 'mathjs'
import type {
  TrussData,
  CalculationResult,
  NodeDisplacement,
  ElementResult,
  ReactionResult,
  TrussNode,
  TrussElement,
  Material,
} from '@/domain/models'
import { elementLength, directionCosines } from '@/domain/physics/geometry'
import { knToN, nToKn } from '@/domain/physics/units'

export interface SolverError {
  type: 'validation' | 'singular' | 'unknown'
  message: string
}

export type SolverResult =
  | { success: true; result: CalculationResult }
  | { success: false; error: SolverError }

function validate(data: TrussData): SolverError | null {
  const { nodes, elements, supports, loads } = data

  if (nodes.length < 2) {
    return { type: 'validation', message: 'Wymagane są co najmniej 2 węzły.' }
  }
  if (elements.length < 1) {
    return { type: 'validation', message: 'Wymagany jest co najmniej 1 pręt.' }
  }
  if (supports.length < 1) {
    return { type: 'validation', message: 'Wymagana jest co najmniej 1 podpora.' }
  }
  if (loads.length < 1) {
    return { type: 'validation', message: 'Wymagane jest co najmniej 1 obciążenie.' }
  }

  let reactionCount = 0
  for (const support of supports) {
    reactionCount += support.type === 'FIXED' ? 2 : 1
  }

  if (elements.length + reactionCount < 2 * nodes.length) {
    return {
      type: 'validation',
      message: `Niewystarczająca liczba podpór dla stabilności (m + r = ${elements.length + reactionCount} < 2n = ${2 * nodes.length}).`,
    }
  }

  const connectedNodeIds = new Set<string>()
  for (const el of elements) {
    connectedNodeIds.add(el.startNodeId)
    connectedNodeIds.add(el.endNodeId)
  }
  for (const node of nodes) {
    if (!connectedNodeIds.has(node.id)) {
      return {
        type: 'validation',
        message: `Węzeł ${node.id} nie jest podłączony do żadnego pręta.`,
      }
    }
  }

  return null
}

function buildGlobalStiffnessMatrix(
  nodes: TrussNode[],
  elements: TrussElement[],
  materials: Material[],
  nodeIndexMap: Map<string, number>,
): number[][] {
  const size = 2 * nodes.length
  const K: number[][] = Array.from({ length: size }, () => new Array<number>(size).fill(0))

  for (const element of elements) {
    const sn = nodes.find((nd) => nd.id === element.startNodeId)
    const en = nodes.find((nd) => nd.id === element.endNodeId)
    const mat = materials.find((m) => m.id === element.materialId)
    if (!sn || !en || !mat) continue

    const L = elementLength(sn.x, sn.y, en.x, en.y)
    if (L === 0) continue

    const { cos: c, sin: s } = directionCosines(sn.x, sn.y, en.x, en.y)
    const k = (mat.youngModulus * element.crossSection.area) / L

    const cc = c * c
    const ss = s * s
    const cs = c * s

    const ke = [
      [cc, cs, -cc, -cs],
      [cs, ss, -cs, -ss],
      [-cc, -cs, cc, cs],
      [-cs, -ss, cs, ss],
    ]

    const i = nodeIndexMap.get(element.startNodeId)!
    const j = nodeIndexMap.get(element.endNodeId)!
    const dofs = [2 * i, 2 * i + 1, 2 * j, 2 * j + 1]

    for (let a = 0; a < 4; a++) {
      for (let b = 0; b < 4; b++) {
        K[dofs[a]][dofs[b]] += k * ke[a][b]
      }
    }
  }

  return K
}

function buildForceVector(
  nodes: TrussNode[],
  loads: TrussData['loads'],
  nodeIndexMap: Map<string, number>,
): number[] {
  const F = new Array<number>(2 * nodes.length).fill(0)
  for (const load of loads) {
    const idx = nodeIndexMap.get(load.nodeId)
    if (idx === undefined) continue
    F[2 * idx] += knToN(load.forceX)
    F[2 * idx + 1] += knToN(load.forceY)
  }
  return F
}

function applyBoundaryConditions(
  K: number[][],
  F: number[],
  supports: TrussData['supports'],
  nodeIndexMap: Map<string, number>,
): void {
  const LARGE = 1e30
  for (const support of supports) {
    const idx = nodeIndexMap.get(support.nodeId)
    if (idx === undefined) continue

    if (support.type === 'FIXED' || support.type === 'ROLLER_Y') {
      K[2 * idx][2 * idx] += LARGE
      F[2 * idx] = 0
    }
    if (support.type === 'FIXED' || support.type === 'ROLLER_X') {
      K[2 * idx + 1][2 * idx + 1] += LARGE
      F[2 * idx + 1] = 0
    }
  }
}

export function solve(data: TrussData): SolverResult {
  const validationError = validate(data)
  if (validationError) {
    return { success: false, error: validationError }
  }

  const { nodes, elements, materials, supports, loads } = data

  const nodeIndexMap = new Map<string, number>()
  nodes.forEach((node, index) => {
    nodeIndexMap.set(node.id, index)
  })

  try {
    // Build clean stiffness matrix (saved for reaction calc)
    const K_clean = buildGlobalStiffnessMatrix(nodes, elements, materials, nodeIndexMap)

    // Build force vector (applied loads in N)
    const F_applied = buildForceVector(nodes, loads, nodeIndexMap)

    // Copy K and F for solving (will be modified by BCs)
    const size = 2 * nodes.length
    const K = K_clean.map((row) => [...row])
    const F = [...F_applied]

    // Apply boundary conditions (penalty method)
    applyBoundaryConditions(K, F, supports, nodeIndexMap)

    // Solve K * U = F
    const F_col = F.map((v) => [v])
    const U_result = lusolve(K, F_col) as number[][]
    const U = U_result.map((row) => row[0])

    // Displacements (in meters)
    const displacements: NodeDisplacement[] = nodes.map((node) => {
      const idx = nodeIndexMap.get(node.id)!
      return {
        nodeId: node.id,
        dx: U[2 * idx],
        dy: U[2 * idx + 1],
      }
    })

    // Axial forces and stresses
    const elementResults: ElementResult[] = elements.map((element) => {
      const sn = nodes.find((nd) => nd.id === element.startNodeId)!
      const en = nodes.find((nd) => nd.id === element.endNodeId)!
      const mat = materials.find((m) => m.id === element.materialId)!

      const L = elementLength(sn.x, sn.y, en.x, en.y)
      const { cos: c, sin: s } = directionCosines(sn.x, sn.y, en.x, en.y)

      const i = nodeIndexMap.get(element.startNodeId)!
      const j = nodeIndexMap.get(element.endNodeId)!

      const du = U[2 * j] - U[2 * i]
      const dv = U[2 * j + 1] - U[2 * i + 1]
      const deltaL = c * du + s * dv

      const axialForceN = (mat.youngModulus * element.crossSection.area / L) * deltaL
      const stress = axialForceN / element.crossSection.area

      return {
        elementId: element.id,
        axialForce: nToKn(axialForceN),
        stress,
      }
    })

    // Reactions: R = K_clean * U - F_applied (at constrained DOFs)
    const reactions: ReactionResult[] = []
    for (const support of supports) {
      const idx = nodeIndexMap.get(support.nodeId)
      if (idx === undefined) continue

      let rx = 0
      let ry = 0

      if (support.type === 'FIXED' || support.type === 'ROLLER_Y') {
        let sum = 0
        for (let col = 0; col < size; col++) {
          sum += K_clean[2 * idx][col] * U[col]
        }
        rx = nToKn(sum - F_applied[2 * idx])
      }

      if (support.type === 'FIXED' || support.type === 'ROLLER_X') {
        let sum = 0
        for (let col = 0; col < size; col++) {
          sum += K_clean[2 * idx + 1][col] * U[col]
        }
        ry = nToKn(sum - F_applied[2 * idx + 1])
      }

      reactions.push({ nodeId: support.nodeId, forceX: rx, forceY: ry })
    }

    return { success: true, result: { displacements, elementResults, reactions } }
  } catch (_e) {
    return {
      success: false,
      error: {
        type: 'singular',
        message: 'Układ jest niestabilny — macierz sztywności jest osobliwa. Sprawdź warunki podparcia.',
      },
    }
  }
}
