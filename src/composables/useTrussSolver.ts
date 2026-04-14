import { ref } from 'vue'
import { useTrussStore } from '@/stores/trussStore'
import { solve } from '@/domain/solvers/StiffnessMatrixSolver'

export function useTrussSolver() {
  const trussStore = useTrussStore()
  const isCalculating = ref(false)
  const error = ref<string | null>(null)

  function calculate(): void {
    isCalculating.value = true
    error.value = null

    try {
      const data = trussStore.exportTrussData()
      const result = solve(data)

      if (result.success) {
        trussStore.setResults(result.result)
      } else {
        error.value = result.error.message
        trussStore.clearResults()
      }
    } catch (_e) {
      error.value = 'Obliczenia nie powiodły się'
      trussStore.clearResults()
    } finally {
      isCalculating.value = false
    }
  }

  return { isCalculating, error, calculate }
}
