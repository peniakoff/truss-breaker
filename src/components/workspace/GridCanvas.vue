<script setup lang="ts">
import { computed, ref } from 'vue'
import { SupportType, type TrussElement } from '@/domain/models'
import { resolveLoadPosition } from '@/domain/physics/loadDistribution'
import { elementLength, findNearestGridPointOnSegment } from '@/domain/physics/geometry'
import { useTrussStore } from '@/stores/trussStore'
import { useUiStore, ToolType } from '@/stores/uiStore'
import { useMouseGridSnap } from '@/composables/useMouseGridSnap'
import { useCanvasNavigation } from '@/composables/useCanvasNavigation'
import { useI18n } from '@/composables/useI18n'
import {
  GRID_SIZE,
  GRID_MINOR_SIZE,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GRID_MINOR_COLOR,
  GRID_LINE_WIDTH,
  GRID_MAJOR_EVERY,
  GRID_MAJOR_COLOR,
  GRID_MAJOR_LINE_WIDTH,
  GRID_MINOR_VISIBLE_ZOOM_THRESHOLD,
  COLOR_NODE,
  COLOR_NODE_SELECTED,
  COLOR_ELEMENT_DEFAULT,
  COLOR_ELEMENT_SELECTED,
  COLOR_SUPPORT,
  COLOR_LOAD,
  COLOR_GHOST,
  COLOR_TENSION,
  COLOR_COMPRESSION,
  COLOR_NEUTRAL,
  NODE_RADIUS,
  ELEMENT_WIDTH,
  ELEMENT_HIT_THRESHOLD,
  SUPPORT_SIZE,
  FORCE_ARROW_MIN_LENGTH,
  FORCE_ARROW_HEAD_SIZE,
  FORCE_ARROW_SCALE,
  COLOR_REACTION,
  FONT_SIZE_ELEMENT_LABEL,
  FONT_SIZE_FORCE_LABEL,
  FONT_SIZE_SUPPORT_LABEL,
  DEFORMATION_SCALE_FACTOR,
} from '@/utils/constants'

const trussStore = useTrussStore()
const uiStore = useUiStore()
const { t } = useI18n()
const svgRef = ref<SVGSVGElement | null>(null)

const { snappedX, snappedY, rawX, rawY, nearestNodeId, handleMouseMove: snapMouseMove } = useMouseGridSnap()
const {
  isPanning,
  handleWheel,
  handleMouseDown: navMouseDown,
  handleMouseMove: navMouseMove,
  handleMouseUp: navMouseUp,
} = useCanvasNavigation()

const viewBox = computed(() => {
  const x = -uiStore.panOffset.x
  const y = -uiStore.panOffset.y
  const w = CANVAS_WIDTH / uiStore.zoom
  const h = CANVAS_HEIGHT / uiStore.zoom
  return `${x} ${y} ${w} ${h}`
})

const majorGridLines = computed(() => {
  const lines: { x1: number; y1: number; x2: number; y2: number }[] = []
  const extent = Math.max(CANVAS_WIDTH, CANVAS_HEIGHT) * 2

  for (let i = 0; i <= extent / GRID_MINOR_SIZE; i++) {
    if (i % GRID_MAJOR_EVERY !== 0) continue
    const pos = i * GRID_MINOR_SIZE
    lines.push({ x1: pos, y1: 0, x2: pos, y2: extent })
    lines.push({ x1: 0, y1: pos, x2: extent, y2: pos })
  }

  return lines
})

const minorGridLines = computed(() => {
  if (uiStore.zoom < GRID_MINOR_VISIBLE_ZOOM_THRESHOLD) return []

  const lines: { x1: number; y1: number; x2: number; y2: number }[] = []
  const extent = Math.max(CANVAS_WIDTH, CANVAS_HEIGHT) * 2

  for (let i = 0; i <= extent / GRID_MINOR_SIZE; i++) {
    if (i % GRID_MAJOR_EVERY === 0) continue
    const pos = i * GRID_MINOR_SIZE
    lines.push({ x1: pos, y1: 0, x2: pos, y2: extent })
    lines.push({ x1: 0, y1: pos, x2: extent, y2: pos })
  }

  return lines
})

