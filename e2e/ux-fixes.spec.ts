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
 * Helper: click at the midpoint of a beam element by its index in the elements layer.
 */
async function clickElementMidpoint(page: Page, index: number) {
  const element = page.locator('main svg .elements-layer line').nth(index)
  const box = await element.boundingBox()
  if (!box) throw new Error('Element not found')
  await element.click({
    position: { x: box.width / 2, y: box.height / 2 },
    force: true,
  })
}

/**
 * Helper: zoom the canvas by scrolling the mouse wheel.
 */
async function zoomCanvas(page: Page, deltaY: number) {
  const canvas = page.locator('main svg')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas not found')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.wheel(0, deltaY)
  await page.waitForTimeout(100)
}

test.describe('Bug #2: Grid scale — major lines 1m, minor lines 10cm', () => {
  test.beforeEach(async ({ page }) => {
    await setupPolishLocale(page, true)
  })

  test('should render only major grid lines at default zoom (zoom=1)', async ({ page }) => {
    // At default zoom (1.0), minor lines should NOT be rendered
    const majorLines = page.locator('main svg .grid-layer line[stroke="#d1d5db"]')
    const majorCount = await majorLines.count()
    expect(majorCount).toBeGreaterThan(0)

    // Minor lines should not exist (they are not rendered at zoom < 1.5)
    const minorLines = page.locator('main svg .grid-layer line[stroke="#f3f4f6"]')
    const minorCount = await minorLines.count()
    expect(minorCount).toBe(0)
  })

  test('should show minor grid lines when zoomed in past threshold', async ({ page }) => {
    // Zoom in by scrolling (negative deltaY = zoom in)
    // Multiple scroll events to push past 1.5 threshold
    for (let i = 0; i < 10; i++) {
      await zoomCanvas(page, -120)
    }

    const minorLines = page.locator('main svg .grid-layer line[stroke="#f3f4f6"]')
    const minorCount = await minorLines.count()
    expect(minorCount).toBeGreaterThan(0)
  })
})

test.describe('Bug #3: Support/load placement on beam midpoints', () => {
  test.beforeEach(async ({ page }) => {
    await setupPolishLocale(page, true)
  })

  test('should split element and add support when clicking on beam with support tool', async ({ page }) => {
    // Create an element (beam) with two nodes
    await page.keyboard.press('e')
    await clickCanvas(page, 0.2, 0.5)
    await clickCanvas(page, 0.6, 0.5)

    await expect(page.locator('main svg .nodes-layer circle')).toHaveCount(2)
    await expect(page.locator('main svg .elements-layer line')).toHaveCount(1)

    // Switch to support tool
    await page.keyboard.press('s')

    // Click on the midpoint of the beam (not on an existing node)
    await clickElementMidpoint(page, 0)

    // Support modal should open (because element was split and new node was created)
    await expect(page.getByRole('heading', { name: 'Wybierz typ podpory' })).toBeVisible()

    // Add a fixed support
    await page.getByRole('button', { name: 'Dodaj podporę' }).click()

    // Should now have 3 nodes (original 2 + 1 from split)
    await expect(page.locator('main svg .nodes-layer circle')).toHaveCount(3)

    // Should now have 2 elements (original 1 was split into 2)
    await expect(page.locator('main svg .elements-layer line')).toHaveCount(2)

    // Should have 1 support
    const supports = page.locator('main svg .supports-layer path')
    await expect(supports).toHaveCount(1)
  })

  test('should split element and add load when clicking on beam with load tool', async ({ page }) => {
    // Create an element (beam) with two nodes
    await page.keyboard.press('e')
    await clickCanvas(page, 0.2, 0.5)
    await clickCanvas(page, 0.6, 0.5)

    await expect(page.locator('main svg .nodes-layer circle')).toHaveCount(2)
    await expect(page.locator('main svg .elements-layer line')).toHaveCount(1)

    // Switch to load tool
    await page.keyboard.press('f')

    // Click on the midpoint of the beam
    await clickElementMidpoint(page, 0)

    // Load modal should open
    await expect(page.getByRole('heading', { name: 'Definiuj siłę skupioną' })).toBeVisible()

    // Add a load (default FY=-10)
    await page.getByRole('button', { name: 'Dodaj siłę' }).click()

    // Should now have 3 nodes
    await expect(page.locator('main svg .nodes-layer circle')).toHaveCount(3)

    // Should now have 2 elements
    await expect(page.locator('main svg .elements-layer line')).toHaveCount(2)

    // Should have 1 load arrow
    const loads = page.locator('main svg .loads-layer line')
    await expect(loads).toHaveCount(1)
  })
})

