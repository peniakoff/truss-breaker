import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Project } from '@/domain/models'
import { useTrussStore } from './trussStore'

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref<Project[]>([])
  const currentProjectId = ref<string | null>(null)

  const currentProject = computed((): Project | undefined => {
    return projects.value.find((p) => p.id === currentProjectId.value)
  })

  const sortedProjects = computed((): Project[] => {
    return [...projects.value].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
  })

  function generateId(): string {
    return `proj-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  function createProject(name: string): Project {
    const trussStore = useTrussStore()
    const now = new Date().toISOString()
    const project: Project = {
      id: generateId(),
      name,
      createdAt: now,
      updatedAt: now,
      data: {
        nodes: [],
        elements: [],
        materials: [...trussStore.materials],
        supports: [],
        loads: [],
      },
      results: null,
    }
    projects.value.push(project)
    currentProjectId.value = project.id
    trussStore.clearAll()
    return project
  }

  function saveCurrentProject(): void {
    if (!currentProjectId.value) return
    const trussStore = useTrussStore()
    const project = projects.value.find((p) => p.id === currentProjectId.value)
    if (project) {
      project.data = trussStore.exportTrussData()
      project.results = trussStore.results
      project.updatedAt = new Date().toISOString()
    }
  }

  function loadProject(id: string): void {
    const trussStore = useTrussStore()
    const project = projects.value.find((p) => p.id === id)
    if (project) {
      currentProjectId.value = id
      trussStore.loadFromProject(project.data)
      if (project.results) {
        trussStore.setResults(project.results)
      }
    }
  }

  function deleteProject(id: string): void {
    projects.value = projects.value.filter((p) => p.id !== id)
    if (currentProjectId.value === id) {
      const trussStore = useTrussStore()
      currentProjectId.value = null
      trussStore.clearAll()
      // Load the most recent remaining project, or create a new one
      if (projects.value.length > 0) {
        const sorted = sortedProjects.value
        loadProject(sorted[0].id)
      } else {
        createProject('Nowy projekt')
      }
    }
  }

  function renameProject(id: string, newName: string): void {
    const project = projects.value.find((p) => p.id === id)
    if (project) {
      project.name = newName
      project.updatedAt = new Date().toISOString()
    }
  }

  function duplicateProject(id: string): void {
    const project = projects.value.find((p) => p.id === id)
    if (project) {
      const now = new Date().toISOString()
      const duplicate: Project = {
        id: generateId(),
        name: `${project.name} (kopia)`,
        createdAt: now,
        updatedAt: now,
        data: JSON.parse(JSON.stringify(project.data)),
        results: project.results ? JSON.parse(JSON.stringify(project.results)) : null,
      }
      projects.value.push(duplicate)
    }
  }

  function initializeIfEmpty(): void {
    if (projects.value.length === 0) {
      createProject('Nowy projekt')
    } else if (currentProjectId.value) {
      loadProject(currentProjectId.value)
    } else {
      const sorted = sortedProjects.value
      loadProject(sorted[0].id)
    }
  }

  return {
    projects,
    currentProjectId,
    currentProject,
    sortedProjects,
    createProject,
    saveCurrentProject,
    loadProject,
    deleteProject,
    renameProject,
    duplicateProject,
    initializeIfEmpty,
  }
}, {
  persist: {
    key: 'truss-breaker-projects',
  },
})
