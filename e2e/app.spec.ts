import { test, expect, type Page } from '@playwright/test'

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

test.describe('Application bootstrap', () => {
  test('should load the application and display the header', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('header')).toBeVisible()
    await expect(page.getByText('Truss Breaker')).toBeVisible()
  })

  test('should show toolbar with 5 tool buttons', async ({ page }) => {
    await page.goto('/')
    const aside = page.locator('aside').first()
    await expect(aside).toBeVisible()
    const buttons = aside.locator('button')
    await expect(buttons).toHaveCount(5)
  })

  test('should display the SVG canvas', async ({ page }) => {
    await page.goto('/')
    const svg = page.locator('main svg')
    await expect(svg).toBeVisible()
    await expect(svg).toHaveAttribute('viewBox')
  })

  test('should display properties panel on the right', async ({ page }) => {
    await page.goto('/')
    const rightPanel = page.locator('aside').nth(1)
    await expect(rightPanel).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Właściwości' })).toBeVisible()
  })
})

test.describe('Grid rendering', () => {
  test('should render grid lines on the canvas', async ({ page }) => {
    await page.goto('/')
    const gridLines = page.locator('main svg .grid-layer line')
    const count = await gridLines.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should have both major and minor grid lines', async ({ page }) => {
    await page.goto('/')
    const allLines = page.locator('main svg .grid-layer line')
    const count = await allLines.count()
    expect(count).toBeGreaterThan(10)
  })
})

test.describe('Tool switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should switch to Add Node tool with N key', async ({ page }) => {
    await page.keyboard.press('n')
    const svg = page.locator('main svg')
    await expect(svg).toHaveClass(/cursor-crosshair/)
  })

  test('should switch to Add Element tool with E key', async ({ page }) => {
    await page.keyboard.press('e')
    const svg = page.locator('main svg')
    await expect(svg).toHaveClass(/cursor-crosshair/)
  })

  test('should switch to Select tool with V key', async ({ page }) => {
    await page.keyboard.press('n')
    await page.keyboard.press('v')
    const svg = page.locator('main svg')
    await expect(svg).toHaveClass(/cursor-grab/)
  })

  test('should switch tools via toolbar buttons', async ({ page }) => {
    const toolbar = page.locator('aside').first()
    const buttons = toolbar.locator('button')

    await buttons.nth(1).click()
    const svg = page.locator('main svg')
    await expect(svg).toHaveClass(/cursor-crosshair/)

    await buttons.nth(0).click()
    await expect(svg).toHaveClass(/cursor-grab/)
  })
})

test.describe('Adding nodes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should add a node when clicking on canvas with Add Node tool', async ({ page }) => {
    await page.keyboard.press('n')
    await clickCanvas(page, 0.3, 0.5)

    const nodes = page.locator('main svg .nodes-layer circle')
    await expect(nodes).toHaveCount(1)
  })

  test('should add multiple nodes', async ({ page }) => {
    await page.keyboard.press('n')
    await clickCanvas(page, 0.2, 0.5)
    await clickCanvas(page, 0.4, 0.5)
    await clickCanvas(page, 0.3, 0.3)

    const nodes = page.locator('main svg .nodes-layer circle')
    await expect(nodes).toHaveCount(3)
  })

  test('should show ghost cursor when Add Node tool is active', async ({ page }) => {
    await page.keyboard.press('n')

    const canvas = page.locator('main svg')
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5)

    const ghost = page.locator('main svg .ghost-layer circle')
    await expect(ghost).toBeVisible()
  })
})

test.describe('Adding elements (beams)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should add an element between two new node clicks', async ({ page }) => {
    await page.keyboard.press('e')
    await clickCanvas(page, 0.2, 0.5)
    await clickCanvas(page, 0.4, 0.5)

    const nodes = page.locator('main svg .nodes-layer circle')
    await expect(nodes).toHaveCount(2)

    const elements = page.locator('main svg .elements-layer line')
    await expect(elements).toHaveCount(1)
  })
})

test.describe('Node selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should select a node when clicking directly on it', async ({ page }) => {
    await page.keyboard.press('n')
    await clickCanvas(page, 0.3, 0.5)
    await expect(page.locator('main svg .nodes-layer circle')).toHaveCount(1)

    await page.keyboard.press('v')
    await clickNodeByIndex(page, 0)

    // Node should turn amber (selected color)
    const nodeCircle = page.locator('main svg .nodes-layer circle').first()
    await expect(nodeCircle).toHaveAttribute('fill', '#f59e0b')
  })

  test('should delete selected node with Delete key', async ({ page }) => {
    await page.keyboard.press('n')
    await clickCanvas(page, 0.3, 0.5)

    await page.keyboard.press('v')
    await clickNodeByIndex(page, 0)

    await expect(page.locator('main svg .nodes-layer circle').first())
      .toHaveAttribute('fill', '#f59e0b')

    await page.keyboard.press('Delete')

    const nodes = page.locator('main svg .nodes-layer circle')
    await expect(nodes).toHaveCount(0)
  })
})

test.describe('Canvas navigation', () => {
  test('should zoom with mouse wheel', async ({ page }) => {
    await page.goto('/')
    const svg = page.locator('main svg')
    const initialViewBox = await svg.getAttribute('viewBox')

    const box = await svg.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.wheel(0, -100)

    await page.waitForTimeout(100)
    const newViewBox = await svg.getAttribute('viewBox')
    expect(newViewBox).not.toBe(initialViewBox)
  })
})

test.describe('Header actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should open projects modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Projekty' }).click()
    await expect(page.getByRole('heading', { name: 'Zarządzanie projektami' })).toBeVisible()
  })

  test('should clear canvas', async ({ page }) => {
    await page.keyboard.press('n')
    await clickCanvas(page, 0.2, 0.5)
    await clickCanvas(page, 0.4, 0.5)

    await page.getByRole('button', { name: 'Wyczyść obszar' }).click()

    const nodes = page.locator('main svg .nodes-layer circle')
    await expect(nodes).toHaveCount(0)
  })

  test('should save project with keyboard shortcut Ctrl+S', async ({ page }) => {
    await page.keyboard.press('Control+s')
    await expect(page.getByText('Zapisano')).toBeVisible()
  })
})

test.describe('Calculate button', () => {
  test('should show an error when calculating with insufficient data', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Oblicz' }).click()
    await expect(page.locator('.bg-destructive')).toBeVisible({ timeout: 5000 })
  })
})
