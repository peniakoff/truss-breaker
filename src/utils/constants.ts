// Grid configuration
export const GRID_SIZE = 50 // pixels per grid unit (1 meter)
export const GRID_MINOR_SIZE = GRID_SIZE / 10 // pixels per minor grid unit (0.1 m = 10 cm)
export const CANVAS_WIDTH = 4000 // total canvas width in px
export const CANVAS_HEIGHT = 3000 // total canvas height in px
export const GRID_COLOR = '#e5e7eb'
export const GRID_MINOR_COLOR = '#f3f4f6' // lighter gray for minor grid lines
export const GRID_LINE_WIDTH = 0.5
export const GRID_MAJOR_EVERY = 10 // major grid line every N minor units (= every 1 m)
export const GRID_MAJOR_COLOR = '#d1d5db'
export const GRID_MAJOR_LINE_WIDTH = 1
export const GRID_MINOR_VISIBLE_ZOOM_THRESHOLD = 1.5 // minor lines visible only at zoom >= this

// Default material properties (Steel S235)
export const DEFAULT_YOUNG_MODULUS = 210e9 // Pa (210 GPa)
export const DEFAULT_YIELD_STRENGTH = 235e6 // Pa (235 MPa)
export const DEFAULT_MATERIAL_NAME = 'Stal S235'

// Default cross-section
export const DEFAULT_CROSS_SECTION_AREA = 0.001 // m² (10 cm²)

// Visualization colors
export const COLOR_TENSION = '#22c55e' // green - rozciąganie
export const COLOR_COMPRESSION = '#ef4444' // red - ściskanie
export const COLOR_NEUTRAL = '#6b7280' // gray
export const COLOR_NODE = '#3b82f6' // blue
export const COLOR_NODE_SELECTED = '#f59e0b' // amber
export const COLOR_SUPPORT = '#8b5cf6' // violet
export const COLOR_LOAD = '#f97316' // orange
export const COLOR_REACTION = '#06b6d4' // cyan
export const COLOR_ELEMENT_DEFAULT = '#374151' // gray-700
export const COLOR_ELEMENT_SELECTED = '#f59e0b' // amber
export const COLOR_GHOST = '#94a3b8' // slate-400

// Visualization scales
export const DEFORMATION_SCALE_FACTOR = 100
export const FORCE_ARROW_SCALE = 1.0 // pixels per kN
export const FORCE_ARROW_MIN_LENGTH = 80 // minimum arrow length in px
export const FORCE_ARROW_HEAD_SIZE = 24

// Node rendering
export const NODE_RADIUS = 24
export const NODE_HOVER_RADIUS = 40
export const GRID_SNAP_THRESHOLD = NODE_HOVER_RADIUS
export const ELEMENT_WIDTH = 8
export const ELEMENT_HOVER_WIDTH = 16
export const ELEMENT_HIT_THRESHOLD = ELEMENT_HOVER_WIDTH

// Support rendering
export const SUPPORT_SIZE = 60

// Zoom
export const ZOOM_MIN = 0.2
export const ZOOM_MAX = 5
export const ZOOM_STEP = 0.1

// Font sizes for technical drawing labels
export const FONT_SIZE_ELEMENT_LABEL = 56
export const FONT_SIZE_FORCE_LABEL = 56
export const FONT_SIZE_SUPPORT_LABEL = 48
