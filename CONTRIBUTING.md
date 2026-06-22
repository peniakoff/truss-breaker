# Contributing to Truss Breaker

Thank you for your interest in contributing! This guide helps you get started.

## Getting Started

### Requirements

- Node.js 20+
- npm

### Setup

```bash
git clone https://github.com/peniakoff/truss-breaker.git
cd truss-breaker
npm install
npm run dev
```

### Tests

```bash
npm run test:e2e
npm run test:unit
```

E2E tests use Playwright. Install browsers on first run:

```bash
npx playwright install chromium
```

## Architecture

```
src/
  domain/
    solvers/     ← Pure TypeScript/math (no Vue) — stiffness matrix FEA
    models/      ← Data types (nodes, elements, loads, results)
    physics/     ← Geometry helpers, unit conversions
  components/    ← Vue UI (canvas, panels, modals)
  stores/        ← Pinia state (truss data, projects, UI)
  composables/   ← Vue composables (solver bridge, i18n, auto-save)
  locales/       ← i18n message files (en.json, pl.json)
  utils/         ← Constants, exporters (Python, PDF)
```

The solver (`StiffnessMatrixSolver.ts`) is framework-independent. You can extend FEA logic without knowing Vue.

## Where to Make Changes

| Change | Location |
|--------|----------|
| Solver / FEA math | `src/domain/solvers/StiffnessMatrixSolver.ts` |
| Data models | `src/domain/models/` |
| Canvas rendering | `src/components/workspace/GridCanvas.vue` |
| Properties panel | `src/components/toolbar/PropertiesPanel.vue` |
| Results panel | `src/components/toolbar/ResultsPanel.vue` |
| Translations | `src/locales/en.json` and `src/locales/pl.json` (both required) |
| Python export | `src/utils/pythonExporter.ts` |
| PDF export | `src/utils/pdfReportGenerator.ts` |
| Steel profiles | `src/data/steelProfiles.ts` |

## i18n Guidelines

- Default locale is **English** (`en`)
- Add every new UI string to **both** `en.json` and `pl.json`
- Use dot-notation keys: `section.subsection.key`
- Use `{param}` placeholders for dynamic values

## Pull Request Guidelines

1. Describe what changed and why
2. Run `npm run build` before submitting
3. Run `npm run test:e2e` if you changed UI behavior
4. Keep changes focused — one feature or fix per PR

## Code Style

- TypeScript strict mode
- Match existing naming and file structure
- No inline imports (imports at top of file)
- Exhaustive `switch` with `never` in default case for union types
