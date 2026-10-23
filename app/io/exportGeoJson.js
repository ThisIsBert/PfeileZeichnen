import { getValidPointsAndLength, calculateArrowOutlinePolygons } from '../geometry/index.js';

const GEOJSON_MAX_SEGMENT_LENGTH_PX = 4;
function densifyOutlinePoints(points, maxSegmentLengthPx = GEOJSON_MAX_SEGMENT_LENGTH_PX) {
  if (!Array.isArray(points) || points.length < 2 || maxSegmentLengthPx <= 0) {
    return points;
  }

  const densified = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const segmentLength = Math.hypot(dx, dy);
    const subdivisions = Math.max(1, Math.ceil(segmentLength / maxSegmentLengthPx));

    for (let step = 1; step <= subdivisions; step++) {
      const t = step / subdivisions;
      densified.push({
        x: prev.x + dx * t,
        y: prev.y + dy * t,
      });
    }
  }

  return densified;
}

/**
 * @param {import('leaflet').Map} map
 * @param {Array<{latlng:any,handle1?:any,handle2?:any}>} anchorsData
 * @param {{rearWidthPx:number|null,neckWidthPx:number|null,headWidthPx:number|null,headLengthPx:number|null,baseZoom:number|null}} params
 * @param {string} name
 */
export function generateGeoJsonForArrow(map, anchorsData, params, name) {
  if (!map || anchorsData.length < 2) return null;

  const { pts, centerline } = getValidPointsAndLength(map, anchorsData);
  if (pts.length < 2) return null;

  let rearWidthPx = params.rearWidthPx ?? 0;
  let neckWidthPx = params.neckWidthPx ?? 0;
  let headWidthPx = params.headWidthPx ?? 0;
  let headLengthPx = params.headLengthPx ?? 0;

  const scale = params.baseZoom !== null ? map.getZoomScale(map.getZoom(), params.baseZoom) : 1;
  rearWidthPx *= scale;
  neckWidthPx *= scale;
  headWidthPx *= scale;
  headLengthPx *= scale;

  const polygons = calculateArrowOutlinePolygons(centerline, rearWidthPx, neckWidthPx, headWidthPx, headLengthPx);
  if (!polygons) return null;

  try {
    // Leaflet screen y increases downward; reverse rings for GeoJSON winding.
    const coordinates = polygons.map(polygon => polygon.map(ring => {
      const coordinates = densifyOutlinePoints(ring).reverse().map(p => {
        const latLng = map.layerPointToLatLng(p).wrap();
        return [latLng.lng, latLng.lat];
      });
      // Use the exact first position to close each outer ring and hole.
      coordinates[coordinates.length - 1] = [...coordinates[0]];
      return coordinates;
    }));

    return {
      type: 'Feature',
      properties: { name },
      geometry: coordinates.length === 1
        ? { type: 'Polygon', coordinates: coordinates[0] }
        : { type: 'MultiPolygon', coordinates },
    };
  } catch (error) {
    console.error('Error converting points to GeoJSON:', error);
    return null;
  }
}
