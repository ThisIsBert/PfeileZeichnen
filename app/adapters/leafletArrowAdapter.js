import L from 'leaflet';
import { createArrowAnchorData, createArrowAnchorEntity, createLatLngLiteral } from '../types/arrowModel.js';

/**
 * @param {{lat:number,lng:number}|import('leaflet').LatLng} value
 */
export function toLatLngLiteral(value) {
  return createLatLngLiteral(value);
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
  return anchors.map((anchor) => createArrowAnchorData(anchor));
}

/**
 * @param {Array<{latlng:any,handle1?:any,handle2?:any}>} anchorsData
 * @param {string} [idSuffix='']
 */
export function fromArrowAnchorData(anchorsData, idSuffix = '') {
  return anchorsData.map((anchor, idx) => createArrowAnchorEntity({
    id: `${Date.now()}${Math.random()}${idSuffix}_${idx}`,
    latlng: anchor.latlng,
    handle1: anchor.handle1,
    handle2: anchor.handle2,
  }));
}
