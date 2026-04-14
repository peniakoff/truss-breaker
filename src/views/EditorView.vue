<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import GridCanvas from '@/components/workspace/GridCanvas.vue'
import PropertiesPanel from '@/components/toolbar/PropertiesPanel.vue'
import { useI18n } from '@/composables/useI18n'
import { useAutoSave } from '@/composables/useAutoSave'
import { useTrussStore } from '@/stores/trussStore'
import { useUiStore, ToolType } from '@/stores/uiStore'
import { useProjectsStore } from '@/stores/projectsStore'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  MousePointer2,
  Circle,
  Minus,
  Triangle,
  ArrowDown,
  Save,
  FolderOpen,
  Trash2,
  Calculator,
} from 'lucide-vue-next'

const { t } = useI18n()
const trussStore = useTrussStore()
const uiStore = useUiStore()
const projectsStore = useProjectsStore()
const { saveStatus } = useAutoSave()

const projectName = computed({
  get: () => projectsStore.currentProject?.name ?? '',
  set: (val: string) => {
    if (projectsStore.currentProjectId) {
      projectsStore.renameProject(projectsStore.currentProjectId, val)
    }
  },
})

const tools = [
  { type: ToolType.SELECT, icon: MousePointer2, labelKey: 'tools.select', shortcutKey: 'toolShortcuts.select' },
  { type: ToolType.ADD_NODE, icon: Circle, labelKey: 'tools.addNode', shortcutKey: 'toolShortcuts.addNode' },
  { type: ToolType.ADD_ELEMENT, icon: Minus, labelKey: 'tools.addElement', shortcutKey: 'toolShortcuts.addElement' },
  { type: ToolType.ADD_SUPPORT, icon: Triangle, labelKey: 'tools.addSupport', shortcutKey: 'toolShortcuts.addSupport' },
  { type: ToolType.ADD_LOAD, icon: ArrowDown, labelKey: 'tools.addLoad', shortcutKey: 'toolShortcuts.addLoad' },
]

const saveStatusLabel = computed(() => {
  switch (saveStatus.value) {
    case 'saved': return t('header.saved')
    case 'unsaved': return t('header.unsaved')
    case 'saving': return t('header.saving')
    default: return ''
  }
})

const saveStatusVariant = computed(() => {
  switch (saveStatus.value) {
    case 'saved': return 'secondary' as const
    case 'unsaved': return 'outline' as const
    case 'saving': return 'outline' as const
    default: return 'secondary' as const
  }
})

function handleSave(): void {
  projectsStore.saveCurrentProject()
}

function handleClear(): void {
  trussStore.clearAll()
}

function handleKeyDown(e: KeyboardEvent): void {
  // Ctrl+S — save
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault()
    handleSave()
    return
  }

  // Don't intercept shortcuts when typing in inputs
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    return
  }

  switch (e.key.toLowerCase()) {
    case 'v': uiStore.setTool(ToolType.SELECT); break
    case 'n': uiStore.setTool(ToolType.ADD_NODE); break
    case 'e': uiStore.setTool(ToolType.ADD_ELEMENT); break
    case 's': uiStore.setTool(ToolType.ADD_SUPPORT); break
    case 'f': uiStore.setTool(ToolType.ADD_LOAD); break
    case 'delete':
    case 'backspace':
      if (uiStore.selectedNodeId) {
        trussStore.removeNode(uiStore.selectedNodeId)
        uiStore.clearSelection()
      } else if (uiStore.selectedElementId) {
        trussStore.removeElement(uiStore.selectedElementId)
        uiStore.clearSelection()
      }
      break
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <TooltipProvider>
    <div class="flex flex-col h-screen w-screen overflow-hidden bg-background">
      <!-- Header -->
      <header class="flex items-center justify-between h-12 px-4 border-b bg-card shrink-0">
        <div class="flex items-center gap-3">
          <span class="font-bold text-lg text-primary">{{ t('app.name') }}</span>
          <Separator orientation="vertical" class="h-6" />
          <input
            :value="projectName"
            @input="projectName = ($event.target as HTMLInputElement).value"
            type="text"
            class="bg-transparent border-none text-sm font-medium focus:outline-none focus:ring-1 focus:ring-ring rounded px-2 py-1 w-48"
          />
          <Badge :variant="saveStatusVariant" class="text-xs">
            {{ saveStatusLabel }}
          </Badge>
        </div>
        <div class="flex items-center gap-2">
          <Button variant="ghost" size="sm" @click="handleSave">
            <Save class="w-4 h-4 mr-1" />
            {{ t('header.save') }}
          </Button>
          <Button variant="ghost" size="sm" @click="uiStore.openProjectsModal()">
            <FolderOpen class="w-4 h-4 mr-1" />
            {{ t('header.projects') }}
          </Button>
          <Button variant="ghost" size="sm" @click="handleClear">
            <Trash2 class="w-4 h-4 mr-1" />
            {{ t('header.clearCanvas') }}
          </Button>
          <Separator orientation="vertical" class="h-6" />
          <Button variant="default" size="sm" class="bg-green-600 hover:bg-green-700 text-white">
            <Calculator class="w-4 h-4 mr-1" />
            {{ t('header.calculate') }}
          </Button>
        </div>
      </header>

      <div class="flex flex-1 overflow-hidden">
        <!-- Left Sidebar / Toolbar -->
        <aside class="flex flex-col w-12 border-r bg-card shrink-0 py-2 gap-1 items-center">
          <template v-for="tool in tools" :key="tool.type">
            <Tooltip>
              <TooltipTrigger as-child>
                <Button
                  variant="ghost"
                  size="icon"
                  class="w-9 h-9"
                  :class="{ 'bg-accent text-accent-foreground': uiStore.activeTool === tool.type }"
                  @click="uiStore.setTool(tool.type)"
                >
                  <component :is="tool.icon" class="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{{ t(tool.labelKey) }} ({{ t(tool.shortcutKey) }})</p>
              </TooltipContent>
            </Tooltip>
          </template>
        </aside>

        <!-- Center Canvas -->
        <main class="flex-1 overflow-hidden bg-white relative">
          <GridCanvas />
        </main>

        <!-- Right Sidebar -->
        <aside class="w-72 border-l bg-card shrink-0 overflow-y-auto">
          <PropertiesPanel />
        </aside>
      </div>
    </div>
  </TooltipProvider>
</template>
