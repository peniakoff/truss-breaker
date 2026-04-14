<script setup lang="ts">
import { ref, computed } from 'vue'
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
const { isPanning, handleWheel, handleMouseDown: navMouseDown, handleMouseMove: navMouseMove, handleMouseUp: navMouseUp } = useCanvasNavigation()

const viewBox = computed(() => {
  const x = -uiStore.panOffset.x
  const y = -uiStore.panOffset.y
  const w = CANVAS_WIDTH / uiStore.zoom
  const h = CANVAS_HEIGHT / uiStore.zoom
  return `${x} ${y} ${w} ${h}`
})

// Grid lines
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

// Element rendering with result colors
function getElementColor(elementId: string): string {
  if (uiStore.selectedElementId === elementId) return COLOR_ELEMENT_SELECTED
  if (trussStore.results) {
    const result = trussStore.results.elementResults.find((r) => r.elementId === elementId)
    if (result) {
      if (result.axialForce > 0.001) return COLOR_TENSION
      if (result.axialForce < -0.001) return COLOR_COMPRESSION
      return COLOR_NEUTRAL
    }
  }
  return COLOR_ELEMENT_DEFAULT
}

function getElementWidth(elementId: string): number {
  if (uiStore.selectedElementId === elementId) return ELEMENT_WIDTH + 2
  return ELEMENT_WIDTH
}

// Support path generator
function getSupportPath(x: number, y: number, type: string): string {
  const s = SUPPORT_SIZE
  if (type === 'FIXED') {
    return `M ${x} ${y} L ${x - s / 2} ${y + s} L ${x + s / 2} ${y + s} Z`
  } else if (type === 'ROLLER_Y') {
    return `M ${x} ${y} L ${x - s / 2} ${y + s * 0.7} L ${x + s / 2} ${y + s * 0.7} Z`
  } else {
    return `M ${x} ${y} L ${x - s / 2} ${y + s * 0.7} L ${x + s / 2} ${y + s * 0.7} Z`
  }
}

function getRollerCircles(x: number, y: number, type: string): { cx: number; cy: number; r: number }[] {
  const s = SUPPORT_SIZE
  if (type === 'ROLLER_X' || type === 'ROLLER_Y') {
    const baseY = y + s * 0.7 + 4
    return [
      { cx: x - s / 4, cy: baseY, r: 3 },
      { cx: x + s / 4, cy: baseY, r: 3 },
    ]
  }
  return []
}

// Force arrow computation
function getForceArrow(nodeX: number, nodeY: number, fx: number, fy: number): {
  x1: number; y1: number; x2: number; y2: number;
  headPoints: string;
} {
  const mag = Math.sqrt(fx * fx + fy * fy)
  if (mag === 0) return { x1: nodeX, y1: nodeY, x2: nodeX, y2: nodeY, headPoints: '' }

  const len = Math.max(mag * FORCE_ARROW_SCALE * GRID_SIZE, FORCE_ARROW_MIN_LENGTH)
  const dirX = fx / mag
  const dirY = fy / mag

  const x2 = nodeX
  const y2 = nodeY
  const x1 = nodeX - dirX * len
  const y1 = nodeY - dirY * len

  const headSize = FORCE_ARROW_HEAD_SIZE
  const perpX = -dirY
  const perpY = dirX
  const tipX = x2
  const tipY = y2
  const baseX = tipX - dirX * headSize
  const baseY = tipY - dirY * headSize
  const headPoints = `${tipX},${tipY} ${baseX + perpX * headSize / 2},${baseY + perpY * headSize / 2} ${baseX - perpX * headSize / 2},${baseY - perpY * headSize / 2}`

  return { x1, y1, x2, y2, headPoints }
}

// Node color
function getNodeColor(nodeId: string): string {
  return uiStore.selectedNodeId === nodeId ? COLOR_NODE_SELECTED : COLOR_NODE
}

// Show ghost cursor?
const showGhost = computed(() => {
  const ghostTools: string[] = [ToolType.ADD_NODE, ToolType.ADD_ELEMENT, ToolType.ADD_SUPPORT, ToolType.ADD_LOAD]
  return ghostTools.includes(uiStore.activeTool)
})

// In-progress element line
const startNode = computed(() => {
  if (!uiStore.elementStartNodeId) return null
  return trussStore.getNodeById(uiStore.elementStartNodeId) ?? null
})

// Event handlers
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
  navMouseUp()
  if (isPanning.value) return
  if (e.button !== 0 || e.shiftKey) return

  handleToolClick()
}

