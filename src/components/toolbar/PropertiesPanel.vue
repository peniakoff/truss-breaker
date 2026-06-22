<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useTrussStore } from '@/stores/trussStore'
import { useUiStore } from '@/stores/uiStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Trash2 } from 'lucide-vue-next'
import { GRID_SIZE } from '@/utils/constants'
import { STEEL_PROFILES, type ProfileType } from '@/data/steelProfiles'
import type { CrossSection } from '@/domain/models'

const { t } = useI18n()
const trussStore = useTrussStore()
const uiStore = useUiStore()

const selectedNode = computed(() => {
  if (!uiStore.selectedNodeId) return null
  return trussStore.getNodeById(uiStore.selectedNodeId) ?? null
})

const selectedElement = computed(() => {
  if (!uiStore.selectedElementId) return null
  return trussStore.elements.find((el) => el.id === uiStore.selectedElementId) ?? null
})

const elementLength = computed(() => {
  if (!selectedElement.value) return 0
  const start = trussStore.getNodeById(selectedElement.value.startNodeId)
  const end = trussStore.getNodeById(selectedElement.value.endNodeId)
  if (!start || !end) return 0
  const dx = (end.x - start.x) / GRID_SIZE
  const dy = (end.y - start.y) / GRID_SIZE
  return Math.sqrt(dx * dx + dy * dy)
})

