import L from 'leaflet';

/** Project at the file's zoom without changing the live map during validation. */
export function createProjectProjection(map, view) {
  const origin = map.project(view.center, view.zoom).subtract(map.getSize().divideBy(2)).round();
  return {
    getZoom: () => view.zoom,
    getZoomScale: (zoom, baseZoom) => map.getZoomScale(zoom, baseZoom),
    latLngToLayerPoint: latlng => map.project(latlng, view.zoom).round().subtract(origin),
    layerPointToLatLng: point => map.unproject(L.point(point).add(origin), view.zoom),
  };
}
