/**
 * @typedef {{ lat: number, lng: number }} LatLngLiteral
 */

/**
 * @typedef {{ x: number, y: number }} Point
 */

/**
 * @typedef {{
 *   id: string,
 *   latlng: LatLngLiteral,
 *   handle1?: LatLngLiteral | null,
 *   handle2?: LatLngLiteral | null,
 *   _oldLatLng?: import('leaflet').LatLng,
 *   _handle1OffsetPixels?: Point,
 *   _handle2OffsetPixels?: Point
 * }} ArrowAnchor
 */

/**
 * @typedef {{
 *   shaftThicknessPixels: number | null,
 *   arrowHeadLengthPixels: number | null,
 *   arrowHeadWidthPixels: number | null,
 *   baseZoom: number | null
 * }} ArrowParameters
 */

/**
 * @typedef {{
 *   latlng: LatLngLiteral,
 *   handle1: LatLngLiteral | null,
 *   handle2: LatLngLiteral | null
 * }} ArrowAnchorData
 */

/**
 * @typedef {{
 *   savedAnchors: ArrowAnchorData[],
 *   arrowParameters: ArrowParameters,
 *   arrowName: string
 * }} PersistedArrow
 */

export {};
