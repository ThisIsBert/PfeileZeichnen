export function arrowsToGeoJSON(arrows) {
  const features = arrows.map((a) => ({
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: a.points.map((p) => [p.lng, p.lat]),
    },
    properties: { id: a.id },
  }));
  return { type: 'FeatureCollection', features };
}
