import { test, expect, type Page } from '@playwright/test'
import { setupPolishLocale } from './helpers'

/**
 * Helper: click at a specific position on the SVG canvas.
 */
async function clickCanvas(page: Page, xRatio: number, yRatio: number) {
  const canvas = page.locator('main svg')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas not found')
  await canvas.click({
    position: { x: box.width * xRatio, y: box.height * yRatio },
  })
}

/**
 * Helper: click directly on a node circle by its index in the nodes layer.
 */
async function clickNodeByIndex(page: Page, index: number) {
  const node = page.locator('main svg .nodes-layer circle').nth(index)
  await node.click({ force: true })
}

/**
 * Helper: build a simple two-node truss structure.
 * Creates 2 nodes, 1 element, 2 supports, and 1 load.
 */
async function buildSimpleTruss(page: Page) {
  // Add element tool - creates two nodes and connects them
  await page.keyboard.press('e')
  await clickCanvas(page, 0.2, 0.6)
  await clickCanvas(page, 0.5, 0.6)

  // Verify structure created
  await expect(page.locator('main svg .nodes-layer circle')).toHaveCount(2)
  await expect(page.locator('main svg .elements-layer line')).toHaveCount(1)

  // Add FIXED support to first node
  await page.keyboard.press('s')
  await clickNodeByIndex(page, 0)
  await expect(page.getByRole('heading', { name: 'Wybierz typ podpory' })).toBeVisible()
  await page.getByRole('button', { name: 'Dodaj podporę' }).click()

  // Add ROLLER support to second node
  await clickNodeByIndex(page, 1)
  await expect(page.getByRole('heading', { name: 'Wybierz typ podpory' })).toBeVisible()
  await page.locator('#roller-y').click()
  await page.getByRole('button', { name: 'Dodaj podporę' }).click()

  // Add load to first node
  await page.keyboard.press('f')
  await clickNodeByIndex(page, 0)
  await expect(page.getByRole('heading', { name: 'Definiuj siłę skupioną' })).toBeVisible()
  // Default FY is -10 kN
  await page.getByRole('button', { name: 'Dodaj siłę' }).click()
}

test.describe('Full truss workflow', () => {
  test.beforeEach(async ({ page }) => {
    await setupPolishLocale(page, true)
  })

  test('should build a simple truss and calculate results', async ({ page }) => {
    await buildSimpleTruss(page)

    // Verify supports exist
    const supports = page.locator('main svg .supports-layer path')
    const supportsCount = await supports.count()
    expect(supportsCount).toBeGreaterThanOrEqual(2)

    // Verify load arrow exists
    const loads = page.locator('main svg .loads-layer line')
    await expect(loads).toHaveCount(1)

    // Calculate
    await page.getByRole('button', { name: 'Oblicz' }).click()

    // Results panel should appear
    await expect(page.getByText('Wyniki obliczeń')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Siły osiowe')).toBeVisible()
    await expect(page.getByText('Reakcje podpór')).toBeVisible()
  })

  test('should build a triangular truss', async ({ page }) => {
    // Create 3 nodes first
    await page.keyboard.press('n')
    await clickCanvas(page, 0.2, 0.7)   // Node A
    await clickCanvas(page, 0.5, 0.7)   // Node B
    await clickCanvas(page, 0.35, 0.3)  // Node C

    await expect(page.locator('main svg .nodes-layer circle')).toHaveCount(3)

    // Create 3 elements by clicking on node circles
    await page.keyboard.press('e')

    // Element A→B
    await clickNodeByIndex(page, 0)
    await clickNodeByIndex(page, 1)

    // Element B→C
    await clickNodeByIndex(page, 1)
    await clickNodeByIndex(page, 2)

    // Element C→A
    await clickNodeByIndex(page, 2)
    await clickNodeByIndex(page, 0)

    const elements = page.locator('main svg .elements-layer line')
    await expect(elements).toHaveCount(3)
  })
})

test.describe('Support modal', () => {
  test.beforeEach(async ({ page }) => {
    await setupPolishLocale(page, true)
  })

  test('should add a fixed support to a node', async ({ page }) => {
    // Create a node
    await page.keyboard.press('n')
    await clickCanvas(page, 0.3, 0.5)

    // Switch to support tool and click on the node circle directly
    await page.keyboard.press('s')
    await clickNodeByIndex(page, 0)

    await expect(page.getByRole('heading', { name: 'Wybierz typ podpory' })).toBeVisible()
    await page.getByRole('button', { name: 'Dodaj podporę' }).click()

    const supports = page.locator('main svg .supports-layer path')
    await expect(supports).toHaveCount(1)
  })

  test('should cancel support modal', async ({ page }) => {
    await page.keyboard.press('n')
    await clickCanvas(page, 0.3, 0.5)

    await page.keyboard.press('s')
    await clickNodeByIndex(page, 0)

    await expect(page.getByRole('heading', { name: 'Wybierz typ podpory' })).toBeVisible()
    await page.getByRole('button', { name: 'Anuluj' }).click()

    await expect(page.getByRole('heading', { name: 'Wybierz typ podpory' })).not.toBeVisible()
    const supports = page.locator('main svg .supports-layer path')
    await expect(supports).toHaveCount(0)
  })
})

test.describe('Load modal', () => {
  test.beforeEach(async ({ page }) => {
    await setupPolishLocale(page, true)
  })

  test('should add a load to a node', async ({ page }) => {
    // Create a node
    await page.keyboard.press('n')
    await clickCanvas(page, 0.3, 0.5)

    // Switch to load tool and click directly on the node
    await page.keyboard.press('f')
    await clickNodeByIndex(page, 0)

    await expect(page.getByRole('heading', { name: 'Definiuj siłę skupioną' })).toBeVisible()

    const forceYInput = page.locator('#force-y')
    await forceYInput.fill('-20')

    await page.getByRole('button', { name: 'Dodaj siłę' }).click()

    const loadArrows = page.locator('main svg .loads-layer line')
    await expect(loadArrows).toHaveCount(1)
  })

  test('should reject zero forces', async ({ page }) => {
    await page.keyboard.press('n')
    await clickCanvas(page, 0.3, 0.5)

    await page.keyboard.press('f')
    await clickNodeByIndex(page, 0)

    await expect(page.getByRole('heading', { name: 'Definiuj siłę skupioną' })).toBeVisible()

    const forceXInput = page.locator('#force-x')
    const forceYInput = page.locator('#force-y')
    await forceXInput.fill('0')
    await forceYInput.fill('0')

    await page.getByRole('button', { name: 'Dodaj siłę' }).click()

    await expect(page.getByText('Co najmniej jedna wartość musi być różna od zera')).toBeVisible()
  })
})

test.describe('Project management', () => {
  test.beforeEach(async ({ page }) => {
    await setupPolishLocale(page, true)
  })

  test('should open and close projects modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Projekty' }).click()
    await expect(page.getByRole('heading', { name: 'Zarządzanie projektami' })).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.getByRole('heading', { name: 'Zarządzanie projektami' })).not.toBeVisible()
  })

  test('should rename project via header input', async ({ page }) => {
    const input = page.locator('header input[type="text"]')
    await input.fill('Test Project')
    await expect(input).toHaveValue('Test Project')
  })
})
