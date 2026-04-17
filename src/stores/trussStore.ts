import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TrussNode, TrussElement, Material, Support, Load, CalculationResult, TrussData } from '@/domain/models'
import { SupportType } from '@/domain/models'
import { DEFAULT_YOUNG_MODULUS, DEFAULT_YIELD_STRENGTH, DEFAULT_MATERIAL_NAME, DEFAULT_CROSS_SECTION_AREA } from '@/utils/constants'

export const useTrussStore = defineStore('truss', () => {
  // State
  const nodes = ref<TrussNode[]>([])
  const elements = ref<TrussElement[]>([])
  const materials = ref<Material[]>([
    {
      id: 'default-steel',
      name: DEFAULT_MATERIAL_NAME,
      youngModulus: DEFAULT_YOUNG_MODULUS,
      yieldStrength: DEFAULT_YIELD_STRENGTH,
    },
  ])
  const supports = ref<Support[]>([])
  const loads = ref<Load[]>([])
  const results = ref<CalculationResult | null>(null)

  // ID counter
  let nextId = 1
  function generateId(prefix: string): string {
    return `${prefix}-${nextId++}`
  }

  function cloneTrussData(data: TrussData): TrussData {
    return JSON.parse(JSON.stringify(data)) as TrussData
  }

  // Getters
  const getNodeById = computed(() => {
    const map = new Map<string, TrussNode>()
    for (const node of nodes.value) {
      map.set(node.id, node)
    }
    return (id: string): TrussNode | undefined => map.get(id)
  })

  const getElementsByNodeId = computed(() => {
    return (nodeId: string): TrussElement[] => {
      return elements.value.filter(
        (el) => el.startNodeId === nodeId || el.endNodeId === nodeId,
      )
    }
  })

  const getSupportByNodeId = computed(() => {
    return (nodeId: string): Support | undefined => {
      return supports.value.find((s) => s.nodeId === nodeId)
    }
  })

  const getLoadByNodeId = computed(() => {
    return (nodeId: string): Load | undefined => {
      return loads.value.find((l) => l.nodeId === nodeId)
    }
  })

  const reactionCount = computed(() => {
    let count = 0
    for (const support of supports.value) {
      if (support.type === SupportType.FIXED) {
        count += 2  // restricts both X and Y
      } else {
        count += 1  // ROLLER restricts one direction
      }
    }
    return count
  })

  const isStaticallyDeterminate = computed(() => {
    const n = nodes.value.length
    const m = elements.value.length
    const r = reactionCount.value
    return m + r === 2 * n
  })

  // Actions
  function addNode(x: number, y: number): TrussNode {
    const node: TrussNode = { id: generateId('n'), x, y }
    nodes.value.push(node)
    clearResults()
    return node
  }

  function removeNode(id: string): void {
    // Remove connected elements first
    elements.value = elements.value.filter(
      (el) => el.startNodeId !== id && el.endNodeId !== id,
    )
    // Remove support on this node
    supports.value = supports.value.filter((s) => s.nodeId !== id)
    // Remove load on this node
    loads.value = loads.value.filter((l) => l.nodeId !== id)
    // Remove the node
    nodes.value = nodes.value.filter((n) => n.id !== id)
    clearResults()
  }

  function updateNode(id: string, x: number, y: number): void {
    const node = nodes.value.find((n) => n.id === id)
    if (node) {
      node.x = x
      node.y = y
      clearResults()
    }
  }

  function addElement(startNodeId: string, endNodeId: string, materialId?: string): TrussElement {
    const element: TrussElement = {
      id: generateId('e'),
      startNodeId,
      endNodeId,
      materialId: materialId ?? 'default-steel',
      crossSection: { area: DEFAULT_CROSS_SECTION_AREA },
    }
    elements.value.push(element)
    clearResults()
    return element
  }

  function removeElement(id: string): void {
    elements.value = elements.value.filter((el) => el.id !== id)
    clearResults()
  }

  function splitElement(elementId: string, x: number, y: number): string | null {
    const element = elements.value.find((el) => el.id === elementId)
    if (!element) return null

    const startNode = nodes.value.find((n) => n.id === element.startNodeId)
    const endNode = nodes.value.find((n) => n.id === element.endNodeId)
    if (!startNode || !endNode) return null

    // Guard: if split point is too close to an existing endpoint, return that node
    const epsilonSq = 1 // 1px² tolerance (avoids sqrt for distance checks)
    const distToStartSq = (x - startNode.x) ** 2 + (y - startNode.y) ** 2
    const distToEndSq = (x - endNode.x) ** 2 + (y - endNode.y) ** 2
    if (distToStartSq < epsilonSq) return startNode.id
    if (distToEndSq < epsilonSq) return endNode.id

    // Guard: if a node already exists at this position, return it
    const existingNode = nodes.value.find(
      (n) => (x - n.x) ** 2 + (y - n.y) ** 2 < epsilonSq,
    )
    if (existingNode) return existingNode.id

    const startNodeId = element.startNodeId
    const endNodeId = element.endNodeId
    const materialId = element.materialId
    const crossSection = { ...element.crossSection }

    // Create the new node at the split point
    const newNode = addNode(x, y)

    // Remove the original element
    elements.value = elements.value.filter((el) => el.id !== elementId)

    // Create two new elements with same material and cross-section
    const el1: TrussElement = {
      id: generateId('e'),
      startNodeId,
      endNodeId: newNode.id,
      materialId,
      crossSection: { ...crossSection },
    }
    const el2: TrussElement = {
      id: generateId('e'),
      startNodeId: newNode.id,
      endNodeId,
      materialId,
      crossSection: { ...crossSection },
    }
    elements.value.push(el1, el2)

    clearResults()
    return newNode.id
  }

  function updateElement(id: string, updates: Partial<Pick<TrussElement, 'materialId' | 'crossSection'>>): void {
    const element = elements.value.find((el) => el.id === id)
    if (element) {
      if (updates.materialId !== undefined) element.materialId = updates.materialId
      if (updates.crossSection !== undefined) element.crossSection = { ...updates.crossSection }
      clearResults()
    }
  }

  function addSupport(nodeId: string, type: SupportType): Support {
    // Remove existing support on this node
    supports.value = supports.value.filter((s) => s.nodeId !== nodeId)
    const support: Support = { nodeId, type }
    supports.value.push(support)
    clearResults()
    return support
  }

  function removeSupport(nodeId: string): void {
    supports.value = supports.value.filter((s) => s.nodeId !== nodeId)
    clearResults()
  }

  function addLoad(nodeId: string, forceX: number, forceY: number): Load {
    // Remove existing load on this node
    loads.value = loads.value.filter((l) => l.nodeId !== nodeId)
    const load: Load = { nodeId, forceX, forceY }
    loads.value.push(load)
    clearResults()
    return load
  }

  function removeLoad(nodeId: string): void {
    loads.value = loads.value.filter((l) => l.nodeId !== nodeId)
    clearResults()
  }

  function updateLoad(nodeId: string, forceX: number, forceY: number): void {
    const load = loads.value.find((l) => l.nodeId === nodeId)
    if (load) {
      load.forceX = forceX
      load.forceY = forceY
      clearResults()
    }
  }

  function setResults(newResults: CalculationResult): void {
    results.value = newResults
  }

  function clearResults(): void {
    results.value = null
  }

  function clearAll(): void {
    nodes.value = []
    elements.value = []
    supports.value = []
    loads.value = []
    results.value = null
    materials.value = [
      {
        id: 'default-steel',
        name: DEFAULT_MATERIAL_NAME,
        youngModulus: DEFAULT_YOUNG_MODULUS,
        yieldStrength: DEFAULT_YIELD_STRENGTH,
      },
    ]
    nextId = 1
  }

  function loadFromProject(data: TrussData): void {
    const cloned = cloneTrussData(data)
    nodes.value = cloned.nodes
    elements.value = cloned.elements
    materials.value = cloned.materials
    supports.value = cloned.supports
    loads.value = cloned.loads
    results.value = null
    // Update nextId to avoid collisions
    const allIds = [
      ...data.nodes.map((n) => n.id),
      ...data.elements.map((e) => e.id),
    ]
    let maxNum = 0
    for (const id of allIds) {
      const match = id.match(/-(\d+)$/)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxNum) maxNum = num
      }
    }
    nextId = maxNum + 1
  }

  function exportTrussData(): TrussData {
    return cloneTrussData({
      nodes: [...nodes.value],
      elements: [...elements.value],
      materials: [...materials.value],
      supports: [...supports.value],
      loads: [...loads.value],
    })
  }

  return {
    // State
    nodes,
    elements,
    materials,
    supports,
    loads,
    results,
    // Getters
    getNodeById,
    getElementsByNodeId,
    getSupportByNodeId,
    getLoadByNodeId,
    reactionCount,
    isStaticallyDeterminate,
    // Actions
    addNode,
    removeNode,
    updateNode,
    addElement,
    removeElement,
    splitElement,
    updateElement,
    addSupport,
    removeSupport,
    addLoad,
    removeLoad,
    updateLoad,
    setResults,
    clearResults,
    clearAll,
    loadFromProject,
    exportTrussData,
  }
})