const elementForceLabels = computed(() => {
  if (!trussStore.results) {
    return []
  }

  return trussStore.results.elementResults.flatMap((result) => {
    const element = trussStore.elements.find((item) => item.id === result.elementId)
    if (!element) {
      return []
    }

    const startNode = trussStore.getNodeById(element.startNodeId)
    const endNode = trussStore.getNodeById(element.endNodeId)
    if (!startNode || !endNode) {
      return []
    }

    return [{
      elementId: result.elementId,
      x: (startNode.x + endNode.x) / 2,
      y: (startNode.y + endNode.y) / 2 - 40 / uiStore.zoom,
      axialForce: result.axialForce,
      color: result.axialForce > 0.001
        ? COLOR_TENSION
        : result.axialForce < -0.001
          ? COLOR_COMPRESSION
          : COLOR_NEUTRAL,
    }]
  })
})

function getForceArrow(nodeX: number, nodeY: number, fx: number, fy: number): {
  x1: number
  y1: number
  x2: number
  y2: number
  headPoints: string
} {
  const magnitude = Math.sqrt(fx * fx + fy * fy)
  if (magnitude === 0) {
    return { x1: nodeX, y1: nodeY, x2: nodeX, y2: nodeY, headPoints: '' }
  }

  const length = Math.max(magnitude * FORCE_ARROW_SCALE * GRID_SIZE, FORCE_ARROW_MIN_LENGTH)
  const dirX = fx / magnitude
  const dirY = fy / magnitude
  const x2 = nodeX
  const y2 = nodeY
  const x1 = nodeX - dirX * length
  const y1 = nodeY - dirY * length
  const headSize = FORCE_ARROW_HEAD_SIZE
  const perpX = -dirY
  const perpY = dirX
  const baseX = x2 - dirX * headSize
  const baseY = y2 - dirY * headSize
  const headPoints = `${x2},${y2} ${baseX + (perpX * headSize) / 2},${baseY + (perpY * headSize) / 2} ${baseX - (perpX * headSize) / 2},${baseY - (perpY * headSize) / 2}`

  return { x1, y1, x2, y2, headPoints }
}

function forceLabel(fx: number, fy: number): string {
  const parts: string[] = []
  if (Math.abs(fx) > 0.001) parts.push(t('canvas.forceX', { value: fx.toFixed(1) }))
  if (Math.abs(fy) > 0.001) parts.push(t('canvas.forceY', { value: fy.toFixed(1) }))
  return parts.join(', ')
}

const loadArrows = computed(() => {
  return trussStore.loads.flatMap((load) => {
    const position = resolveLoadPosition(load, trussStore.nodes, trussStore.elements)
    if (!position) {
      return []
    }

    return [{
      id: load.id,
      label: forceLabel(load.forceX, load.forceY),
      arrow: getForceArrow(position.x, position.y, load.forceX, -load.forceY),
    }]
  })
})

const reactionArrows = computed(() => {
  if (!trussStore.results) {
    return []
  }

  return trussStore.results.reactions.flatMap((reaction) => {
    const node = trussStore.getNodeById(reaction.nodeId)
    if (!node) {
      return []
    }

    return [{
      nodeId: reaction.nodeId,
      label: forceLabel(reaction.forceX, reaction.forceY),
      arrow: getForceArrow(node.x, node.y, reaction.forceX, -reaction.forceY),
    }]
  })
})

function getElementColor(elementId: string): string {
  if (uiStore.selectedElementId === elementId) return COLOR_ELEMENT_SELECTED
  if (trussStore.results) {
    const result = trussStore.results.elementResults.find((item) => item.elementId === elementId)
    if (result) {
      if (result.axialForce > 0.001) return COLOR_TENSION
      if (result.axialForce < -0.001) return COLOR_COMPRESSION
      return COLOR_NEUTRAL
    }
  }
  return COLOR_ELEMENT_DEFAULT
}

