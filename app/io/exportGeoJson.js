import L from 'leaflet';
import { getValidPointsAndLength, calculateArrowOutlinePoints, sampleCenterlineAtDistance } from '../geometry/index.js';

const GEOJSON_MAX_SEGMENT_LENGTH_PX = 4;
const GEOJSON_CENTERLINE_STEP_PX = 2;

function buildExportCenterline(centerline, maxStepPx = GEOJSON_CENTERLINE_STEP_PX) {
  if (!centerline || centerline.totalLength <= 0 || maxStepPx <= 0) {
    return centerline;
  }

  const stepCount = Math.max(1, Math.ceil(centerline.totalLength / maxStepPx));
  const samples = [];
  const points = [];
  const cumLengths = [];
  const sampleContext = {};

  for (let i = 0; i <= stepCount; i++) {
    const s = (i / stepCount) * centerline.totalLength;
    const station = sampleCenterlineAtDistance(centerline, s, sampleContext);
    if (!station) {
      continue;
    }
    samples.push(station);
    points.push(station.pt);
    cumLengths.push(station.s);
  }

  if (samples.length < 2) {
    return centerline;
  }

  return {
    ...centerline,
    samples,
    points,
    cumLengths,
  };
}

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

  const { pts, totalLength, cumLengths, centerline } = getValidPointsAndLength(map, anchorsData);
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

  const exportCenterline = centerline ? buildExportCenterline(centerline) : null;

  const outlinePoints = exportCenterline
    ? calculateArrowOutlinePoints(exportCenterline, rearWidthPx, neckWidthPx, headWidthPx, headLengthPx)
    : calculateArrowOutlinePoints(pts, totalLength, cumLengths, rearWidthPx, neckWidthPx, headWidthPx, headLengthPx);
  if (!outlinePoints) return null;

  try {
    const smoothOutlinePoints = densifyOutlinePoints(outlinePoints);
    const coordinates = [smoothOutlinePoints.map((p) => {
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
