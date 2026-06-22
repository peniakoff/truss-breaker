import { describe, expect, it } from 'vitest'
import { SupportType, type TrussData } from '@/domain/models'
import { generatePythonScript, toAnastructCoords } from '@/utils/pythonExporter'
import { GRID_SIZE } from '@/utils/constants'

const defaultMaterial = {
  id: 'steel',
  name: 'Steel',
  youngModulus: 210e9,
  yieldStrength: 235e6,
}

function makeSimpleTruss(): TrussData {
  return {
    nodes: [
      { id: 'n1', x: 0, y: 0 },
      { id: 'n2', x: GRID_SIZE * 4, y: 0 },
    ],
    elements: [
      {
        id: 'e1',
        startNodeId: 'n1',
        endNodeId: 'n2',
        materialId: 'steel',
        crossSection: { area: 0.001 },
      },
    ],
    materials: [defaultMaterial],
    supports: [
      { nodeId: 'n1', type: SupportType.FIXED },
      { nodeId: 'n2', type: SupportType.ROLLER_Y },
    ],
    loads: [{ id: 'l1', nodeId: 'n1', forceX: 0, forceY: -10 }],
  }
}

describe('toAnastructCoords', () => {
  it('flips Y axis for anastruct Y-up convention', () => {
    expect(toAnastructCoords({ id: 'n', x: 100, y: 200 })).toEqual({
      x: 2,
      y: -4,
    })
  })
})

describe('generatePythonScript', () => {
  it('uses coordinate lookup instead of array index for supports and loads', () => {
    const script = generatePythonScript(makeSimpleTruss(), 'test')

    expect(script).toContain('def find_node_id(x, y, tol=1e-4)')
    expect(script).toContain('ss.add_support_fixed(find_node_id(0.0000, 0.0000))')
    expect(script).toContain("ss.add_support_roll(find_node_id(4.0000, 0.0000), direction='y')")
    expect(script).toContain('ss.point_load(find_node_id(0.0000, 0.0000), Fx=0.0, Fy=10000.0)')
    expect(script).not.toContain('nodeIndex')
  })

  it('negates Fy for Y-axis flip and uses correct displacement properties', () => {
    const script = generatePythonScript(makeSimpleTruss())

    expect(script).toContain('Fy=10000.0')
    expect(script).toContain('ux={node.ux:.6e} m, uz={node.uz:.6e} m')
    expect(script).not.toContain('u_x')
    expect(script).not.toContain('u_y')
  })

  it('documents Y-up coordinate conversion', () => {
    const script = generatePythonScript(makeSimpleTruss())
    expect(script).toContain('y_ana = -y_canvas')
  })

  it('distributes element loads to end nodes in exported script', () => {
    const data = makeSimpleTruss()
    data.loads = [{ id: 'l1', elementId: 'e1', position: 0.5, forceX: 0, forceY: -20 }]
    const script = generatePythonScript(data)

    expect(script).toContain('ss.point_load(find_node_id(0.0000, 0.0000), Fx=0.0, Fy=10000.0)')
    expect(script).toContain('ss.point_load(find_node_id(4.0000, 0.0000), Fx=0.0, Fy=10000.0)')
  })
})