function getElementWidth(elementId: string): number {
  return uiStore.selectedElementId === elementId ? ELEMENT_WIDTH + 2 : ELEMENT_WIDTH
}

function getSupportPath(x: number, y: number, type: string): string {
  const size = SUPPORT_SIZE
  if (type === SupportType.FIXED) {
    return `M ${x} ${y} L ${x - size / 2} ${y + size} L ${x + size / 2} ${y + size} Z`
  }
  return `M ${x} ${y} L ${x - size / 2} ${y + size * 0.7} L ${x + size / 2} ${y + size * 0.7} Z`
}

function getRollerCircles(x: number, y: number, type: string): { cx: number; cy: number; r: number }[] {
  const size = SUPPORT_SIZE
  if (type === SupportType.ROLLER_X || type === SupportType.ROLLER_Y) {
    const baseY = y + size * 0.7 + 4
    return [
      { cx: x - size / 4, cy: baseY, r: 3 },
      { cx: x + size / 4, cy: baseY, r: 3 },
    ]
  }
  return []
}

function getSupportLabel(type: string): string {
  if (type === SupportType.FIXED) return t('canvas.supportFixed')
  if (type === SupportType.ROLLER_X) return t('canvas.supportRollerX')
  if (type === SupportType.ROLLER_Y) return t('canvas.supportRollerY')
  return ''
}

function getSupportLabelY(y: number, type: string): number {
  if (type === SupportType.FIXED) return y + SUPPORT_SIZE + 40
  return y + SUPPORT_SIZE * 0.7 + 40
}

function getNodeColor(nodeId: string): string {
  return uiStore.selectedNodeId === nodeId ? COLOR_NODE_SELECTED : COLOR_NODE
}

const showGhost = computed(() => {
  const ghostTools: string[] = [ToolType.ADD_NODE, ToolType.ADD_ELEMENT, ToolType.ADD_SUPPORT, ToolType.ADD_LOAD]
  return ghostTools.includes(uiStore.activeTool)
})

const startNode = computed(() => {
  if (!uiStore.elementStartNodeId) return null
  return trussStore.getNodeById(uiStore.elementStartNodeId) ?? null
})

const previewElementLength = computed(() => {
  if (!startNode.value) return null
  return elementLength(startNode.value.x, startNode.value.y, snappedX.value, snappedY.value)
})

const loadPreviewPoint = computed(() => {
  if (uiStore.activeTool !== ToolType.ADD_LOAD || nearestNodeId.value) {
    return null
  }

  const hit = findHoveredElementProjection(rawX.value, rawY.value)
  if (!hit) return null

  const start = trussStore.getNodeById(hit.element.startNodeId)
  const end = trussStore.getNodeById(hit.element.endNodeId)
  if (!start || !end) return null

  const snapped = findNearestGridPointOnSegment(
    start.x, start.y,
    end.x, end.y,
    rawX.value, rawY.value,
  )
  if (!snapped) return null

  return {
    elementId: hit.element.id,
    x: snapped.x,
    y: snapped.y,
    t: snapped.t,
  }
})

function getDeformedPosition(nodeId: string, x: number, y: number): { x: number; y: number } {
  if (!trussStore.results || !uiStore.showDeformations) {
    return { x, y }
  }
  const displacement = trussStore.results.displacements.find((d) => d.nodeId === nodeId)
  if (!displacement) {
    return { x, y }
  }
  const scale = GRID_SIZE * DEFORMATION_SCALE_FACTOR
  return {
    x: x + displacement.dx * scale,
    y: y - displacement.dy * scale,
  }
}