const elementAngle = computed(() => {
  if (!selectedElement.value) return 0
  const start = trussStore.getNodeById(selectedElement.value.startNodeId)
  const end = trussStore.getNodeById(selectedElement.value.endNodeId)
  if (!start || !end) return 0
  return (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI
})

const nodeSupport = computed(() => {
  if (!uiStore.selectedNodeId) return null
  return trussStore.getSupportByNodeId(uiStore.selectedNodeId) ?? null
})

const nodeLoad = computed(() => {
  if (!uiStore.selectedNodeId) return null
  return trussStore.getLoadByNodeId(uiStore.selectedNodeId) ?? null
})

const connectedElements = computed(() => {
  if (!uiStore.selectedNodeId) return []
  return trussStore.getElementsByNodeId(uiStore.selectedNodeId)
})

const elementMaterial = computed(() => {
  if (!selectedElement.value) return null
  return trussStore.materials.find((m) => m.id === selectedElement.value!.materialId) ?? null
})

function handleRemoveNode(): void {
  if (uiStore.selectedNodeId) {
    trussStore.removeNode(uiStore.selectedNodeId)
    uiStore.clearSelection()
  }
}

function handleRemoveElement(): void {
  if (uiStore.selectedElementId) {
    trussStore.removeElement(uiStore.selectedElementId)
    uiStore.clearSelection()
  }
}

function handleRemoveSupport(): void {
  if (uiStore.selectedNodeId) {
    trussStore.removeSupport(uiStore.selectedNodeId)
  }
}

const elementLoads = computed(() => {
  if (!uiStore.selectedElementId) return []
  return trussStore.getLoadsOnElement(uiStore.selectedElementId)
})

function handleRemoveLoad(): void {
  if (uiStore.selectedNodeId) {
    trussStore.removeLoadByNodeId(uiStore.selectedNodeId)
  }
}

function handleRemoveElementLoad(loadId: string): void {
  trussStore.removeLoadById(loadId)
}

function formatLoadPosition(position: number): string {
  return `${(position * 100).toFixed(0)}%`
}

const profileTypes: { value: ProfileType; labelKey: string }[] = [
  { value: 'custom', labelKey: 'properties.profileCustom' },
  { value: 'ipe', labelKey: 'properties.profileIpe' },
  { value: 'heb', labelKey: 'properties.profileHeb' },
  { value: 'pipe', labelKey: 'properties.profilePipe' },
]

const selectedProfileType = computed((): ProfileType => {
  return selectedElement.value?.crossSection.profileType ?? 'custom'
})

const availableProfiles = computed(() => {
  const type = selectedProfileType.value
  if (type === 'custom') return []
  return STEEL_PROFILES[type]
})

function updateCrossSection(updates: Partial<CrossSection>): void {
  if (!selectedElement.value) return
  trussStore.updateElement(selectedElement.value.id, {
    crossSection: {
      ...selectedElement.value.crossSection,
      ...updates,
    },
  })
}

function handleProfileTypeChange(e: Event): void {
  const type = (e.target as HTMLSelectElement).value as ProfileType
  if (type === 'custom') {
    updateCrossSection({ profileType: 'custom', profileName: undefined })
    return
  }
  const first = STEEL_PROFILES[type][0]
  if (first) {
    updateCrossSection({
      profileType: type,
      profileName: first.name,
      area: first.area,
    })
  }
}

function handleProfileNameChange(e: Event): void {
  const name = (e.target as HTMLSelectElement).value
  const type = selectedProfileType.value
  if (type === 'custom') return
  const profile = STEEL_PROFILES[type].find((p) => p.name === name)
  if (profile) {
    updateCrossSection({
      profileType: type,
      profileName: profile.name,
      area: profile.area,
    })
  }
}

function handleAreaChange(e: Event): void {
  const val = parseFloat((e.target as HTMLInputElement).value)
  if (!isNaN(val) && val > 0 && selectedElement.value) {
    updateCrossSection({
      area: val,
      profileType: 'custom',
      profileName: undefined,
    })
  }
}

function formatCoord(px: number): string {
  return (px / GRID_SIZE).toFixed(1)
}
</script>

<template>
  <div class="p-4 space-y-4">
    <h3 class="font-semibold text-sm">{{ t('properties.title') }}</h3>

    <!-- Node properties -->
    <template v-if="selectedNode">
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <Badge variant="secondary">{{ t('properties.node') }}: {{ selectedNode.id }}</Badge>
          <Button variant="ghost" size="icon" class="h-7 w-7 text-destructive" @click="handleRemoveNode">
            <Trash2 class="w-4 h-4" />
          </Button>
        </div>

        <div class="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span class="text-muted-foreground">X:</span>
            <span class="ml-1 font-mono">{{ formatCoord(selectedNode.x) }} m</span>
          </div>
          <div>
            <span class="text-muted-foreground">Y:</span>
            <span class="ml-1 font-mono">{{ formatCoord(selectedNode.y) }} m</span>
          </div>
        </div>

        <div class="text-sm text-muted-foreground">
          {{ t('properties.connectedElements') }}: {{ connectedElements.length }}
        </div>

        <!-- Support info -->
        <div v-if="nodeSupport" class="space-y-1">
          <Separator />
          <div class="flex items-center justify-between">
            <Badge variant="outline">{{ t('properties.support') }}: {{ nodeSupport.type }}</Badge>
            <Button variant="ghost" size="sm" class="text-destructive" @click="handleRemoveSupport">
              {{ t('common.remove') }}
            </Button>
          </div>
        </div>

        <!-- Load info -->
        <div v-if="nodeLoad" class="space-y-1">
          <Separator />
          <div class="flex items-center justify-between">
            <Badge variant="outline">{{ t('properties.load') }}</Badge>
            <Button variant="ghost" size="sm" class="text-destructive" @click="handleRemoveLoad">
              {{ t('common.remove') }}
            </Button>
          </div>
          <div class="grid grid-cols-2 gap-2 text-sm font-mono">
            <span>FX: {{ nodeLoad.forceX }} kN</span>
            <span>FY: {{ nodeLoad.forceY }} kN</span>
          </div>
        </div>
      </div>
    </template>

    <!-- Element properties -->
    <template v-else-if="selectedElement">
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <Badge variant="secondary">{{ t('properties.element') }}: {{ selectedElement.id }}</Badge>
          <Button variant="ghost" size="icon" class="h-7 w-7 text-destructive" @click="handleRemoveElement">
            <Trash2 class="w-4 h-4" />
          </Button>
        </div>

        <div class="space-y-2 text-sm">
          <div>
            <span class="text-muted-foreground">{{ t('properties.length') }}:</span>
            <span class="ml-1 font-mono">{{ elementLength.toFixed(2) }} m</span>
          </div>
          <div>
            <span class="text-muted-foreground">{{ t('properties.angle') }}:</span>
            <span class="ml-1 font-mono">{{ elementAngle.toFixed(1) }}°</span>
          </div>
        </div>

        <Separator />

        <!-- Material -->
        <div class="space-y-2">
          <Label class="text-xs">{{ t('properties.material') }}</Label>
          <div class="text-sm font-mono">
            {{ elementMaterial?.name ?? 'N/A' }}
          </div>
          <div class="text-xs text-muted-foreground">
            E = {{ elementMaterial ? (elementMaterial.youngModulus / 1e9).toFixed(0) : 'N/A' }} GPa
          </div>
        </div>

        <Separator />

        <!-- Cross section -->
        <div class="space-y-2">
          <Label class="text-xs">{{ t('properties.profileType') }}</Label>
          <select
            class="w-full h-8 text-sm rounded-md border border-input bg-background px-2"
            :value="selectedProfileType"
            @change="handleProfileTypeChange"
          >
            <option v-for="pt in profileTypes" :key="pt.value" :value="pt.value">
              {{ t(pt.labelKey) }}
            </option>
          </select>

          <template v-if="selectedProfileType !== 'custom'">
            <Label class="text-xs">{{ t('properties.selectProfile') }}</Label>
            <select
              class="w-full h-8 text-sm rounded-md border border-input bg-background px-2"
              :value="selectedElement.crossSection.profileName ?? ''"
              @change="handleProfileNameChange"
            >
              <option v-for="profile in availableProfiles" :key="profile.name" :value="profile.name">
                {{ profile.name }}
              </option>
            </select>
          </template>

          <Label for="area" class="text-xs">{{ t('properties.area') }} (m²)</Label>
          <Input
            id="area"
            type="number"
            step="0.0001"
            :model-value="selectedElement.crossSection.area"
            :disabled="selectedProfileType !== 'custom'"
            @change="handleAreaChange"
            class="h-8 text-sm"
          />
        </div>

        <div v-if="elementLoads.length > 0" class="space-y-2">
          <Separator />
          <Label class="text-xs">{{ t('properties.loadsOnElement') }}</Label>
          <div
            v-for="load in elementLoads"
            :key="load.id"
            class="flex items-center justify-between text-sm"
          >
            <div class="font-mono text-xs space-y-0.5">
              <div>{{ formatLoadPosition(load.position ?? 0) }}</div>
              <div>FX: {{ load.forceX }} kN, FY: {{ load.forceY }} kN</div>
            </div>
            <Button variant="ghost" size="sm" class="text-destructive" @click="handleRemoveElementLoad(load.id)">
              {{ t('common.remove') }}
            </Button>
          </div>
        </div>
      </div>
    </template>

    <!-- No selection -->
    <template v-else>
      <p class="text-sm text-muted-foreground">{{ t('properties.selectElement') }}</p>
    </template>
  </div>
</template>