test.describe('Bug #4: Font sizes and labels', () => {
  test.beforeEach(async ({ page }) => {
    await setupPolishLocale(page, true)
  })

  test('should display support type label next to support symbol', async ({ page }) => {
    // Create a node and add a fixed support
    await page.keyboard.press('n')
    await clickCanvas(page, 0.3, 0.5)

    await page.keyboard.press('s')
    await clickNodeByIndex(page, 0)
    await expect(page.getByRole('heading', { name: 'Wybierz typ podpory' })).toBeVisible()
    await page.getByRole('button', { name: 'Dodaj podporę' }).click()

    // Support label "Stała" should appear in the SVG
    const supportLabel = page.locator('main svg .supports-layer .support-label')
    await expect(supportLabel).toBeVisible()
    await expect(supportLabel).toHaveText('Stała')
  })

  test('should display roller support type label', async ({ page }) => {
    // Create a node and add a roller support
    await page.keyboard.press('n')
    await clickCanvas(page, 0.3, 0.5)

    await page.keyboard.press('s')
    await clickNodeByIndex(page, 0)
    await expect(page.getByRole('heading', { name: 'Wybierz typ podpory' })).toBeVisible()
    await page.locator('#roller-y').click()
    await page.getByRole('button', { name: 'Dodaj podporę' }).click()

    const supportLabel = page.locator('main svg .supports-layer .support-label')
    await expect(supportLabel).toBeVisible()
    await expect(supportLabel).toHaveText('Przesuwna Y')
  })

  test('should display load force label with readable font size', async ({ page }) => {
    // Create a node and add a load
    await page.keyboard.press('n')
    await clickCanvas(page, 0.3, 0.5)

    await page.keyboard.press('f')
    await clickNodeByIndex(page, 0)
    await expect(page.getByRole('heading', { name: 'Definiuj siłę skupioną' })).toBeVisible()
    await page.getByRole('button', { name: 'Dodaj siłę' }).click()

    // Load label should appear in loads-layer
    const loadLabel = page.locator('main svg .loads-layer text')
    await expect(loadLabel).toBeVisible()
    // Default load is FY=-10
    await expect(loadLabel).toContainText('FY')
  })

  test('should display element force labels and reaction labels after calculation', async ({ page }) => {
    // Build a simple truss
    await page.keyboard.press('e')
    await clickCanvas(page, 0.2, 0.6)
    await clickCanvas(page, 0.5, 0.6)

    // Add supports
    await page.keyboard.press('s')
    await clickNodeByIndex(page, 0)
    await expect(page.getByRole('heading', { name: 'Wybierz typ podpory' })).toBeVisible()
    await page.getByRole('button', { name: 'Dodaj podporę' }).click()

    await clickNodeByIndex(page, 1)
    await expect(page.getByRole('heading', { name: 'Wybierz typ podpory' })).toBeVisible()
    await page.locator('#roller-y').click()
    await page.getByRole('button', { name: 'Dodaj podporę' }).click()

    // Add load
    await page.keyboard.press('f')
    await clickNodeByIndex(page, 0)
    await expect(page.getByRole('heading', { name: 'Definiuj siłę skupioną' })).toBeVisible()
    await page.getByRole('button', { name: 'Dodaj siłę' }).click()

    // Calculate
    await page.getByRole('button', { name: 'Oblicz' }).click()
    await expect(page.getByText('Wyniki obliczeń')).toBeVisible({ timeout: 5000 })

    // Element force labels should be visible
    const elementLabels = page.locator('main svg .element-labels-layer text')
    await expect(elementLabels.first()).toBeVisible()
    await expect(elementLabels.first()).toContainText('kN')

    // Reaction labels should be visible
    const reactionLabels = page.locator('main svg .reactions-layer .reaction-label')
    const reactionCount = await reactionLabels.count()
    expect(reactionCount).toBeGreaterThan(0)
  })
})

test.describe('Locale toggle', () => {
  test('should switch between English and Polish', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('button', { name: 'Calculate' })).toBeVisible()

    await page.getByRole('button', { name: 'PL' }).click()
    await expect(page.getByRole('button', { name: 'Oblicz' })).toBeVisible()

    await page.getByRole('button', { name: 'EN' }).click()
    await expect(page.getByRole('button', { name: 'Calculate' })).toBeVisible()
  })
})
