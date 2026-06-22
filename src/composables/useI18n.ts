import { useLocalStorage } from '@vueuse/core'
import plMessages from '@/locales/pl.json'
import enMessages from '@/locales/en.json'

type NestedRecord = { [key: string]: string | NestedRecord }

const dictionaries: Record<string, NestedRecord> = {
  pl: plMessages,
  en: enMessages,
}

export const currentLocale = useLocalStorage('truss-breaker-locale', 'en')

function getNestedValue(obj: NestedRecord, path: string): string | undefined {
  const keys = path.split('.')
  let current: string | NestedRecord = obj
  for (const key of keys) {
    if (typeof current === 'string') return undefined
    current = current[key]
    if (current === undefined) return undefined
  }
  return typeof current === 'string' ? current : undefined
}

export function useI18n() {
  function t(key: string, params?: Record<string, string>): string {
    const dict = dictionaries[currentLocale.value] ?? dictionaries.en
    let result = getNestedValue(dict, key) ?? getNestedValue(dictionaries.en, key) ?? key

    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        result = result.replace(`{${paramKey}}`, paramValue)
      }
    }
    return result
  }

  function toggleLocale(): void {
    currentLocale.value = currentLocale.value === 'pl' ? 'en' : 'pl'
  }

  return { t, currentLocale, toggleLocale }
}
