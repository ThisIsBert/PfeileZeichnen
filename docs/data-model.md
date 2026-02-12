# Data model

This document defines the canonical arrow domain model used across the app.

## Goals

- Keep core arrow data as plain JSON-compatible values.
- Keep Leaflet `LatLng`/layer instances inside `app/adapters/` and `app/map/` only.
- Use shared constructors/validators from `app/types/arrowModel.js` for safer object creation.

## Canonical in-memory structures

Defined in `app/types/arrowModel.js`.

### `LatLngLiteral`

```js
{ lat: 52.52, lng: 13.405 }
```

### `ArrowAnchorEntity`

Used while editing the current arrow.

```js
{
  id: '17390123.abc_0',
  latlng: { lat: 52.52, lng: 13.405 },
  handle1: { lat: 52.5201, lng: 13.4052 },
  handle2: { lat: 52.5198, lng: 13.4049 },
  _oldLatLng: { lat: 52.52, lng: 13.405 },
  _handle1OffsetPixels: { x: 12, y: -4 },
  _handle2OffsetPixels: { x: -10, y: 5 }
}
```

### `ArrowAnchorData`

Persistable anchor payload.

```js
{
  latlng: { lat: 52.52, lng: 13.405 },
  handle1: { lat: 52.5201, lng: 13.4052 },
  handle2: null
}
```

### `ArrowParameters`

```js
{
  rearWidthPx: 20,
  neckWidthPx: 16,
  headWidthPx: 36,
  headLengthPx: 48,
  baseZoom: 13
}
```

### `PersistedArrow`

```js
{
  savedAnchors: [
    {
      latlng: { lat: 52.52, lng: 13.405 },
      handle1: null,
      handle2: { lat: 52.521, lng: 13.406 }
    }
  ],
  arrowParameters: {
    rearWidthPx: 20,
    neckWidthPx: 16,
    headWidthPx: 36,
    headLengthPx: 48,
    baseZoom: 13
  },
  arrowName: 'Unbenannter Pfeil 1'
}
```

## Construction and validation helpers

Use these constructors from `app/types/arrowModel.js`:

- `createLatLngLiteral(value)`
- `createArrowAnchorData(value)`
- `createArrowAnchorEntity(value)`
- `createArrowParameters(value)`
- `createPersistedArrow(value)`

These normalize nullable fields and ensure all shared domain objects remain plain-data.

## Boundary rules

- **Allowed outside adapter/map:** plain data shapes above.
- **Allowed in adapter/map only:** Leaflet `LatLng`, `Layer`, map instances, and methods.
- Adapters convert between Leaflet and domain model (`app/adapters/leafletArrowAdapter.js`).
