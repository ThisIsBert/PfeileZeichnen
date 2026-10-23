import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTemplateGeoJson } from '../app/io/importGeoJson.js';

const point = { type: 'Point', coordinates: [13.4, 52.5] };
const line = { type: 'LineString', coordinates: [[13, 52], [14, 53]] };
const ring = [[10, 50], [12, 50], [12, 52], [10, 50]];
const parse = data => parseTemplateGeoJson(JSON.stringify(data));

for (const geometry of [
  point,
  { type: 'MultiPoint', coordinates: [[13, 52], [14, 53, 15]] },
  line,
  { type: 'MultiLineString', coordinates: [line.coordinates, [[12, 50], [13, 51]]] },
  { type: 'Polygon', coordinates: [ring] },
  { type: 'MultiPolygon', coordinates: [[ring], [ring]] },
  { type: 'GeometryCollection', geometries: [point, line, { type: 'GeometryCollection', geometries: [point] }] },
]) {
  test(`imports a standalone ${geometry.type}`, () => {
    const result = parse(geometry);
    assert.equal(result.type, 'FeatureCollection');
    assert.equal(result.features.length, 1);
    assert.deepEqual(result.features[0].geometry, geometry);
  });
}

test('preserves feature properties, IDs and polygon holes', () => {
  const hole = [[10.5, 50.5], [10.7, 50.5], [10.6, 50.6], [10.5, 50.5]];
  const feature = { type: 'Feature', id: 'boundary', properties: { name: '<b>Boundary</b>' }, geometry: { type: 'Polygon', coordinates: [ring, hole] } };
  assert.deepEqual(parse(feature).features[0], feature);
});

test('imports an exported arrow FeatureCollection and ignores null geometry', () => {
  const features = [
    { type: 'Feature', properties: { name: 'Pfeil 1' }, geometry: { type: 'Polygon', coordinates: [ring] } },
    { type: 'Feature', properties: {}, geometry: null },
    { type: 'Feature', properties: null, geometry: point },
  ];
  const result = parse({ type: 'FeatureCollection', features });
  assert.equal(result.features.length, 2);
  assert.equal(result.features[0].properties.name, 'Pfeil 1');
  assert.deepEqual(result.features[1].properties, {});
});

test('accepts a UTF-8 BOM and surrounding whitespace', () => {
  assert.deepEqual(parseTemplateGeoJson('\uFEFF \n' + JSON.stringify(point) + '\n').features[0].geometry, point);
});

for (const [name, input] of [
  ['malformed JSON', '{'],
  ['non-object root', '[]'],
  ['unsupported geometry', JSON.stringify({ type: 'Topology' })],
  ['malformed collection', JSON.stringify({ type: 'FeatureCollection', features: {} })],
  ['non-feature collection member', JSON.stringify({ type: 'FeatureCollection', features: [point] })],
  ['missing feature geometry', JSON.stringify({ type: 'Feature', properties: {} })],
  ['missing coordinates', JSON.stringify({ type: 'Point' })],
  ['non-numeric position', JSON.stringify({ type: 'Point', coordinates: ['13', 52] })],
  ['infinite position', '{"type":"Point","coordinates":[1e309,52]}'],
  ['projected latitude', JSON.stringify({ type: 'Point', coordinates: [100, 520000] })],
  ['short line', JSON.stringify({ type: 'LineString', coordinates: [[13, 52]] })],
  ['unclosed polygon', JSON.stringify({ type: 'Polygon', coordinates: [[[10, 50], [12, 50], [12, 52], [10, 52]]] })],
  ['malformed geometry collection', JSON.stringify({ type: 'GeometryCollection', geometries: null })],
  ['empty collection', JSON.stringify({ type: 'FeatureCollection', features: [] })],
  ['only null geometries', JSON.stringify({ type: 'Feature', geometry: null })],
  ['only empty geometries', JSON.stringify({ type: 'GeometryCollection', geometries: [{ type: 'Point', coordinates: [] }] })],
]) {
  test(`rejects ${name} with a readable error`, () => {
    assert.throws(() => parseTemplateGeoJson(input), error => error instanceof Error && error.message.length > 10);
  });
}

test('rejects an invalid later feature instead of importing a partial collection', () => {
  assert.throws(() => parse({ type: 'FeatureCollection', features: [
    { type: 'Feature', geometry: point },
    { type: 'Feature', geometry: { type: 'LineString', coordinates: [[12, 50]] } },
  ] }));
});
