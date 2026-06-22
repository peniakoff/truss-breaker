<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useTrussStore } from '@/stores/trussStore'
import { useUiStore } from '@/stores/uiStore'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const { t } = useI18n()
const trussStore = useTrussStore()
const uiStore = useUiStore()

const forceX = ref(0)
const forceY = ref(-10)
const error = ref('')

watch(() => uiStore.showLoadModal, (open) => {
  if (open && uiStore.modalTargetNodeId) {
    const existing = trussStore.getLoadByNodeId(uiStore.modalTargetNodeId)
    if (existing) {
      forceX.value = existing.forceX
      forceY.value = existing.forceY
    } else {
      forceX.value = 0
      forceY.value = -10
    }
    error.value = ''
  }
})

function handleAdd(): void {
  const fx = Number(forceX.value)
  const fy = Number(forceY.value)

  if (!Number.isFinite(fx) || !Number.isFinite(fy)) {
    error.value = t('load.invalidNumber')
    return
  }
  if (fx === 0 && fy === 0) {
    error.value = t('load.validation')
    return
  }

  if (uiStore.modalTargetNodeId) {
    trussStore.addLoad(uiStore.modalTargetNodeId, fx, fy)
  }
  uiStore.closeLoadModal()
}

function handleClose(): void {
  uiStore.closeLoadModal()
}
</script>

<template>
  <Dialog :open="uiStore.showLoadModal" @update:open="(v: boolean) => { if (!v) handleClose() }">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ t('load.title') }}</DialogTitle>
        <DialogDescription>{{ t('load.title') }}</DialogDescription>
      </DialogHeader>

      <div class="grid gap-4">
        <div class="grid gap-2">
          <Label for="force-x">{{ t('load.forceX') }}</Label>
          <Input
            id="force-x"
            v-model="forceX"
            type="number"
            step="0.1"
          />
        </div>
        <div class="grid gap-2">
          <Label for="force-y">{{ t('load.forceY') }}</Label>
          <Input
            id="force-y"
            v-model="forceY"
            type="number"
            step="0.1"
          />
        </div>
        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="handleClose">{{ t('common.cancel') }}</Button>
        <Button @click="handleAdd">{{ t('load.add') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
