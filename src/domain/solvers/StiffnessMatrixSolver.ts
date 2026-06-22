import { lusolve } from 'mathjs'
import {
  SupportType,
  type Material,
  type CalculationResult,
  type ElementResult,
  type NodeDisplacement,
  type ReactionResult,
  type Support,
  type TrussData,
  type TrussElement,
  type TrussNode,
} from '@/domain/models'
import { elementLength, directionCosines } from '@/domain/physics/geometry'
import { distributeLoadsToNodes } from '@/domain/physics/loadDistribution'
import { knToN, nToKn } from '@/domain/physics/units'

type SolverErrorKey =
  | 'errors.notEnoughNodes'
  | 'errors.notEnoughElements'
  | 'errors.noSupports'
  | 'errors.noLoads'
  | 'errors.insufficientSupports'
  | 'errors.disconnectedNode'
  | 'errors.singularMatrix'

export interface SolverError {
  type: 'validation' | 'singular' | 'unknown'
  messageKey: SolverErrorKey
  params?: Record<string, string>
}

export type SolverResult =
  | { success: true; result: CalculationResult }
  | { success: false; error: SolverError }

function createNodeMap(nodes: TrussNode[]): Map<string, TrussNode> {
  return new Map(nodes.map((node) => [node.id, node]))
}

function createMaterialMap(materials: Material[]): Map<string, Material> {
  return new Map(materials.map((material) => [material.id, material]))
}

function isXConstrained(type: Support['type']): boolean {
  return type === SupportType.FIXED || type === SupportType.ROLLER_Y
}

function isYConstrained(type: Support['type']): boolean {
  return type === SupportType.FIXED || type === SupportType.ROLLER_X
}

function validate(data: TrussData): SolverError | null {
  const { nodes, elements, supports, loads } = data

  if (nodes.length < 2) {
    return { type: 'validation', messageKey: 'errors.notEnoughNodes' }
  }
  if (elements.length < 1) {
    return { type: 'validation', messageKey: 'errors.notEnoughElements' }
  }
  if (supports.length < 1) {
    return { type: 'validation', messageKey: 'errors.noSupports' }
  }
  if (loads.length < 1) {
    return { type: 'validation', messageKey: 'errors.noLoads' }
  }

  let reactionCount = 0
  for (const support of supports) {
    reactionCount += support.type === SupportType.FIXED ? 2 : 1
  }

  if (elements.length + reactionCount < 2 * nodes.length) {
    return {
      type: 'validation',
      messageKey: 'errors.insufficientSupports',
      params: {
        sum: String(elements.length + reactionCount),
        required: String(2 * nodes.length),
      },
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
        messageKey: 'errors.disconnectedNode',
        params: { nodeId: node.id },
      }
    }
  }

  return null
}

function buildGlobalStiffnessMatrix(
  nodes: TrussNode[],
  elements: TrussElement[],
  nodeById: Map<string, TrussNode>,
  materialById: Map<string, Material>,
  nodeIndexMap: Map<string, number>,
): number[][] {
  const size = 2 * nodes.length
  const stiffness: number[][] = Array.from({ length: size }, () => new Array<number>(size).fill(0))

  for (const element of elements) {
    const startNode = nodeById.get(element.startNodeId)
    const endNode = nodeById.get(element.endNodeId)
    const material = materialById.get(element.materialId)
    if (!startNode || !endNode || !material) {
      continue
    }

    const length = elementLength(startNode.x, startNode.y, endNode.x, endNode.y)
    if (length === 0) {
      continue
    }

    const { cos, sin } = directionCosines(startNode.x, startNode.y, endNode.x, endNode.y)
    const factor = (material.youngModulus * element.crossSection.area) / length
    const cc = cos * cos
    const ss = sin * sin
    const cs = cos * sin

    const localMatrix = [
      [cc, cs, -cc, -cs],
      [cs, ss, -cs, -ss],
      [-cc, -cs, cc, cs],
      [-cs, -ss, cs, ss],
    ]

    const startIndex = nodeIndexMap.get(element.startNodeId)
    const endIndex = nodeIndexMap.get(element.endNodeId)
    if (startIndex === undefined || endIndex === undefined) {
      continue
    }

    const dofs = [2 * startIndex, 2 * startIndex + 1, 2 * endIndex, 2 * endIndex + 1]

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        stiffness[dofs[row]][dofs[col]] += factor * localMatrix[row][col]
      }
    }
  }

  return stiffness
}

