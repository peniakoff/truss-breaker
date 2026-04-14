import { ref } from 'vue'
import { useTrussStore } from '@/stores/trussStore'
import { solve } from '@/domain/solvers/StiffnessMatrixSolver'
import { useI18n } from '@/composables/useI18n'

export function useTrussSolver() {
  const trussStore = useTrussStore()
  const { t } = useI18n()
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
        error.value = t(result.error.messageKey, result.error.params)
        trussStore.clearResults()
      }
    } catch (_e) {
      error.value = t('errors.calculationFailed')
      trussStore.clearResults()
    } finally {
      isCalculating.value = false
    }
  }

  return { isCalculating, error, calculate }
}
