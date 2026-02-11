# Architecture

Canonical entrypoint:

- `index.html` + `index.js`

This project intentionally uses root-level ES modules as the single source of truth for a no-build GitHub Pages deployment.

Deployment model: push static files to the default branch / Pages root, with no compile phase.