function buildForceVector(
  nodes: TrussNode[],
  loads: TrussData['loads'],
  elements: TrussElement[],
  nodeIndexMap: Map<string, number>,
): number[] {
  const forces = new Array<number>(2 * nodes.length).fill(0)
  const contributions = distributeLoadsToNodes(loads, elements)

  for (const contribution of contributions) {
    const index = nodeIndexMap.get(contribution.nodeId)
    if (index === undefined) {
      continue
    }

    forces[2 * index] += knToN(contribution.forceX)
    forces[2 * index + 1] += knToN(contribution.forceY)
  }

  return forces
}

function applyBoundaryConditions(
  stiffness: number[][],
  forces: number[],
  supports: TrussData['supports'],
  nodeIndexMap: Map<string, number>,
): void {
  const penalty = 1e30

  for (const support of supports) {
    const index = nodeIndexMap.get(support.nodeId)
    if (index === undefined) {
      continue
    }

    if (isXConstrained(support.type)) {
      stiffness[2 * index][2 * index] += penalty
      forces[2 * index] = 0
    }

    if (isYConstrained(support.type)) {
      stiffness[2 * index + 1][2 * index + 1] += penalty
      forces[2 * index + 1] = 0
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

  const nodeById = createNodeMap(nodes)
  const materialById = createMaterialMap(materials)

  try {
    const cleanStiffness = buildGlobalStiffnessMatrix(nodes, elements, nodeById, materialById, nodeIndexMap)
    const appliedForces = buildForceVector(nodes, loads, elements, nodeIndexMap)
    const stiffness = cleanStiffness.map((row) => [...row])
    const forces = [...appliedForces]
    const totalDofs = 2 * nodes.length

    applyBoundaryConditions(stiffness, forces, supports, nodeIndexMap)

    const displacementColumn = lusolve(stiffness, forces.map((value) => [value])) as number[][]
    const displacementsVector = displacementColumn.map((row) => row[0])

    const displacements: NodeDisplacement[] = nodes.map((node) => {
      const index = nodeIndexMap.get(node.id)!
      return {
        nodeId: node.id,
        dx: displacementsVector[2 * index],
        dy: displacementsVector[2 * index + 1],
      }
    })

    const elementResults: ElementResult[] = elements.flatMap((element) => {
      const startNode = nodeById.get(element.startNodeId)
      const endNode = nodeById.get(element.endNodeId)
      const material = materialById.get(element.materialId)
      if (!startNode || !endNode || !material) {
        return []
      }

      const length = elementLength(startNode.x, startNode.y, endNode.x, endNode.y)
      if (length === 0) {
        return []
      }

      const { cos, sin } = directionCosines(startNode.x, startNode.y, endNode.x, endNode.y)
      const startIndex = nodeIndexMap.get(element.startNodeId)!
      const endIndex = nodeIndexMap.get(element.endNodeId)!
      const deltaX = displacementsVector[2 * endIndex] - displacementsVector[2 * startIndex]
      const deltaY = displacementsVector[2 * endIndex + 1] - displacementsVector[2 * startIndex + 1]
      const deltaLength = cos * deltaX + sin * deltaY
      const axialForceN = (material.youngModulus * element.crossSection.area / length) * deltaLength

      return [{
        elementId: element.id,
        axialForce: nToKn(axialForceN),
        stress: axialForceN / element.crossSection.area,
      }]
    })

    const reactions: ReactionResult[] = []
    for (const support of supports) {
      const index = nodeIndexMap.get(support.nodeId)
      if (index === undefined) {
        continue
      }

      let forceX = 0
      let forceY = 0

      if (isXConstrained(support.type)) {
        let sum = 0
        for (let col = 0; col < totalDofs; col++) {
          sum += cleanStiffness[2 * index][col] * displacementsVector[col]
        }
        forceX = nToKn(sum - appliedForces[2 * index])
      }

      if (isYConstrained(support.type)) {
        let sum = 0
        for (let col = 0; col < totalDofs; col++) {
          sum += cleanStiffness[2 * index + 1][col] * displacementsVector[col]
        }
        forceY = nToKn(sum - appliedForces[2 * index + 1])
      }

      reactions.push({ nodeId: support.nodeId, forceX, forceY })
    }

    return {
      success: true,
      result: { displacements, elementResults, reactions },
    }
  } catch {
    return {
      success: false,
      error: {
        type: 'singular',
        messageKey: 'errors.singularMatrix',
      },
    }
  }
}
