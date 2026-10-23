const invalid = message => { throw new Error(message); };
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const array = value => {
  if (!Array.isArray(value)) invalid('Die GeoJSON-Koordinaten müssen als Array vorliegen.');
  return value;
};
const position = value => {
  array(value);
  if (value.length < 2 || !value.every(number => typeof number === 'number' && Number.isFinite(number))) {
    invalid('Jede Position benötigt mindestens zwei endliche Zahlen: Längengrad und Breitengrad.');
  }
  if (value[1] < -90 || value[1] > 90) invalid('Die Breitengrade müssen zwischen -90 und 90 liegen (WGS84).');
};
const line = coordinates => {
  array(coordinates);
  if (coordinates.length < 2) invalid('Eine Linie benötigt mindestens zwei Positionen.');
  coordinates.forEach(position);
};
const polygon = coordinates => {
  array(coordinates);
  if (!coordinates.length) invalid('Ein Polygon benötigt mindestens einen Ring.');
  coordinates.forEach(ring => {
    array(ring);
    if (ring.length < 4) invalid('Ein Polygonring benötigt mindestens vier Positionen.');
    ring.forEach(position);
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) invalid('Die Polygonringe müssen geschlossen sein.');
  });
};
function geometry(value) {
  if (value === null) return null;
  if (!isObject(value)) invalid('Die Datei enthält keine gültige GeoJSON-Geometrie.');
  if (value.type === 'GeometryCollection') {
    if (!Array.isArray(value.geometries)) invalid('Eine GeometryCollection benötigt ein geometries-Array.');
    const geometries = value.geometries.map(geometry).filter(Boolean);
    return geometries.length ? { ...value, geometries } : null;
  }
  const validators = new Map([
    ['Point', position], ['MultiPoint', coordinates => coordinates.forEach(position)],
    ['LineString', line], ['MultiLineString', coordinates => coordinates.forEach(line)],
    ['Polygon', polygon], ['MultiPolygon', coordinates => coordinates.forEach(polygon)],
  ]);
  const validate = validators.get(value.type);
  if (!validate) invalid('Der GeoJSON-Geometrietyp wird nicht unterstützt.');
  const coordinates = array(value.coordinates);
  // GeoJSON permits empty coordinates and null geometries; skip these records.
  if (!coordinates.length) return null;
  validate(coordinates);
  return value;
}

/** Parse and validate before changing the map; return renderable GeoJSON only. */
export function parseTemplateGeoJson(text) {
  let data;
  try {
    data = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    invalid('Die Datei enthält kein gültiges JSON.');
  }
  if (!isObject(data)) invalid('Die Datei enthält kein gültiges GeoJSON-Objekt.');
  const feature = value => {
    if (!isObject(value) || value.type !== 'Feature') invalid('Eine FeatureCollection darf nur Features enthalten.');
    const normalizedGeometry = geometry(value.geometry);
    return normalizedGeometry ? { ...value, properties: value.properties ?? {}, geometry: normalizedGeometry } : null;
  };
  let features;
  if (data.type === 'FeatureCollection') {
    if (!Array.isArray(data.features)) invalid('Eine FeatureCollection benötigt ein features-Array.');
    features = data.features.map(feature).filter(Boolean);
  } else if (data.type === 'Feature') {
    features = [feature(data)].filter(Boolean);
  } else {
    const normalizedGeometry = geometry(data);
    features = normalizedGeometry ? [{ type: 'Feature', properties: {}, geometry: normalizedGeometry }] : [];
  }
  if (!features.length) invalid('Die Datei enthält keine darstellbaren Geometrien.');
  return { type: 'FeatureCollection', features };
}
