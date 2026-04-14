<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useProjectsStore } from '@/stores/projectsStore'
import { useUiStore } from '@/stores/uiStore'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Upload, Copy, Pencil, Trash2, Check, X } from 'lucide-vue-next'

const { t } = useI18n()
const projectsStore = useProjectsStore()
const uiStore = useUiStore()

const editingId = ref<string | null>(null)
const editingName = ref('')
const newProjectName = ref('')
const deleteConfirmId = ref<string | null>(null)

function startRename(id: string, currentName: string): void {
  editingId.value = id
  editingName.value = currentName
}

function confirmRename(): void {
  if (editingId.value && editingName.value.trim()) {
    projectsStore.renameProject(editingId.value, editingName.value.trim())
  }
  editingId.value = null
  editingName.value = ''
}

function cancelRename(): void {
  editingId.value = null
  editingName.value = ''
}

function handleLoad(id: string): void {
  projectsStore.saveCurrentProject()
  projectsStore.loadProject(id)
  uiStore.closeProjectsModal()
}

function handleDelete(id: string): void {
  projectsStore.deleteProject(id)
  deleteConfirmId.value = null
}

function handleCreateNew(): void {
  const name = newProjectName.value.trim() || t('projects.defaultName')
  projectsStore.saveCurrentProject()
  projectsStore.createProject(name)
  newProjectName.value = ''
  uiStore.closeProjectsModal()
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pl-PL')
}
</script>

<template>
  <Dialog :open="uiStore.showProjectsModal" @update:open="(val: boolean) => { if (!val) uiStore.closeProjectsModal() }">
    <DialogContent class="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{{ t('projects.title') }}</DialogTitle>
        <DialogDescription>
          {{ t('projects.title') }}
        </DialogDescription>
      </DialogHeader>

      <!-- New project -->
      <div class="flex gap-2 mb-4">
        <Input
          v-model="newProjectName"
          :placeholder="t('projects.defaultName')"
          class="flex-1"
          @keyup.enter="handleCreateNew"
        />
        <Button @click="handleCreateNew" size="sm">
          <Plus class="w-4 h-4 mr-1" />
          {{ t('projects.newProject') }}
        </Button>
      </div>

      <!-- Projects list -->
      <div class="max-h-80 overflow-y-auto">
        <Table v-if="projectsStore.sortedProjects.length > 0">
          <TableHeader>
            <TableRow>
              <TableHead>{{ t('projects.name') }}</TableHead>
              <TableHead>{{ t('projects.lastModified') }}</TableHead>
              <TableHead class="text-right">{{ t('projects.actions') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="project in projectsStore.sortedProjects"
              :key="project.id"
              :class="{ 'bg-accent/50': project.id === projectsStore.currentProjectId }"
            >
              <TableCell>
                <div v-if="editingId === project.id" class="flex items-center gap-1">
                  <Input
                    v-model="editingName"
                    class="h-7 text-sm"
                    @keyup.enter="confirmRename"
                    @keyup.escape="cancelRename"
                  />
                  <Button variant="ghost" size="icon" class="h-7 w-7" @click="confirmRename">
                    <Check class="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" class="h-7 w-7" @click="cancelRename">
                    <X class="w-3 h-3" />
                  </Button>
                </div>
                <span v-else class="text-sm font-medium">{{ project.name }}</span>
              </TableCell>
              <TableCell class="text-sm text-muted-foreground">
                {{ formatDate(project.updatedAt) }}
              </TableCell>
              <TableCell class="text-right">
                <div v-if="deleteConfirmId === project.id" class="flex items-center justify-end gap-1">
                  <span class="text-xs text-destructive mr-1">{{ t('projects.deleteConfirm') }}?</span>
                  <Button variant="destructive" size="sm" @click="handleDelete(project.id)">
                    {{ t('projects.delete') }}
                  </Button>
                  <Button variant="ghost" size="sm" @click="deleteConfirmId = null">
                    <X class="w-3 h-3" />
                  </Button>
                </div>
                <div v-else class="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    class="h-7 w-7"
                    :disabled="project.id === projectsStore.currentProjectId"
                    @click="handleLoad(project.id)"
                  >
                    <Upload class="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" class="h-7 w-7" @click="startRename(project.id, project.name)">
                    <Pencil class="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" class="h-7 w-7" @click="projectsStore.duplicateProject(project.id)">
                    <Copy class="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" class="h-7 w-7 text-destructive" @click="deleteConfirmId = project.id">
                    <Trash2 class="w-3 h-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <p v-else class="text-sm text-muted-foreground text-center py-8">
          {{ t('projects.noProjects') }}
        </p>
      </div>
    </DialogContent>
  </Dialog>
</template>
