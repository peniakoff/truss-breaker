import { watch, ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useTrussStore } from '@/stores/trussStore'
import { useProjectsStore } from '@/stores/projectsStore'

export function useAutoSave() {
  const trussStore = useTrussStore()
  const projectsStore = useProjectsStore()
  const saveStatus = ref<'saved' | 'unsaved' | 'saving'>('saved')

  const debouncedSave = useDebounceFn(() => {
    if (projectsStore.currentProjectId) {
      saveStatus.value = 'saving'
      projectsStore.saveCurrentProject()
      saveStatus.value = 'saved'
    }
  }, 2000)

  watch(
    () => [
      trussStore.nodes,
      trussStore.elements,
      trussStore.supports,
      trussStore.loads,
      trussStore.materials,
    ],
    () => {
      if (projectsStore.currentProjectId) {
        saveStatus.value = 'unsaved'
        debouncedSave()
      }
    },
    { deep: true },
  )

  return { saveStatus }
}
