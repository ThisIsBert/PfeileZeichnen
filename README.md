# Leaflet Arrow Drawing Tool

This repository is a **no-build static web app**.

## Runtime path (exactly one)

Serve the repository root on any static host (for example GitHub Pages).
The runtime entrypoint is:

- `index.html` (which loads `index.js` as an ES module)

No bundling or build step is required.

## Deployment

Push static files directly to the default branch / Pages root. There is no compile phase.

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
