import { test, expect } from '@playwright/test'
import { setupPolishLocale } from './helpers'

test.describe('Export features', () => {
  test.beforeEach(async ({ page }) => {
    await setupPolishLocale(page, true)
  })

  test('should show export buttons in header', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Eksportuj Python' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Eksportuj PDF' })).toBeDisabled()
  })

  test('should show error banner when exporting empty truss', async ({ page }) => {
    await page.getByRole('button', { name: 'Eksportuj Python' }).click()
    await expect(page.getByText('Brak danych kratownicy do eksportu')).toBeVisible()
  })
})

test.describe('Deformations toggle', () => {
  test.beforeEach(async ({ page }) => {
    await setupPolishLocale(page, true)
  })

  test('should show deformations checkbox after calculation', async ({ page }) => {
    await page.keyboard.press('e')
    const canvas = page.locator('main svg')
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await canvas.click({ position: { x: box.width * 0.2, y: box.height * 0.6 } })
    await canvas.click({ position: { x: box.width * 0.5, y: box.height * 0.6 } })

    await page.keyboard.press('s')
    await page.locator('main svg .nodes-layer circle').first().click({ force: true })
    await page.getByRole('button', { name: 'Dodaj podporę' }).click()
    await page.locator('main svg .nodes-layer circle').nth(1).click({ force: true })
    await page.locator('#roller-y').click()
    await page.getByRole('button', { name: 'Dodaj podporę' }).click()

    await page.keyboard.press('f')
    await page.locator('main svg .nodes-layer circle').first().click({ force: true })
    await page.getByRole('button', { name: 'Dodaj siłę' }).click()

    await page.getByRole('button', { name: 'Oblicz' }).click()
    await expect(page.getByText('Pokaż odkształcenia')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('main svg .deformations-layer line')).toHaveCount(1)
  })
})

test.describe('English default locale', () => {
  test('should display properties panel in English by default', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: 'Properties' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Calculate' })).toBeVisible()
  })
})
