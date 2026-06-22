<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useTrussStore } from '@/stores/trussStore'
import { useUiStore } from '@/stores/uiStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { paToMpa } from '@/domain/physics/units'
import { X } from 'lucide-vue-next'

const { t } = useI18n()
const trussStore = useTrussStore()
const uiStore = useUiStore()

const results = computed(() => trussStore.results)

const elementResultsWithInfo = computed(() => {
  if (!results.value) return []
  return results.value.elementResults.map((er) => {
    const element = trussStore.elements.find((e) => e.id === er.elementId)
    const material = element
      ? trussStore.materials.find((m) => m.id === element.materialId)
      : null
    const yieldExceeded = material
      ? Math.abs(er.stress) > material.yieldStrength
      : false

    let status: string
    let statusColor: string
    if (er.axialForce > 0.001) {
      status = t('results.tension')
      statusColor = 'text-green-600'
    } else if (er.axialForce < -0.001) {
      status = t('results.compression')
      statusColor = 'text-red-600'
    } else {
      status = t('results.zero')
      statusColor = 'text-gray-500'
    }

    return {
      ...er,
      status,
      statusColor,
      stressMpa: paToMpa(er.stress),
      yieldExceeded,
    }
  })
})

const equilibrium = computed(() => {
  if (!results.value) return null

  let sumFx = 0
  let sumFy = 0
  for (const load of trussStore.loads) {
    sumFx += load.forceX
    sumFy += load.forceY
  }

  let sumRx = 0
  let sumRy = 0
  for (const reaction of results.value.reactions) {
    sumRx += reaction.forceX
    sumRy += reaction.forceY
  }

  return {
    appliedFx: sumFx,
    appliedFy: sumFy,
    reactionFx: sumRx,
    reactionFy: sumRy,
    balanceFx: sumFx + sumRx,
    balanceFy: sumFy + sumRy,
  }
})

function handleClear(): void {
  trussStore.clearResults()
}
</script>

<template>
  <div class="p-4 space-y-4" v-if="results">
    <div class="flex items-center justify-between">
      <h3 class="font-semibold text-sm">{{ t('results.title') }}</h3>
      <Button variant="ghost" size="sm" @click="handleClear">
        <X class="w-4 h-4 mr-1" />
        {{ t('results.clearResults') }}
      </Button>
    </div>

    <!-- Static determinacy -->
    <Badge :variant="trussStore.isStaticallyDeterminate ? 'secondary' : 'outline'">
      {{ trussStore.isStaticallyDeterminate ? t('results.staticallyDeterminate') : t('results.staticallyIndeterminate') }}
    </Badge>

    <label class="flex items-center gap-2 text-xs cursor-pointer">
      <input
        type="checkbox"
        :checked="uiStore.showDeformations"
        @change="uiStore.showDeformations = ($event.target as HTMLInputElement).checked"
        class="rounded"
      />
      {{ t('results.showDeformations') }}
    </label>

    <Separator />

    <!-- Axial Forces Table -->
    <div>
      <h4 class="text-xs font-semibold text-muted-foreground mb-2 uppercase">
        {{ t('results.axialForces') }}
      </h4>
      <div class="max-h-48 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="h-8 text-xs">{{ t('results.element') }}</TableHead>
              <TableHead class="h-8 text-xs">{{ t('results.force') }}</TableHead>
              <TableHead class="h-8 text-xs">{{ t('results.stress') }}</TableHead>
              <TableHead class="h-8 text-xs">{{ t('results.status') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="er in elementResultsWithInfo" :key="er.elementId">
              <TableCell class="py-1 text-xs font-mono">{{ er.elementId }}</TableCell>
              <TableCell class="py-1 text-xs font-mono">{{ er.axialForce.toFixed(2) }}</TableCell>
              <TableCell class="py-1 text-xs font-mono">{{ er.stressMpa.toFixed(1) }}</TableCell>
              <TableCell class="py-1 text-xs">
                <span :class="er.statusColor">{{ er.status }}</span>
                <Badge v-if="er.yieldExceeded" variant="destructive" class="ml-1 text-[10px] px-1">
                  {{ t('results.yieldExceeded') }}
                </Badge>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>

    <Separator />

    <!-- Reactions Table -->
    <div>
      <h4 class="text-xs font-semibold text-muted-foreground mb-2 uppercase">
        {{ t('results.reactions') }}
      </h4>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="h-8 text-xs">{{ t('results.node') }}</TableHead>
            <TableHead class="h-8 text-xs">{{ t('results.rx') }}</TableHead>
            <TableHead class="h-8 text-xs">{{ t('results.ry') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="r in results.reactions" :key="r.nodeId">
            <TableCell class="py-1 text-xs font-mono">{{ r.nodeId }}</TableCell>
            <TableCell class="py-1 text-xs font-mono">{{ r.forceX.toFixed(2) }}</TableCell>
            <TableCell class="py-1 text-xs font-mono">{{ r.forceY.toFixed(2) }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <Separator />

    <!-- Displacements Table -->
    <div>
      <h4 class="text-xs font-semibold text-muted-foreground mb-2 uppercase">
        {{ t('results.displacements') }}
      </h4>
      <div class="max-h-48 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="h-8 text-xs">{{ t('results.node') }}</TableHead>
              <TableHead class="h-8 text-xs">{{ t('results.dx') }}</TableHead>
              <TableHead class="h-8 text-xs">{{ t('results.dy') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="d in results.displacements" :key="d.nodeId">
              <TableCell class="py-1 text-xs font-mono">{{ d.nodeId }}</TableCell>
              <TableCell class="py-1 text-xs font-mono">{{ (d.dx * 1000).toFixed(4) }}</TableCell>
              <TableCell class="py-1 text-xs font-mono">{{ (d.dy * 1000).toFixed(4) }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>

    <Separator />

    <!-- Equilibrium Check -->
    <div v-if="equilibrium">
      <h4 class="text-xs font-semibold text-muted-foreground mb-2 uppercase">
        {{ t('results.equilibriumCheck') }}
      </h4>
      <div class="text-xs space-y-1">
        <div class="flex justify-between">
          <span class="text-muted-foreground">{{ t('results.sumForces') }} X:</span>
          <span class="font-mono">{{ equilibrium.appliedFx.toFixed(2) }} kN</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted-foreground">{{ t('results.sumForces') }} Y:</span>
          <span class="font-mono">{{ equilibrium.appliedFy.toFixed(2) }} kN</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted-foreground">{{ t('results.sumReactions') }} X:</span>
          <span class="font-mono">{{ equilibrium.reactionFx.toFixed(2) }} kN</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted-foreground">{{ t('results.sumReactions') }} Y:</span>
          <span class="font-mono">{{ equilibrium.reactionFy.toFixed(2) }} kN</span>
        </div>
        <Separator />
        <div class="flex justify-between font-semibold">
          <span>ΣFX:</span>
          <span class="font-mono" :class="Math.abs(equilibrium.balanceFx) < 0.01 ? 'text-green-600' : 'text-red-600'">
            {{ equilibrium.balanceFx.toFixed(4) }} kN
          </span>
        </div>
        <div class="flex justify-between font-semibold">
          <span>ΣFY:</span>
          <span class="font-mono" :class="Math.abs(equilibrium.balanceFy) < 0.01 ? 'text-green-600' : 'text-red-600'">
            {{ equilibrium.balanceFy.toFixed(4) }} kN
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
