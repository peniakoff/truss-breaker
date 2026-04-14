<script setup lang="ts">
import { computed, ref } from 'vue'
import { SupportType } from '@/domain/models'
import { useTrussStore } from '@/stores/trussStore'
import { useUiStore, ToolType } from '@/stores/uiStore'
import { useMouseGridSnap } from '@/composables/useMouseGridSnap'
import { useCanvasNavigation } from '@/composables/useCanvasNavigation'
import {
  GRID_SIZE,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GRID_COLOR,
  GRID_LINE_WIDTH,
  GRID_MAJOR_EVERY,
  GRID_MAJOR_COLOR,
  GRID_MAJOR_LINE_WIDTH,
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
  SUPPORT_SIZE,
  FORCE_ARROW_MIN_LENGTH,
  FORCE_ARROW_HEAD_SIZE,
  FORCE_ARROW_SCALE,
  COLOR_REACTION,
} from '@/utils/constants'

const trussStore = useTrussStore()
const uiStore = useUiStore()
const svgRef = ref<SVGSVGElement | null>(null)

const { snappedX, snappedY, nearestNodeId, handleMouseMove: snapMouseMove } = useMouseGridSnap()
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

const gridLines = computed(() => {
  const lines: { x1: number; y1: number; x2: number; y2: number; major: boolean }[] = []
  const extent = Math.max(CANVAS_WIDTH, CANVAS_HEIGHT) * 2

  for (let i = 0; i <= extent / GRID_SIZE; i++) {
    const pos = i * GRID_SIZE
    const major = i % GRID_MAJOR_EVERY === 0
    lines.push({ x1: pos, y1: 0, x2: pos, y2: extent, major })
    lines.push({ x1: 0, y1: pos, x2: extent, y2: pos, major })
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
      y: (startNode.y + endNode.y) / 2 - 8 / uiStore.zoom,
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
  if (Math.abs(fx) > 0.001) parts.push(`FX=${fx.toFixed(1)} kN`)
  if (Math.abs(fy) > 0.001) parts.push(`FY=${fy.toFixed(1)} kN`)
  return parts.join(', ')
}

const loadArrows = computed(() => {
  return trussStore.loads.flatMap((load) => {
    const node = trussStore.getNodeById(load.nodeId)
    if (!node) {
      return []
    }

    return [{
      nodeId: load.nodeId,
      label: forceLabel(load.forceX, load.forceY),
      arrow: getForceArrow(node.x, node.y, load.forceX, load.forceY),
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
      arrow: getForceArrow(node.x, node.y, reaction.forceX, reaction.forceY),
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
    }
    return
  }

  if (tool === ToolType.ADD_LOAD) {
    if (nearestNodeId.value) {
      uiStore.openLoadModal(nearestNodeId.value)
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

function findElementNearPoint(px: number, py: number): string | null {
  const threshold = 10 / uiStore.zoom
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

function pointToLineDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1
  const dy = y2 - y1
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2)

  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  const projX = x1 + t * dx
  const projY = y1 + t * dy
  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2)
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
        v-for="(line, i) in gridLines"
        :key="`grid-${i}`"
        :x1="line.x1"
        :y1="line.y1"
        :x2="line.x2"
        :y2="line.y2"
        :stroke="line.major ? GRID_MAJOR_COLOR : GRID_COLOR"
        :stroke-width="(line.major ? GRID_MAJOR_LINE_WIDTH : GRID_LINE_WIDTH) / uiStore.zoom"
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
        :font-size="11 / uiStore.zoom"
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
        </template>
      </template>
    </g>

    <g class="loads-layer">
      <template v-for="load in loadArrows" :key="`load-${load.nodeId}`">
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
          :y="load.arrow.y1 - 5 / uiStore.zoom"
          :fill="COLOR_LOAD"
          :font-size="10 / uiStore.zoom"
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
        :cx="snappedX"
        :cy="snappedY"
        :r="NODE_RADIUS / uiStore.zoom"
        :fill="nearestNodeId ? COLOR_NODE : COLOR_GHOST"
        fill-opacity="0.5"
        :stroke="nearestNodeId ? COLOR_NODE : COLOR_GHOST"
        :stroke-width="1 / uiStore.zoom"
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
  </svg>
</template>