const deformedElements = computed(() => {
  if (!trussStore.results || !uiStore.showDeformations) return []
  return trussStore.elements.flatMap((element) => {
    const start = trussStore.getNodeById(element.startNodeId)
    const end = trussStore.getNodeById(element.endNodeId)
    if (!start || !end) return []
    const startPos = getDeformedPosition(start.id, start.x, start.y)
    const endPos = getDeformedPosition(end.id, end.x, end.y)
    return [{
      id: element.id,
      x1: startPos.x,
      y1: startPos.y,
      x2: endPos.x,
      y2: endPos.y,
    }]
  })
})

const deformedNodes = computed(() => {
  if (!trussStore.results || !uiStore.showDeformations) return []
  return trussStore.nodes.map((node) => {
    const pos = getDeformedPosition(node.id, node.x, node.y)
    return { id: node.id, x: pos.x, y: pos.y }
  })
})

function onMouseMove(e: MouseEvent): void {
  if (!svgRef.value) return
  navMouseMove(e)
  if (!isPanning.value) {
    snapMouseMove(e, svgRef.value, uiStore.zoom, uiStore.panOffset.x, uiStore.panOffset.y)
  }
}

function onMouseDown(e: MouseEvent): void {
  navMouseDown(e)
}

function onMouseUp(e: MouseEvent): void {
  const wasPanning = isPanning.value
  navMouseUp()
  if (wasPanning) return
  if (e.button !== 0 || e.shiftKey) return
  handleToolClick()
}

function handleToolClick(): void {
  const tool = uiStore.activeTool

  if (tool === ToolType.ADD_NODE) {
    trussStore.addNode(snappedX.value, snappedY.value)
    return
  }

  if (tool === ToolType.ADD_ELEMENT) {
    if (!uiStore.elementStartNodeId) {
      let nodeId = nearestNodeId.value
      if (!nodeId) {
        nodeId = trussStore.addNode(snappedX.value, snappedY.value).id
      }
      uiStore.elementStartNodeId = nodeId
      return
    }

    let endNodeId = nearestNodeId.value
    if (!endNodeId) {
      endNodeId = trussStore.addNode(snappedX.value, snappedY.value).id
    }

    if (endNodeId !== uiStore.elementStartNodeId) {
      const exists = trussStore.elements.some(
        (element) =>
          (element.startNodeId === uiStore.elementStartNodeId && element.endNodeId === endNodeId) ||
          (element.startNodeId === endNodeId && element.endNodeId === uiStore.elementStartNodeId),
      )
      if (!exists) {
        trussStore.addElement(uiStore.elementStartNodeId, endNodeId)
      }
    }

    uiStore.elementStartNodeId = null
    return
  }

  if (tool === ToolType.ADD_SUPPORT) {
    if (nearestNodeId.value) {
      uiStore.openSupportModal(nearestNodeId.value)
    } else {
      const hit = findElementAndProjection(rawX.value, rawY.value)
      if (hit) {
        const newNodeId = trussStore.splitElement(hit.elementId, hit.x, hit.y)
        if (newNodeId) {
          uiStore.openSupportModal(newNodeId)
        }
      }
    }
    return
  }

  if (tool === ToolType.ADD_LOAD) {
    if (nearestNodeId.value) {
      uiStore.openLoadModal({ kind: 'node', nodeId: nearestNodeId.value })
      return
    }

    const hit = findHoveredElementProjection(rawX.value, rawY.value)
    if (hit) {
      const start = trussStore.getNodeById(hit.element.startNodeId)
      const end = trussStore.getNodeById(hit.element.endNodeId)
      if (!start || !end) return

      const snapped = findNearestGridPointOnSegment(
        start.x, start.y,
        end.x, end.y,
        rawX.value, rawY.value,
      )
      if (!snapped) return

      if (snapped.t <= 0) {
        uiStore.openLoadModal({ kind: 'node', nodeId: hit.element.startNodeId })
      } else if (snapped.t >= 1) {
        uiStore.openLoadModal({ kind: 'node', nodeId: hit.element.endNodeId })
      } else {
        uiStore.openLoadModal({
          kind: 'element',
          elementId: hit.element.id,
          position: snapped.t,
        })
      }
    }
    return
  }

  if (nearestNodeId.value) {
    uiStore.selectNode(nearestNodeId.value)
    return
  }

  const clickedElementId = findElementNearPoint(snappedX.value, snappedY.value)
  if (clickedElementId) {
    uiStore.selectElement(clickedElementId)
  } else {
    uiStore.clearSelection()
  }
}

