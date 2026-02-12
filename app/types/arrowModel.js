/**
 * @typedef {{ lat: number, lng: number }} LatLngLiteral
 */

/**
 * @typedef {{ x: number, y: number }} Point
 */

/**
 * Core in-memory anchor entity used while editing.
 * Leaflet objects must not be stored on this shape.
 *
 * @typedef {{
 *   id: string,
 *   latlng: LatLngLiteral,
 *   handle1: LatLngLiteral | null,
 *   handle2: LatLngLiteral | null,
 *   _oldLatLng?: LatLngLiteral,
 *   _handle1OffsetPixels?: Point,
 *   _handle2OffsetPixels?: Point
 * }} ArrowAnchorEntity
 */

/**
 * Persistable anchor payload.
 *
 * @typedef {{
 *   latlng: LatLngLiteral,
 *   handle1: LatLngLiteral | null,
 *   handle2: LatLngLiteral | null
 * }} ArrowAnchorData
 */

/**
 * @typedef {{
 *   rearWidthPx: number | null,
 *   neckWidthPx: number | null,
 *   headWidthPx: number | null,
 *   headLengthPx: number | null,
 *   baseZoom: number | null
 * }} ArrowParameters
 */

/**
 * @typedef {{
 *   savedAnchors: ArrowAnchorData[],
 *   arrowParameters: ArrowParameters,
 *   arrowName: string
 * }} PersistedArrow
 */

/**
 * @param {any} value
 * @returns {value is LatLngLiteral}
 */
export function isLatLngLiteral(value) {
  return Boolean(value)
    && typeof value.lat === 'number'
    && Number.isFinite(value.lat)
    && typeof value.lng === 'number'
    && Number.isFinite(value.lng);
}

/**
 * @param {any} value
 * @returns {LatLngLiteral}
 */
export function createLatLngLiteral(value) {
  if (!isLatLngLiteral(value)) {
    throw new Error('Invalid LatLngLiteral payload.');
  }
  return { lat: value.lat, lng: value.lng };
}

/**
 * @param {any} value
 * @returns {ArrowAnchorData}
 */
export function createArrowAnchorData(value) {
  if (!value || !isLatLngLiteral(value.latlng)) {
    throw new Error('Invalid ArrowAnchorData payload.');
  }
  return {
    latlng: createLatLngLiteral(value.latlng),
    handle1: value.handle1 ? createLatLngLiteral(value.handle1) : null,
    handle2: value.handle2 ? createLatLngLiteral(value.handle2) : null,
  };
}

/**
 * @param {any} value
 * @returns {ArrowParameters}
 */
export function createArrowParameters(value) {
  const data = value ?? {};
  const getNumberOrNull = (input) => (typeof input === 'number' && Number.isFinite(input) ? input : null);

  const legacyShaftThickness = getNumberOrNull(data.shaftThicknessPixels);
  const legacyHeadLength = getNumberOrNull(data.arrowHeadLengthPixels);
  const legacyHeadWidth = getNumberOrNull(data.arrowHeadWidthPixels);

  const rearWidthPx = getNumberOrNull(data.rearWidthPx) ?? legacyShaftThickness;
  const neckWidthPx = getNumberOrNull(data.neckWidthPx) ?? legacyShaftThickness;
  const headWidthPx = getNumberOrNull(data.headWidthPx) ?? legacyHeadWidth;
  const headLengthPx = getNumberOrNull(data.headLengthPx) ?? legacyHeadLength;

  return {
    rearWidthPx,
    neckWidthPx,
    headWidthPx,
    headLengthPx,
    baseZoom: getNumberOrNull(data.baseZoom),
  };
}

/**
 * @param {{id:string,latlng:any,handle1?:any,handle2?:any,_oldLatLng?:any,_handle1OffsetPixels?:any,_handle2OffsetPixels?:any}} value
 * @returns {ArrowAnchorEntity}
 */
export function createArrowAnchorEntity(value) {
  if (!value || typeof value.id !== 'string' || !value.id) {
    throw new Error('ArrowAnchorEntity requires a non-empty id.');
  }

  const result = {
    id: value.id,
    latlng: createLatLngLiteral(value.latlng),
    handle1: value.handle1 ? createLatLngLiteral(value.handle1) : null,
    handle2: value.handle2 ? createLatLngLiteral(value.handle2) : null,
  };

  if (value._oldLatLng) {
    result._oldLatLng = createLatLngLiteral(value._oldLatLng);
  }
  if (value._handle1OffsetPixels) {
    result._handle1OffsetPixels = value._handle1OffsetPixels;
  }
  if (value._handle2OffsetPixels) {
    result._handle2OffsetPixels = value._handle2OffsetPixels;
  }

  return result;
}

/**
 * @param {{savedAnchors:any[],arrowParameters:any,arrowName?:string}} value
 * @returns {PersistedArrow}
 */
export function createPersistedArrow(value) {
  return {
    savedAnchors: Array.isArray(value?.savedAnchors) ? value.savedAnchors.map(createArrowAnchorData) : [],
    arrowParameters: createArrowParameters(value?.arrowParameters),
    arrowName: typeof value?.arrowName === 'string' ? value.arrowName : '',
  };
}
