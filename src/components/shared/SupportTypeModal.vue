<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useTrussStore } from '@/stores/trussStore'
import { useUiStore } from '@/stores/uiStore'
import { SupportType } from '@/domain/models'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

const { t } = useI18n()
const trussStore = useTrussStore()
const uiStore = useUiStore()

const selectedType = ref<(typeof SupportType)[keyof typeof SupportType]>(SupportType.FIXED)

watch(() => uiStore.showSupportModal, (open) => {
  if (open && uiStore.modalTargetNodeId) {
    const existing = trussStore.getSupportByNodeId(uiStore.modalTargetNodeId)
    selectedType.value = existing?.type ?? SupportType.FIXED
  }
})

function handleAdd(): void {
  if (uiStore.modalTargetNodeId) {
    trussStore.addSupport(uiStore.modalTargetNodeId, selectedType.value)
  }
  uiStore.closeSupportModal()
}

function handleClose(): void {
  uiStore.closeSupportModal()
}
</script>

<template>
  <Dialog :open="uiStore.showSupportModal" @update:open="(v: boolean) => { if (!v) handleClose() }">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ t('support.title') }}</DialogTitle>
        <DialogDescription>{{ t('support.title') }}</DialogDescription>
      </DialogHeader>

      <RadioGroup v-model="selectedType" class="gap-4">
        <div class="flex items-center space-x-2">
          <RadioGroupItem :value="SupportType.FIXED" id="fixed" />
          <Label for="fixed">{{ t('support.fixed') }}</Label>
        </div>
        <div class="flex items-center space-x-2">
          <RadioGroupItem :value="SupportType.ROLLER_X" id="roller-x" />
          <Label for="roller-x">{{ t('support.rollerX') }}</Label>
        </div>
        <div class="flex items-center space-x-2">
          <RadioGroupItem :value="SupportType.ROLLER_Y" id="roller-y" />
          <Label for="roller-y">{{ t('support.rollerY') }}</Label>
        </div>
      </RadioGroup>

      <DialogFooter>
        <Button variant="outline" @click="handleClose">{{ t('common.cancel') }}</Button>
        <Button @click="handleAdd">{{ t('support.add') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
