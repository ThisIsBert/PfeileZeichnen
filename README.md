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
- Click, hold and drag an unselected saved arrow to move it as a whole. A short click selects it.
- Select a saved arrow to edit its anchors and Bezier handles. Shift-click its outline to insert another anchor.
- To copy a shape, select the target arrow (or draw a new one), click **Form übernehmen**, then click the source arrow. This copies all form parameters and their reference zoom while preserving the target anchors and name. Escape or **Pipette abbrechen** leaves the current editing session open.
- The outline uses tapered strips with round joins and a curved head. Overlaps are merged; loops retain holes.
- Preview, saved arrows, and GeoJSON share the same outline. Exports use Polygon (or MultiPolygon when necessary), with closed rings and preserved holes.

## Undo/redo and form values

**Rückgängig** / **Wiederholen** and Ctrl/Cmd+Z, Ctrl+Y or Ctrl/Cmd+Shift+Z restore up to 100 arrow actions in the current session. Drawing anchors, dragging an anchor/handle/arrow, name and form changes, eyedropper, copy, delete, finish and cancel are included. Each drag or slider gesture is one step. Map navigation and reference layers are independent of this arrow history.

Each form slider also has a numeric field. Enter commits that field; Escape restores its value from before typing. Empty fields revert to their last valid value, and values outside the displayed limits are clamped on commit. Native text undo remains available while typing in a field.

Pixel sizes refer to the arrow's **reference zoom**, shown alongside the current zoom and scale factor. Rear/front taper are dimensionless factors. The original shaft thickness and taper values are stored, so reselecting, copying or sampling an arrow keeps the same numbers. Older width-only records remain supported.

If arrow geometry cannot be saved, the draft, name, form values and cancel baseline remain available. Fix the geometry, undo the last edit, or cancel explicitly. Copying or selecting another arrow cannot bypass a failed save.

## GeoJSON templates

Use **GeoJSON laden** in the **Vorlage** section to load one or more local `.geojson` or `.json` files in WGS84. Geometry objects, Features, FeatureCollections and GeometryCollections are supported, including points, lines, polygons and multipart geometries.

Templates appear below the arrows, cannot be selected or moved, and let drawing clicks pass through. Toggle **Vorlage** in the layer control at the top left to hide or show them; **Leeren** removes the loaded templates. Further imports add to the same layer. Invalid files leave the existing template unchanged. Templates are excluded from arrow exports. Loading a template fits the view to it unless an arrow is currently being edited.

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
