import L from 'leaflet';
import { pointAdd, pointSubtract } from '../../geometry/index.js';
import { createLatLngLiteral } from '../../types/arrowModel.js';

/**
 * @param {import('leaflet').Map} map
 * @param {MouseEvent} originalEvent
 */
export function getContainerPoint(map, originalEvent) {
  const mousePoint = map.mouseEventToContainerPoint(originalEvent);
  return { x: mousePoint.x, y: mousePoint.y };
}

/**
 * @param {import('leaflet').Map} map
 * @param {Array<any>} anchors
 */
export function getInitialLayerPoints(map, anchors) {
  return {
    anchor: anchors.map((a) => (a.latlng ? map.latLngToLayerPoint(L.latLng(a.latlng.lat, a.latlng.lng)) : null)),
    handle1: anchors.map((a) => (a.handle1 ? map.latLngToLayerPoint(L.latLng(a.handle1.lat, a.handle1.lng)) : null)),
    handle2: anchors.map((a) => (a.handle2 ? map.latLngToLayerPoint(L.latLng(a.handle2.lat, a.handle2.lng)) : null)),
  };
}

/**
 * @param {import('leaflet').Map} map
 * @param {Array<any>} prevAnchors
 * @param {{x:number,y:number}} delta
 * @param {Array<any>} initialAnchors
 * @param {Array<any>} initialHandle1
 * @param {Array<any>} initialHandle2
 */
export function translateAnchorsByDelta(map, prevAnchors, delta, initialAnchors, initialHandle1, initialHandle2) {
  return prevAnchors.map((anchor, i) => {
    const newAnchorPart = {};
    try {
      if (initialAnchors[i]) {
        const newAnchorGeomPoint = pointAdd(initialAnchors[i], delta);
        newAnchorPart.latlng = createLatLngLiteral(map.layerPointToLatLng(L.point(newAnchorGeomPoint.x, newAnchorGeomPoint.y)));
      }
      if (anchor.handle1 && initialHandle1[i]) {
        const newHandle1GeomPoint = pointAdd(initialHandle1[i], delta);
        newAnchorPart.handle1 = createLatLngLiteral(map.layerPointToLatLng(L.point(newHandle1GeomPoint.x, newHandle1GeomPoint.y)));
      }
      if (anchor.handle2 && initialHandle2[i]) {
        const newHandle2GeomPoint = pointAdd(initialHandle2[i], delta);
        newAnchorPart.handle2 = createLatLngLiteral(map.layerPointToLatLng(L.point(newHandle2GeomPoint.x, newHandle2GeomPoint.y)));
      }
    } catch (error) {
      console.error('Arrow drag update error:', error);
    }
    return { ...anchor, ...newAnchorPart };
  });
}

export { pointSubtract };
