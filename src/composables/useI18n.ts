import { reactive } from 'vue'
import plMessages from '@/locales/pl.json'

type NestedRecord = { [key: string]: string | NestedRecord }

const messages: NestedRecord = reactive(plMessages)

function getNestedValue(obj: NestedRecord, path: string): string {
  const keys = path.split('.')
  let current: string | NestedRecord = obj
  for (const key of keys) {
    if (typeof current === 'string') return path
    current = current[key]
    if (current === undefined) return path
  }
  return typeof current === 'string' ? current : path
}

export function useI18n() {
  function t(key: string, params?: Record<string, string>): string {
    let result = getNestedValue(messages, key)
    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        result = result.replace(`{${paramKey}}`, paramValue)
      }
    }
    return result
  }

  return { t }
}