function findHoveredElementProjection(px: number, py: number): { element: TrussElement; x: number; y: number } | null {
  const threshold = ELEMENT_HIT_THRESHOLD / uiStore.zoom
  for (const element of trussStore.elements) {
    const start = trussStore.getNodeById(element.startNodeId)
    const end = trussStore.getNodeById(element.endNodeId)
    if (!start || !end) continue

    const distance = pointToLineDistance(px, py, start.x, start.y, end.x, end.y)
    if (distance < threshold) {
      const proj = projectPointOnLine(px, py, start.x, start.y, end.x, end.y)
      return { element, x: proj.x, y: proj.y }
    }
  }
  return null
}

function findElementAndProjection(px: number, py: number): { elementId: string; x: number; y: number } | null {
  const hit = findHoveredElementProjection(px, py)
  if (!hit) return null
  return { elementId: hit.element.id, x: hit.x, y: hit.y }
}

function findElementNearPoint(px: number, py: number): string | null {
  const threshold = ELEMENT_HIT_THRESHOLD / uiStore.zoom
  for (const element of trussStore.elements) {
    const start = trussStore.getNodeById(element.startNodeId)
    const end = trussStore.getNodeById(element.endNodeId)
    if (!start || !end) continue

    const distance = pointToLineDistance(px, py, start.x, start.y, end.x, end.y)
    if (distance < threshold) {
      return element.id
    }
  }
  return null
}

function projectPointOnLine(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): { x: number; y: number; t: number } {
  const dx = x2 - x1
  const dy = y2 - y1
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return { x: x1, y: y1, t: 0 }

  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  return { x: x1 + t * dx, y: y1 + t * dy, t }
}

function pointToLineDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const proj = projectPointOnLine(px, py, x1, y1, x2, y2)
  return Math.sqrt((px - proj.x) ** 2 + (py - proj.y) ** 2)
}
</script>