function handleToolClick(): void {
  const tool = uiStore.activeTool

  if (tool === ToolType.ADD_NODE) {
    trussStore.addNode(snappedX.value, snappedY.value)
  } else if (tool === ToolType.ADD_ELEMENT) {
    if (!uiStore.elementStartNodeId) {
      let nodeId = nearestNodeId.value
      if (!nodeId) {
        const newNode = trussStore.addNode(snappedX.value, snappedY.value)
        nodeId = newNode.id
      }
      uiStore.elementStartNodeId = nodeId
    } else {
      let endNodeId = nearestNodeId.value
      if (!endNodeId) {
        const newNode = trussStore.addNode(snappedX.value, snappedY.value)
        endNodeId = newNode.id
      }
      if (endNodeId !== uiStore.elementStartNodeId) {
        const exists = trussStore.elements.some(
          (el) =>
            (el.startNodeId === uiStore.elementStartNodeId && el.endNodeId === endNodeId) ||
            (el.startNodeId === endNodeId && el.endNodeId === uiStore.elementStartNodeId),
        )
        if (!exists) {
          trussStore.addElement(uiStore.elementStartNodeId!, endNodeId)
        }
      }
      uiStore.elementStartNodeId = null
    }
  } else if (tool === ToolType.ADD_SUPPORT) {
    if (nearestNodeId.value) {
      uiStore.openSupportModal(nearestNodeId.value)
    }
  } else if (tool === ToolType.ADD_LOAD) {
    if (nearestNodeId.value) {
      uiStore.openLoadModal(nearestNodeId.value)
    }
  } else if (tool === ToolType.SELECT) {
    if (nearestNodeId.value) {
      uiStore.selectNode(nearestNodeId.value)
    } else {
      const clickedElementId = findElementNearPoint(snappedX.value, snappedY.value)
      if (clickedElementId) {
        uiStore.selectElement(clickedElementId)
      } else {
        uiStore.clearSelection()
      }
    }
  }
}

function findElementNearPoint(px: number, py: number): string | null {
  const threshold = 10 / uiStore.zoom
  for (const element of trussStore.elements) {
    const sn = trussStore.getNodeById(element.startNodeId)
    const en = trussStore.getNodeById(element.endNodeId)
    if (!sn || !en) continue

    const dist = pointToLineDistance(px, py, sn.x, sn.y, en.x, en.y)
    if (dist < threshold) return element.id
  }
  return null
}

