import L from 'leaflet';
import { HANDLE_OFFSET_ON_LINE_PIXELS } from '../../../constants.js';
import { pointAdd, pointLength, pointMultiply, pointSubtract } from '../../geometry/index.js';
import { createArrowAnchorEntity, createLatLngLiteral } from '../../types/arrowModel.js';

/**
 * @param {import('leaflet').Map} map
 * @param {Array<any>} prevAnchors
 * @param {import('leaflet').LatLng} newAnchorLatLng
 * @param {number} index
 * @param {string} newAnchorId
 */
export function insertAnchorWithAlignedHandles(map, prevAnchors, newAnchorLatLng, index, newAnchorId) {
  const updatedAnchors = [...prevAnchors];
  updatedAnchors.splice(index, 0, createArrowAnchorEntity({
    id: newAnchorId,
    latlng: createLatLngLiteral(newAnchorLatLng),
    handle1: createLatLngLiteral(newAnchorLatLng),
    handle2: createLatLngLiteral(newAnchorLatLng),
  }));

  if (index > 0) {
    const prevAnchor = updatedAnchors[index - 1];
    try {
      const pPrev = map.latLngToLayerPoint(L.latLng(prevAnchor.latlng.lat, prevAnchor.latlng.lng));
      const pNew = map.latLngToLayerPoint(newAnchorLatLng);
      const vec = pointSubtract(pNew, pPrev);
      const len = pointLength(vec);
      if (len > 1e-6) {
        const offsetVec = pointMultiply(vec, HANDLE_OFFSET_ON_LINE_PIXELS / len);
        const prevAnchorH2Pos = pointAdd(pPrev, offsetVec);
        prevAnchor.handle2 = createLatLngLiteral(map.layerPointToLatLng(L.point(prevAnchorH2Pos.x, prevAnchorH2Pos.y)).wrap());
        const newAnchorH1Pos = pointSubtract(pNew, offsetVec);
        updatedAnchors[index].handle1 = createLatLngLiteral(map.layerPointToLatLng(L.point(newAnchorH1Pos.x, newAnchorH1Pos.y)).wrap());
      }
    } catch (e) {
      console.error('Error aligning previous segment handles:', e);
    }
  }

  if (index < updatedAnchors.length - 1) {
    const nextAnchor = updatedAnchors[index + 1];
    try {
      const pNew = map.latLngToLayerPoint(newAnchorLatLng);
      const pNext = map.latLngToLayerPoint(L.latLng(nextAnchor.latlng.lat, nextAnchor.latlng.lng));
      const vec = pointSubtract(pNext, pNew);
      const len = pointLength(vec);
      if (len > 1e-6) {
        const offsetVec = pointMultiply(vec, HANDLE_OFFSET_ON_LINE_PIXELS / len);
        const newAnchorH2Pos = pointAdd(pNew, offsetVec);
        updatedAnchors[index].handle2 = createLatLngLiteral(map.layerPointToLatLng(L.point(newAnchorH2Pos.x, newAnchorH2Pos.y)).wrap());
        const nextAnchorH1Pos = pointSubtract(pNext, offsetVec);
        nextAnchor.handle1 = createLatLngLiteral(map.layerPointToLatLng(L.point(nextAnchorH1Pos.x, nextAnchorH1Pos.y)).wrap());
      }
    } catch (e) {
      console.error('Error aligning next segment handles:', e);
    }
  }

  return updatedAnchors;
}
