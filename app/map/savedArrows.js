import L from 'leaflet';
import { getValidPointsAndLength, calculateArrowOutlinePolygons } from '../geometry/index.js';
import { createPersistedArrow } from '../types/arrowModel.js';

export function getSavedArrowData(group) {
  return createPersistedArrow({
    id: group.arrowId,
    savedAnchors: group.savedAnchors,
    arrowParameters: group.arrowParameters,
    arrowName: group.arrowName,
  });
}

/** Build off-map, so failure cannot remove the arrow that is being edited. */
export function createSavedArrowGroup(map, data, bindInteractions) {
  if (!map) return null;
  try {
    const arrow = createPersistedArrow(data);
    const { centerline } = getValidPointsAndLength(map, arrow.savedAnchors);
    if (!centerline) return null;
    const params = arrow.arrowParameters;
    const scale = params.baseZoom !== null ? map.getZoomScale(map.getZoom(), params.baseZoom) : 1;
    const polygons = calculateArrowOutlinePolygons(centerline, (params.rearWidthPx ?? 0) * scale,
      (params.neckWidthPx ?? 0) * scale, (params.headWidthPx ?? 0) * scale, (params.headLengthPx ?? 0) * scale);
    if (!polygons) return null;
    const group = L.layerGroup();
    const latlngs = polygons.map(polygon => polygon.map(ring => ring.map(p => map.layerPointToLatLng(L.point(p.x, p.y)))));
    const shape = L.polygon(latlngs, { color: 'red', fillColor: 'red', fillOpacity: 0.5, weight: 1 });
    group.arrowId = arrow.id || globalThis.crypto?.randomUUID?.() || `arrow-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    group.savedAnchors = arrow.savedAnchors;
    group.arrowParameters = arrow.arrowParameters;
    group.arrowName = arrow.arrowName;
    bindInteractions(shape, group);
    group.addLayer(shape);
    return group;
  } catch (error) {
    console.error('Could not build arrow geometry:', error);
    return null;
  }
}
