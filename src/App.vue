<script setup lang="ts">
import { onMounted } from 'vue'
import { useProjectsStore } from '@/stores/projectsStore'
import EditorView from '@/views/EditorView.vue'
import ProjectManagerModal from '@/components/shared/ProjectManagerModal.vue'
import SupportTypeModal from '@/components/shared/SupportTypeModal.vue'
import LoadInputModal from '@/components/shared/LoadInputModal.vue'

const projectsStore = useProjectsStore()

onMounted(() => {
  projectsStore.initializeIfEmpty()
})
</script>

<template>
  <EditorView />
  <ProjectManagerModal />
  <SupportTypeModal />
  <LoadInputModal />
</template>
