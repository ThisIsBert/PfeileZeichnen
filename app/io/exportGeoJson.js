import L from 'leaflet';
import { getValidPointsAndLength, calculateArrowOutlinePoints } from '../geometry/index.js';

/**
 * @param {import('leaflet').Map} map
 * @param {Array<{latlng:any,handle1?:any,handle2?:any}>} anchorsData
 * @param {{shaftThicknessPixels:number|null,arrowHeadLengthPixels:number|null,arrowHeadWidthPixels:number|null,baseZoom:number|null}} params
 * @param {string} name
 */
export function generateGeoJsonForArrow(map, anchorsData, params, name) {
  if (!map || anchorsData.length < 2) return null;

  const { pts, totalLength, cumLengths } = getValidPointsAndLength(map, anchorsData);
  if (pts.length < 2) return null;

  let sTP = params.shaftThicknessPixels ?? 0;
  let aHLP = params.arrowHeadLengthPixels ?? 0;
  let aHWP = params.arrowHeadWidthPixels ?? 0;

  const scale = params.baseZoom !== null ? map.getZoomScale(map.getZoom(), params.baseZoom) : 1;
  sTP *= scale;
  aHLP *= scale;
  aHWP *= scale;

  const outlinePoints = calculateArrowOutlinePoints(pts, totalLength, cumLengths, sTP, aHLP, aHWP);
  if (!outlinePoints) return null;

  try {
    const coordinates = [outlinePoints.map((p) => {
      const latLng = map.layerPointToLatLng(L.point(p.x, p.y)).wrap();
      return [latLng.lng, latLng.lat];
    })];

    if (coordinates[0].length > 0) {
      const first = coordinates[0][0];
      const last = coordinates[0][coordinates[0].length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        coordinates[0].push([...first]);
      }
    }

    if (coordinates[0].length < 4) {
      console.error('GeoJSON generation: Not enough points for polygon.', coordinates[0]);
      return null;
    }

    return {
      type: 'Feature',
      properties: { name },
      geometry: { type: 'Polygon', coordinates },
    };
  } catch (error) {
    console.error('Error converting points to GeoJSON:', error);
    return null;
  }
}
