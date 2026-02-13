import L from 'leaflet';
import {
  getValidPointsAndLength,
  calculateArrowOutlinePoints,
  sampleCenterlineAtDistance,
} from '../geometry/index.js';


const GEOJSON_MAX_SEGMENT_LENGTH_PX = 2;

function buildDenseCenterline(centerline, maxSegmentLengthPx = GEOJSON_MAX_SEGMENT_LENGTH_PX) {
  if (!centerline || !Array.isArray(centerline.samples) || centerline.samples.length < 2 || maxSegmentLengthPx <= 0) {
    return centerline;
  }

  const totalLength = centerline.totalLength ?? 0;
  if (totalLength <= 1e-9) return centerline;

  const denseSamples = [];
  const stepCount = Math.max(1, Math.ceil(totalLength / maxSegmentLengthPx));

  for (let i = 0; i <= stepCount; i++) {
    const distance = Math.min(totalLength, (i / stepCount) * totalLength);
    const station = sampleCenterlineAtDistance(centerline, distance);
    if (!station) continue;

    const prev = denseSamples[denseSamples.length - 1];
    if (prev && Math.hypot(station.pt.x - prev.pt.x, station.pt.y - prev.pt.y) <= 1e-9) {
      continue;
    }

    denseSamples.push(station);
  }

  if (denseSamples.length < 2) return centerline;

  return {
    ...centerline,
    samples: denseSamples,
    points: denseSamples.map((sample) => sample.pt),
    cumLengths: denseSamples.map((sample) => sample.s),
    validCurveData: denseSamples.map((sample) => ({ pt: sample.pt, segIndex: sample.segIndex })),
  };
}

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

  const denseCenterline = centerline ? buildDenseCenterline(centerline) : null;

  const outlinePoints = denseCenterline
    ? calculateArrowOutlinePoints(denseCenterline, rearWidthPx, neckWidthPx, headWidthPx, headLengthPx)
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
