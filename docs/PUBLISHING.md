# Publishing Checklist

Steps to publish Truss Breaker as an open-source project on GitHub.

## 1. Deploy Live Demo (Cloudflare)

```bash
npm run deploy
```

After deploy, note the Workers/Pages URL and update it in `README.md` if different from `https://truss-breaker.pages.dev`.

## 2. Make Repository Public

In GitHub → **Settings** → **General** → **Danger Zone** → **Change visibility** → **Public**.

## 3. Configure Repository About Section

In GitHub → **Settings** or repository home → **About** (gear icon):

- **Website:** your Cloudflare Pages URL
- **Topics:** `structural-engineering`, `truss-solver`, `finite-element-analysis`, `vue3`, `typescript`, `civil-engineering`

## 4. Add Demo GIF

Record a ~10 second GIF showing:

1. Drawing nodes and elements
2. Adding supports and loads
3. Running calculation
4. Viewing colored results

Save as `docs/demo.gif` and commit.

## 5. Optional: GitHub Release

Create tag `v1.2.0` with release notes:

- Engineering Y-up coordinate system (solver/UI vs SVG rendering boundary)
- Member point loads (grid-snapped, no element split)
- Live length preview while drawing elements
- Improved error banner close button (icon)

## 6. Optional: Custom Domain

In Cloudflare dashboard, attach a custom domain to the Workers/Pages deployment.
