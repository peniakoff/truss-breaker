import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ZOOM_MAX, ZOOM_MIN } from '@/utils/constants'

export const ToolType = {
  SELECT: 'SELECT',
  ADD_NODE: 'ADD_NODE',
  ADD_ELEMENT: 'ADD_ELEMENT',
  ADD_SUPPORT: 'ADD_SUPPORT',
  ADD_LOAD: 'ADD_LOAD',
} as const

export type ToolType = (typeof ToolType)[keyof typeof ToolType]

export const useUiStore = defineStore('ui', () => {
  const activeTool = ref<ToolType>(ToolType.SELECT)
  const selectedNodeId = ref<string | null>(null)
  const selectedElementId = ref<string | null>(null)
  const showResultsPanel = ref(false)
  const zoom = ref(1)
  const panOffset = ref({ x: 0, y: 0 })

  // For element tool: tracking the first node of an element being drawn
  const elementStartNodeId = ref<string | null>(null)

  // Modal states
  const showSupportModal = ref(false)
  const showLoadModal = ref(false)
  const showProjectsModal = ref(false)
  const showDeformations = ref(true)
  const exportError = ref<string | null>(null)
  const modalTargetNodeId = ref<string | null>(null)

  function setTool(tool: ToolType): void {
    activeTool.value = tool
    elementStartNodeId.value = null
  }

  function selectNode(id: string): void {
    selectedNodeId.value = id
    selectedElementId.value = null
  }

  function selectElement(id: string): void {
    selectedElementId.value = id
    selectedNodeId.value = null
  }

  function clearSelection(): void {
    selectedNodeId.value = null
    selectedElementId.value = null
  }

  function toggleResults(): void {
    showResultsPanel.value = !showResultsPanel.value
  }

  function setZoom(newZoom: number): void {
    zoom.value = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom))
  }

  function setPan(x: number, y: number): void {
    panOffset.value = { x, y }
  }

  function openSupportModal(nodeId: string): void {
    modalTargetNodeId.value = nodeId
    showSupportModal.value = true
  }

  function closeSupportModal(): void {
    showSupportModal.value = false
    modalTargetNodeId.value = null
  }

  function openLoadModal(nodeId: string): void {
    modalTargetNodeId.value = nodeId
    showLoadModal.value = true
  }

  function closeLoadModal(): void {
    showLoadModal.value = false
    modalTargetNodeId.value = null
  }

  function openProjectsModal(): void {
    showProjectsModal.value = true
  }

  function closeProjectsModal(): void {
    showProjectsModal.value = false
  }

  function setExportError(message: string | null): void {
    exportError.value = message
  }

  return {
    // State
    activeTool,
    selectedNodeId,
    selectedElementId,
    showResultsPanel,
    zoom,
    panOffset,
    elementStartNodeId,
    showSupportModal,
    showLoadModal,
    showProjectsModal,
    showDeformations,
    exportError,
    modalTargetNodeId,
    // Actions
    setTool,
    selectNode,
    selectElement,
    clearSelection,
    toggleResults,
    setZoom,
    setPan,
    openSupportModal,
    closeSupportModal,
    openLoadModal,
    closeLoadModal,
    openProjectsModal,
    closeProjectsModal,
    setExportError,
  }
})