<template>
  <svg
    ref="svgRef"
    :viewBox="viewBox"
    class="w-full h-full select-none"
    :class="{ 'cursor-crosshair': showGhost, 'cursor-grab': uiStore.activeTool === 'SELECT' && !isPanning, 'cursor-grabbing': isPanning }"
    @mousemove="onMouseMove"
    @mousedown="onMouseDown"
    @mouseup="onMouseUp"
    @wheel.prevent="handleWheel"
    @contextmenu.prevent
  >
    <g class="grid-layer">
      <line
        v-for="(line, i) in minorGridLines"
        :key="`grid-minor-${i}`"
        :x1="line.x1"
        :y1="line.y1"
        :x2="line.x2"
        :y2="line.y2"
        :stroke="GRID_MINOR_COLOR"
        :stroke-width="GRID_LINE_WIDTH / uiStore.zoom"
      />
      <line
        v-for="(line, i) in majorGridLines"
        :key="`grid-major-${i}`"
        :x1="line.x1"
        :y1="line.y1"
        :x2="line.x2"
        :y2="line.y2"
        :stroke="GRID_MAJOR_COLOR"
        :stroke-width="GRID_MAJOR_LINE_WIDTH / uiStore.zoom"
      />
    </g>

    <g v-if="deformedElements.length > 0" class="deformations-layer">
      <line
        v-for="element in deformedElements"
        :key="`def-${element.id}`"
        :x1="element.x1"
        :y1="element.y1"
        :x2="element.x2"
        :y2="element.y2"
        :stroke="COLOR_GHOST"
        :stroke-width="ELEMENT_WIDTH / uiStore.zoom"
        stroke-linecap="round"
        stroke-dasharray="8"
        opacity="0.7"
      />
      <circle
        v-for="node in deformedNodes"
        :key="`def-node-${node.id}`"
        :cx="node.x"
        :cy="node.y"
        :r="NODE_RADIUS / uiStore.zoom"
        :fill="COLOR_GHOST"
        fill-opacity="0.4"
        :stroke="COLOR_GHOST"
        :stroke-width="1 / uiStore.zoom"
      />
    </g>

    <g class="elements-layer">
      <template v-for="element in trussStore.elements" :key="element.id">
        <line
          v-if="trussStore.getNodeById(element.startNodeId) && trussStore.getNodeById(element.endNodeId)"
          :x1="trussStore.getNodeById(element.startNodeId)!.x"
          :y1="trussStore.getNodeById(element.startNodeId)!.y"
          :x2="trussStore.getNodeById(element.endNodeId)!.x"
          :y2="trussStore.getNodeById(element.endNodeId)!.y"
          :stroke="getElementColor(element.id)"
          :stroke-width="getElementWidth(element.id) / uiStore.zoom"
          stroke-linecap="round"
          class="cursor-pointer"
        />
      </template>
    </g>

    <g v-if="trussStore.results" class="element-labels-layer">
      <text
        v-for="label in elementForceLabels"
        :key="`label-${label.elementId}`"
        :x="label.x"
        :y="label.y"
        :fill="label.color"
        :font-size="FONT_SIZE_ELEMENT_LABEL / uiStore.zoom"
        text-anchor="middle"
        font-weight="bold"
      >
        {{ label.axialForce.toFixed(2) }} kN
      </text>
    </g>

    <g class="supports-layer">
      <template v-for="support in trussStore.supports" :key="`sup-${support.nodeId}`">
        <template v-if="trussStore.getNodeById(support.nodeId)">
          <path
            :d="getSupportPath(trussStore.getNodeById(support.nodeId)!.x, trussStore.getNodeById(support.nodeId)!.y, support.type)"
            :fill="COLOR_SUPPORT"
            fill-opacity="0.3"
            :stroke="COLOR_SUPPORT"
            :stroke-width="1.5 / uiStore.zoom"
          />
          <circle
            v-for="(circle, circleIndex) in getRollerCircles(trussStore.getNodeById(support.nodeId)!.x, trussStore.getNodeById(support.nodeId)!.y, support.type)"
            :key="`roller-${support.nodeId}-${circleIndex}`"
            :cx="circle.cx"
            :cy="circle.cy"
            :r="circle.r / uiStore.zoom"
            :fill="COLOR_SUPPORT"
          />
          <line
            v-if="support.type === SupportType.FIXED"
            :x1="trussStore.getNodeById(support.nodeId)!.x - SUPPORT_SIZE / 2 - 3"
            :y1="trussStore.getNodeById(support.nodeId)!.y + SUPPORT_SIZE"
            :x2="trussStore.getNodeById(support.nodeId)!.x + SUPPORT_SIZE / 2 + 3"
            :y2="trussStore.getNodeById(support.nodeId)!.y + SUPPORT_SIZE"
            :stroke="COLOR_SUPPORT"
            :stroke-width="2 / uiStore.zoom"
          />
          <text
            :x="trussStore.getNodeById(support.nodeId)!.x"
            :y="getSupportLabelY(trussStore.getNodeById(support.nodeId)!.y, support.type)"
            :fill="COLOR_SUPPORT"
            :font-size="FONT_SIZE_SUPPORT_LABEL / uiStore.zoom"
            text-anchor="middle"
            class="support-label"
          >
            {{ getSupportLabel(support.type) }}
          </text>
        </template>
      </template>
    </g>

    <g class="loads-layer">
      <template v-for="load in loadArrows" :key="`load-${load.id}`">
        <line
          :x1="load.arrow.x1"
          :y1="load.arrow.y1"
          :x2="load.arrow.x2"
          :y2="load.arrow.y2"
          :stroke="COLOR_LOAD"
          :stroke-width="2 / uiStore.zoom"
        />
        <polygon :points="load.arrow.headPoints" :fill="COLOR_LOAD" />
        <text
          :x="load.arrow.x1"
          :y="load.arrow.y1 - 20 / uiStore.zoom"
          :fill="COLOR_LOAD"
          :font-size="FONT_SIZE_FORCE_LABEL / uiStore.zoom"
          text-anchor="middle"
        >
          {{ load.label }}
        </text>
      </template>
    </g>

    <g v-if="trussStore.results" class="reactions-layer">
      <template v-for="reaction in reactionArrows" :key="`react-${reaction.nodeId}`">
        <line
          :x1="reaction.arrow.x1"
          :y1="reaction.arrow.y1"
          :x2="reaction.arrow.x2"
          :y2="reaction.arrow.y2"
          :stroke="COLOR_REACTION"
          :stroke-width="2 / uiStore.zoom"
          stroke-dasharray="4"
        />
        <polygon :points="reaction.arrow.headPoints" :fill="COLOR_REACTION" />
        <text
          :x="reaction.arrow.x1"
          :y="reaction.arrow.y1 - 20 / uiStore.zoom"
          :fill="COLOR_REACTION"
          :font-size="FONT_SIZE_FORCE_LABEL / uiStore.zoom"
          text-anchor="middle"
          class="reaction-label"
        >
          {{ reaction.label }}
        </text>
      </template>
    </g>

    <g class="nodes-layer">
      <circle
        v-for="node in trussStore.nodes"
        :key="node.id"
        :cx="node.x"
        :cy="node.y"
        :r="NODE_RADIUS / uiStore.zoom"
        :fill="getNodeColor(node.id)"
        stroke="white"
        :stroke-width="1.5 / uiStore.zoom"
        class="cursor-pointer"
      />
    </g>

    <g v-if="showGhost" class="ghost-layer">
      <circle
        v-if="uiStore.activeTool !== ToolType.ADD_LOAD || !loadPreviewPoint"
        :cx="snappedX"
        :cy="snappedY"
        :r="NODE_RADIUS / uiStore.zoom"
        :fill="nearestNodeId ? COLOR_NODE : COLOR_GHOST"
        fill-opacity="0.5"
        :stroke="nearestNodeId ? COLOR_NODE : COLOR_GHOST"
        :stroke-width="1 / uiStore.zoom"
        stroke-dasharray="3"
      />
      <circle
        v-if="loadPreviewPoint"
        :cx="loadPreviewPoint.x"
        :cy="loadPreviewPoint.y"
        :r="NODE_RADIUS / uiStore.zoom"
        :fill="COLOR_LOAD"
        fill-opacity="0.5"
        :stroke="COLOR_LOAD"
        :stroke-width="1.5 / uiStore.zoom"
        stroke-dasharray="3"
      />
    </g>

    <line
      v-if="startNode"
      :x1="startNode.x"
      :y1="startNode.y"
      :x2="snappedX"
      :y2="snappedY"
      :stroke="COLOR_GHOST"
      :stroke-width="2 / uiStore.zoom"
      stroke-dasharray="5"
    />
    <text
      v-if="startNode && previewElementLength !== null"
      :x="(startNode.x + snappedX) / 2"
      :y="(startNode.y + snappedY) / 2 - 12 / uiStore.zoom"
      :fill="COLOR_GHOST"
      :font-size="FONT_SIZE_ELEMENT_LABEL / uiStore.zoom"
      text-anchor="middle"
      font-weight="bold"
    >
      {{ t('canvas.elementLength', { value: previewElementLength.toFixed(2) }) }}
    </text>
  </svg>
</template>
