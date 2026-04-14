import { useUiStore } from '@/stores/uiStore'
import { ZOOM_MIN, ZOOM_MAX, ZOOM_STEP } from '@/utils/constants'
import { ref } from 'vue'

export function useCanvasNavigation() {
  const uiStore = useUiStore()
  const isPanning = ref(false)
  const lastPanX = ref(0)
  const lastPanY = ref(0)

  function handleWheel(e: WheelEvent): void {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
    const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, uiStore.zoom + delta))
    uiStore.setZoom(newZoom)
  }

  function handleMouseDown(e: MouseEvent): void {
    // Middle mouse button or Shift+left click for panning
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      isPanning.value = true
      lastPanX.value = e.clientX
      lastPanY.value = e.clientY
      e.preventDefault()
    }
  }

  function handleMouseMove(e: MouseEvent): void {
    if (isPanning.value) {
      const dx = (e.clientX - lastPanX.value) / uiStore.zoom
      const dy = (e.clientY - lastPanY.value) / uiStore.zoom
      uiStore.setPan(uiStore.panOffset.x + dx, uiStore.panOffset.y + dy)
      lastPanX.value = e.clientX
      lastPanY.value = e.clientY
    }
  }

  function handleMouseUp(): void {
    isPanning.value = false
  }

  return {
    isPanning,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  }
}
