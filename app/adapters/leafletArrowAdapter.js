import L from 'leaflet';

/**
 * @param {{lat:number,lng:number}|import('leaflet').LatLng} value
 */
export function toLatLngLiteral(value) {
  return { lat: value.lat, lng: value.lng };
}

/**
 * @param {{lat:number,lng:number}|null|undefined} value
 */
export function toLeafletLatLng(value) {
  if (!value) return null;
  return L.latLng(value.lat, value.lng);
}

/**
 * @param {Array<{id?:string,latlng:any,handle1?:any,handle2?:any}>} anchors
 */
export function toArrowAnchorData(anchors) {
  return anchors.map((anchor) => ({
    latlng: toLatLngLiteral(anchor.latlng),
    handle1: anchor.handle1 ? toLatLngLiteral(anchor.handle1) : null,
    handle2: anchor.handle2 ? toLatLngLiteral(anchor.handle2) : null,
  }));
}

/**
 * @param {Array<{latlng:any,handle1?:any,handle2?:any}>} anchorsData
 * @param {string} [idSuffix='']
 */
export function fromArrowAnchorData(anchorsData, idSuffix = '') {
  return anchorsData.map((anchor, idx) => ({
    id: `${Date.now()}${Math.random()}${idSuffix}_${idx}`,
    latlng: toLatLngLiteral(anchor.latlng),
    handle1: anchor.handle1 ? toLatLngLiteral(anchor.handle1) : null,
    handle2: anchor.handle2 ? toLatLngLiteral(anchor.handle2) : null,
  }));
}
