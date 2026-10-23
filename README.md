# Leaflet Arrow Drawing Tool

This repository is a **no-build static web app**.

## Runtime path (exactly one)

Serve the repository root on any static host (for example GitHub Pages).
The runtime entrypoint is:

- `index.html` (which loads `index.js` as an ES module)

No bundling or build step is required.

## Deployment

Push static files directly to the default branch / Pages root. There is no compile phase.

## Runtime dependencies

Runtime CDN imports are pinned and documented in `DEPENDENCIES.md`.

## Drawing and editing

- Click **Neuen Pfeil zeichnen**, then click the map for each anchor. There is no fixed anchor limit.
- Click **Fertig** or press Enter to save. **Abbrechen** or Escape discards the current session.
- Select a saved arrow to edit its anchors and Bezier handles. Shift-click its outline to insert another anchor.
- The outline uses tapered strips with round joins and a curved head. Overlaps are merged; loops retain holes.
- Preview, saved arrows, and GeoJSON share the same outline. Exports use Polygon (or MultiPolygon when necessary), with closed rings and preserved holes.

## Tests

Run `npm ci` once, then `npm test` for geometry and GeoJSON regression tests.
These development dependencies are only for tests; serving the app still requires no build step.

## Static checks

Run static checks locally:

- `npm run lint`
- `npm run format:check`
- `npm run validate:imports`

## Editing path (exactly one)

Edit the root-level source files directly:

- `index.html`
- `index.js`
- `App.js`
- `components/ControlPanel.js`
- `constants.js`
- `types.js`
- `utils/geometry.js`

After editing, commit those files and deploy by serving the repository root.