function pointToLineDistance(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number,
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

// Force label text
function forceLabel(fx: number, fy: number): string {
  const parts: string[] = []
  if (Math.abs(fx) > 0.001) parts.push(`FX=${fx.toFixed(1)} kN`)
  if (Math.abs(fy) > 0.001) parts.push(`FY=${fy.toFixed(1)} kN`)
  return parts.join(', ')
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
    <!-- Grid lines -->
    <g class="grid-layer">
      <line
        v-for="(line, i) in gridLines"
        :key="'grid-' + i"
        :x1="line.x1"
        :y1="line.y1"
        :x2="line.x2"
        :y2="line.y2"
        :stroke="line.major ? GRID_MAJOR_COLOR : GRID_COLOR"
        :stroke-width="(line.major ? GRID_MAJOR_LINE_WIDTH : GRID_LINE_WIDTH) / uiStore.zoom"
      />
    </g>

    <!-- Elements (bars) -->
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

    <!-- Element force labels (when results exist) -->
    <g v-if="trussStore.results" class="element-labels-layer">
      <template v-for="result in trussStore.results.elementResults" :key="'label-' + result.elementId">
        <template v-if="(() => { const el = trussStore.elements.find(e => e.id === result.elementId); if (!el) return false; const sn = trussStore.getNodeById(el.startNodeId); const en = trussStore.getNodeById(el.endNodeId); return sn && en })()">
          <text
            :x="(() => { const el = trussStore.elements.find(e => e.id === result.elementId)!; const sn = trussStore.getNodeById(el.startNodeId)!; const en = trussStore.getNodeById(el.endNodeId)!; return (sn.x + en.x) / 2 })()"
            :y="(() => { const el = trussStore.elements.find(e => e.id === result.elementId)!; const sn = trussStore.getNodeById(el.startNodeId)!; const en = trussStore.getNodeById(el.endNodeId)!; return (sn.y + en.y) / 2 - 8 / uiStore.zoom })()"
            :fill="result.axialForce > 0.001 ? COLOR_TENSION : result.axialForce < -0.001 ? COLOR_COMPRESSION : COLOR_NEUTRAL"
            :font-size="11 / uiStore.zoom"
            text-anchor="middle"
            font-weight="bold"
          >
            {{ result.axialForce.toFixed(2) }} kN
          </text>
        </template>
      </template>
    </g>

    <!-- Supports -->
    <g class="supports-layer">
      <template v-for="support in trussStore.supports" :key="'sup-' + support.nodeId">
        <template v-if="trussStore.getNodeById(support.nodeId)">
          <path
            :d="getSupportPath(trussStore.getNodeById(support.nodeId)!.x, trussStore.getNodeById(support.nodeId)!.y, support.type)"
            :fill="COLOR_SUPPORT"
            fill-opacity="0.3"
            :stroke="COLOR_SUPPORT"
            :stroke-width="1.5 / uiStore.zoom"
          />
          <!-- Roller circles -->
          <circle
            v-for="(circ, ci) in getRollerCircles(trussStore.getNodeById(support.nodeId)!.x, trussStore.getNodeById(support.nodeId)!.y, support.type)"
            :key="'roller-' + support.nodeId + '-' + ci"
            :cx="circ.cx"
            :cy="circ.cy"
            :r="circ.r / uiStore.zoom"
            :fill="COLOR_SUPPORT"
          />
          <!-- Ground line for fixed support -->
          <line
            v-if="support.type === 'FIXED'"
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

    <!-- Applied loads (forces) -->
    <g class="loads-layer">
      <template v-for="load in trussStore.loads" :key="'load-' + load.nodeId">
        <template v-if="trussStore.getNodeById(load.nodeId)">
          <line
            :x1="getForceArrow(trussStore.getNodeById(load.nodeId)!.x, trussStore.getNodeById(load.nodeId)!.y, load.forceX, load.forceY).x1"
            :y1="getForceArrow(trussStore.getNodeById(load.nodeId)!.x, trussStore.getNodeById(load.nodeId)!.y, load.forceX, load.forceY).y1"
            :x2="getForceArrow(trussStore.getNodeById(load.nodeId)!.x, trussStore.getNodeById(load.nodeId)!.y, load.forceX, load.forceY).x2"
            :y2="getForceArrow(trussStore.getNodeById(load.nodeId)!.x, trussStore.getNodeById(load.nodeId)!.y, load.forceX, load.forceY).y2"
            :stroke="COLOR_LOAD"
            :stroke-width="2 / uiStore.zoom"
          />
          <polygon
            :points="getForceArrow(trussStore.getNodeById(load.nodeId)!.x, trussStore.getNodeById(load.nodeId)!.y, load.forceX, load.forceY).headPoints"
            :fill="COLOR_LOAD"
          />
          <text
            :x="getForceArrow(trussStore.getNodeById(load.nodeId)!.x, trussStore.getNodeById(load.nodeId)!.y, load.forceX, load.forceY).x1"
            :y="getForceArrow(trussStore.getNodeById(load.nodeId)!.x, trussStore.getNodeById(load.nodeId)!.y, load.forceX, load.forceY).y1 - 5 / uiStore.zoom"
            :fill="COLOR_LOAD"
            :font-size="10 / uiStore.zoom"
            text-anchor="middle"
          >
            {{ forceLabel(load.forceX, load.forceY) }}
          </text>
        </template>
      </template>
    </g>

    <!-- Reaction arrows (when results exist) -->
    <g v-if="trussStore.results" class="reactions-layer">
      <template v-for="reaction in trussStore.results.reactions" :key="'react-' + reaction.nodeId">
        <template v-if="trussStore.getNodeById(reaction.nodeId)">
          <line
            :x1="getForceArrow(trussStore.getNodeById(reaction.nodeId)!.x, trussStore.getNodeById(reaction.nodeId)!.y, reaction.forceX, reaction.forceY).x1"
            :y1="getForceArrow(trussStore.getNodeById(reaction.nodeId)!.x, trussStore.getNodeById(reaction.nodeId)!.y, reaction.forceX, reaction.forceY).y1"
            :x2="getForceArrow(trussStore.getNodeById(reaction.nodeId)!.x, trussStore.getNodeById(reaction.nodeId)!.y, reaction.forceX, reaction.forceY).x2"
            :y2="getForceArrow(trussStore.getNodeById(reaction.nodeId)!.x, trussStore.getNodeById(reaction.nodeId)!.y, reaction.forceX, reaction.forceY).y2"
            :stroke="COLOR_REACTION"
            :stroke-width="2 / uiStore.zoom"
            stroke-dasharray="4"
          />
          <polygon
            :points="getForceArrow(trussStore.getNodeById(reaction.nodeId)!.x, trussStore.getNodeById(reaction.nodeId)!.y, reaction.forceX, reaction.forceY).headPoints"
            :fill="COLOR_REACTION"
          />
        </template>
      </template>
    </g>

    <!-- Nodes -->
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

    <!-- Ghost cursor -->
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

    <!-- In-progress element line -->
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
