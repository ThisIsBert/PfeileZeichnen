import { getValidPointsAndLength } from '../../geometry/index.js';

/**
 * @param {import('leaflet').Map} map
 * @param {import('leaflet').LatLng} clickLatLng
 * @param {Array<{latlng:any,handle1?:any,handle2?:any}>} anchorsData
 */
export function findClosestCurveSegmentIndex(map, clickLatLng, anchorsData) {
  const clickPtLPoint = map.latLngToLayerPoint(clickLatLng);
  const clickPt = { x: clickPtLPoint.x, y: clickPtLPoint.y };
  const { validCurveData } = getValidPointsAndLength(map, anchorsData);
  if (!validCurveData || validCurveData.length === 0) return -1;

  let minDistSq = Infinity;
  let closestSegIndex = -1;

  validCurveData.forEach((d) => {
    const dx = d.pt.x - clickPt.x;
    const dy = d.pt.y - clickPt.y;
    const distSq = dx * dx + dy * dy;
    if (distSq < minDistSq) {
      minDistSq = distSq;
      closestSegIndex = d.segIndex;
    }
  });

  return closestSegIndex;
}
