import { ref, type Ref } from 'vue'
import { useTrussStore } from '@/stores/trussStore'
import { GRID_SIZE, GRID_SNAP_THRESHOLD } from '@/utils/constants'

export interface GridSnapResult {
  snappedX: Ref<number>
  snappedY: Ref<number>
  rawX: Ref<number>
  rawY: Ref<number>
  nearestNodeId: Ref<string | null>
  handleMouseMove: (e: MouseEvent, svgEl: SVGSVGElement, zoom: number, panX: number, panY: number) => void
}

export function useMouseGridSnap(): GridSnapResult {
  const trussStore = useTrussStore()
  const snappedX = ref(0)
  const snappedY = ref(0)
  const rawX = ref(0)
  const rawY = ref(0)
  const nearestNodeId = ref<string | null>(null)

  function screenToSvg(
    e: MouseEvent,
    svgEl: SVGSVGElement,
    zoom: number,
    panX: number,
    panY: number,
  ): { x: number; y: number } {
    const rect = svgEl.getBoundingClientRect()
    const x = (e.clientX - rect.left) / zoom - panX
    const y = (e.clientY - rect.top) / zoom - panY
    return { x, y }
  }

  function snapToGrid(val: number): number {
    return Math.round(val / GRID_SIZE) * GRID_SIZE
  }

  function handleMouseMove(
    e: MouseEvent,
    svgEl: SVGSVGElement,
    zoom: number,
    panX: number,
    panY: number,
  ): void {
    const { x, y } = screenToSvg(e, svgEl, zoom, panX, panY)
    rawX.value = x
    rawY.value = y

    // Check if near an existing node first
    let closestNodeId: string | null = null
    let closestDist = GRID_SNAP_THRESHOLD / zoom

    for (const node of trussStore.nodes) {
      const dx = x - node.x
      const dy = y - node.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < closestDist) {
        closestDist = dist
        closestNodeId = node.id
      }
    }

    if (closestNodeId) {
      const node = trussStore.getNodeById(closestNodeId)
      if (node) {
        snappedX.value = node.x
        snappedY.value = node.y
        nearestNodeId.value = closestNodeId
        return
      }
    }

    // Snap to grid
    snappedX.value = snapToGrid(x)
    snappedY.value = snapToGrid(y)
    nearestNodeId.value = null
  }

  return { snappedX, snappedY, rawX, rawY, nearestNodeId, handleMouseMove }
}
