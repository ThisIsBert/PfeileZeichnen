# Runtime Dependencies

This app is a no-build static site. Runtime module resolution is controlled by the import map in `index.html` and must remain deterministic.

## Import map sources (pinned)

| Import specifier | Exact source URL | Notes |
| --- | --- | --- |
| `react` | `https://esm.sh/react@19.1.0` | React package root import. |
| `react/` | `https://esm.sh/react@19.1.0/` | React subpath imports. |
| `react-dom/` | `https://esm.sh/react-dom@19.1.0/` | React DOM subpath imports (for `react-dom/client`). |
| `leaflet` | `https://esm.sh/leaflet@1.9.4` | ESM module import for app code. |

## Update policy

- Pin all runtime import-map URLs to exact versions (no semver ranges, no floating tags).
- Update dependencies only via explicit PRs that change both:
  1. `index.html` import-map entries, and
  2. this `DEPENDENCIES.md` table.
- Prefer minimal version updates and verify behavior remains unchanged.
- Run `npm run check` after any dependency change.

## CDN fallback policy

If `esm.sh` is unavailable or unstable:

1. Keep the same package versions when switching source.
2. Replace import-map URLs in `index.html` with equivalent pinned ESM URLs from a reliable CDN.
3. Update this document in the same PR to reflect the new exact URLs.
4. Re-run `npm run check` and smoke-test by serving the repository root as static files.

Do not add a build or bundling step as a CDN outage workaround.
