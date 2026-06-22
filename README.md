# Truss Breaker

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://truss-breaker.tomasz-miller.workers.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Truss Breaker** — A fast, zero-install, browser-based 2D truss solver built for mechanical engineers.

**[Live Demo](https://truss-breaker.tomasz-miller.workers.dev)** · [Contributing](CONTRIBUTING.md) · [Publishing checklist](docs/PUBLISHING.md)

<!-- Add docs/demo.gif after recording a screen capture -->
<!-- ![Truss Breaker demo](docs/demo.gif) -->

## Features

- Interactive SVG canvas for drawing nodes, elements, supports, and loads
- Point loads on nodes or anywhere along a member (grid-snapped, no topology split)
- Live member length preview while drawing elements
- Client-side stiffness-matrix solver (no server required)
- Real-time visualization of axial forces (tension/compression coloring)
- Support reactions and displacement results (engineering Y-up convention)
- Multi-project management with auto-save (Local Storage)
- English and Polish UI (i18n)
- Export to Python (`anastruct`) for further analysis in Jupyter
- Steel profile catalog (IPE, HEB, pipes)
- Deformed shape overlay
- PDF report export

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Production build

```bash
npm run build
npm run preview   # local Cloudflare Workers preview
```

### Tests

```bash
npm run test:unit   # Vitest unit tests
npm run test:e2e    # Playwright E2E (requires: npx playwright install chromium)
```

### Deploy to Cloudflare

```bash
npm run deploy
```

Set `CLOUDFLARE_API_TOKEN` before deploying. See [docs/PUBLISHING.md](docs/PUBLISHING.md) for the full open-source publishing checklist.

## Tech Stack

- **Vue 3** + **TypeScript** — SPA frontend
- **Math.js** — linear algebra (stiffness matrix solver)
- **Pinia** — state management
- **Tailwind CSS** — styling
- **Cloudflare Workers** — static hosting ([live demo](https://truss-breaker.tomasz-miller.workers.dev))

## Model Assumptions

- 2D pin-jointed truss (bar elements only)
- Coordinates snap to a grid (1 grid unit = 1 m)
- Loads in kN, Young's modulus in Pa, cross-section area in m²
- Small-displacement linear elastic analysis

### Coordinate system

- **Node positions** are stored in SVG pixel coordinates (origin top-left, Y increases downward).
- **Solver, forms, and result tables** use the engineering Cartesian convention (Y increases upward). A load with `FY = -10` kN acts downward (gravity).
- **Canvas rendering** (`GridCanvas`) flips the Y component when drawing force/reaction arrows and deformed shapes so vectors match the on-screen direction.
- **Python export** converts node positions only (`y_ana = -y_canvas`); forces are already in engineering Y-up and are exported without an extra sign flip.

## License

MIT — see [LICENSE](LICENSE).

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).
