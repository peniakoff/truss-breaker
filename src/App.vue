<script setup lang="ts">
import { onMounted } from 'vue'
import { useProjectsStore } from '@/stores/projectsStore'
import EditorView from '@/views/EditorView.vue'
import ProjectManagerModal from '@/components/shared/ProjectManagerModal.vue'

const projectsStore = useProjectsStore()

onMounted(() => {
  projectsStore.initializeIfEmpty()
})
</script>

<template>
  <EditorView />
  <ProjectManagerModal />
</template>
