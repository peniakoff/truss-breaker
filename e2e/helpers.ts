import { type Page } from '@playwright/test'

export async function setupPolishLocale(page: Page, clearStorage = false): Promise<void> {
  await page.goto('/')
  await page.evaluate((clear) => {
    if (clear) {
      localStorage.clear()
    }
    localStorage.setItem('truss-breaker-locale', 'pl')
  }, clearStorage)
  await page.reload()
  await page.waitForLoadState('networkidle')
}
