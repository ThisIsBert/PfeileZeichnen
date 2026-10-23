import test from 'node:test';
import assert from 'node:assert/strict';
import { buildArrowCenterline, sampleCenterlineAtDistance, calculateArrowOutlinePolygons, calculateArrowOutlinePoints } from '../utils/geometry.js';
import { generateGeoJsonForArrow } from '../app/io/exportGeoJson.js';

// A linear map projection isolates geometry from browser and Leaflet rendering.
const mapAtScale = (scale = 1) => ({
  latLngToLayerPoint: ({ lat, lng }) => ({ x: lng * scale, y: -lat * scale }),
  layerPointToLatLng: ({ x, y }) => ({ lng: x / scale, lat: -y / scale, wrap() { return this; } }),
  getZoom: () => Math.log2(scale),
  getZoomScale: (zoom, base) => 2 ** (zoom - base),
});
const anchors = points => points.map(([x, y]) => ({ latlng: { lng: x, lat: -y }, handle1: null, handle2: null }));
const area = ring => ring.slice(1).reduce((sum, p, i) => sum + ring[i][0] * p[1] - p[0] * ring[i][1], 0) / 2;
const cross = (a, b, p) => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
function assertValidOutline(polygons) {
  assert.ok(polygons?.length);
  for (const polygon of polygons) {
    for (const ring of polygon) {
      assert.ok(ring.length >= 4);
      assert.deepEqual(ring[0], ring.at(-1));
      assert.ok(ring.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)));
      // No proper crossings between nonadjacent ring edges.
      for (let i = 1; i < ring.length; i++) {
        for (let j = i + 2; j < ring.length; j++) {
          const [a, b, c, d] = [ring[i - 1], ring[i], ring[j - 1], ring[j]];
          assert.ok(!(cross(a, b, c) * cross(a, b, d) < -1e-8 && cross(c, d, a) * cross(c, d, b) < -1e-8), `ring self-intersects: ${JSON.stringify([a, b, c, d])}`);
        }
      }
    }
  }
}

for (const [name, points] of [
  ['two anchors', [[0, 0], [300, 0]]],
  ['many bends', [[0, 0], [150, 0], [180, 100], [290, 40], [300, 220]]],
  ['sharp reversal', [[0, 0], [200, 0], [30, 20], [250, 140], [280, 30]]],
  ['crossing', [[0, 0], [200, 200], [0, 200], [200, 0], [300, 100]]],
  ['repeated anchors', [[0, 0], [0, 0], [100, 0], [100, 0], [200, 100]]],
  ['very short segments', [[0, 0], [1, 0], [1, 1], [2, 1]]],
]) {
  test(`closed, finite outline without crossings: ${name}`, () => {
    const centerline = buildArrowCenterline(mapAtScale(), anchors(points));
    const polygons = calculateArrowOutlinePolygons(centerline, 20, 16, 36, 48);
    assertValidOutline(polygons);
    assert.equal(polygons.length, 1, 'adjacent strips form one connected polygon');
  });
}

test('loop preserves its hole', () => {
  const centerline = buildArrowCenterline(mapAtScale(), anchors([[0, 0], [200, 0], [200, 200], [0, 200], [0, 0], [100, 0]]));
  const polygons = calculateArrowOutlinePolygons(centerline, 16, 16, 36, 48);
  assertValidOutline(polygons);
  assert.ok(polygons.some(polygon => polygon.length > 1));
});

test('station interpolation remains continuous after a cubic junction', () => {
  const centerline = buildArrowCenterline(mapAtScale(), anchors([[0, 0], [200, 0], [200, 200]]));
  const station = sampleCenterlineAtDistance(centerline, 200.01);
  assert.ok(Math.abs(station.pt.x - 200) < 1e-6);
  assert.ok(station.pt.y > 0 && station.pt.y < 0.1);
});

test('head can cover the whole arrow without invalid shaft geometry', () => {
  const centerline = buildArrowCenterline(mapAtScale(), anchors([[0, 0], [20, 0], [20, 20]]));
  assertValidOutline(calculateArrowOutlinePolygons(centerline, 20, 16, 36, 500));
});

test('zero-length path has no polygon', () => {
  const centerline = buildArrowCenterline(mapAtScale(), anchors([[10, 10], [10, 10], [10, 10]]));
  assert.equal(calculateArrowOutlinePolygons(centerline, 20, 16, 36, 48), null);
});

test('legacy point-array outline API still works', () => {
  const ring = calculateArrowOutlinePoints([{ x: 0, y: 0 }, { x: 300, y: 0 }], 300, [0, 300], 20, 16, 36, 48);
  assert.ok(ring?.length >= 4);
  assert.deepEqual(ring[0], ring.at(-1));
});

test('GeoJSON exports named, closed rings with correct winding and holes', () => {
  const data = anchors([[0, 0], [200, 0], [200, 200], [0, 200], [0, 0], [100, 0]]);
  const feature = generateGeoJsonForArrow(mapAtScale(), data, { rearWidthPx: 16, neckWidthPx: 16, headWidthPx: 36, headLengthPx: 48, baseZoom: 0 }, 'Schleife');
  assert.equal(feature.properties.name, 'Schleife');
  assert.equal(feature.geometry.type, 'Polygon');
  assert.ok(feature.geometry.coordinates.length > 1);
  feature.geometry.coordinates.forEach((ring, i) => {
    assert.deepEqual(ring[0], ring.at(-1));
    assert.ok(i === 0 ? area(ring) > 0 : area(ring) < 0, 'GeoJSON winding follows the right-hand rule');
  });
});

test('export geometry remains stable across zoom changes', () => {
  const data = anchors([[0, 0], [200, 0], [200, 200], [400, 200]]);
  const params = { rearWidthPx: 20, neckWidthPx: 16, headWidthPx: 36, headLengthPx: 48, baseZoom: 0 };
  const bounds = feature => {
    const positions = feature.geometry.type === 'Polygon' ? feature.geometry.coordinates.flat() : feature.geometry.coordinates.flat(2);
    return [Math.min(...positions.map(p => p[0])), Math.max(...positions.map(p => p[0])), Math.min(...positions.map(p => p[1])), Math.max(...positions.map(p => p[1]))];
  };
  assert.deepEqual(bounds(generateGeoJsonForArrow(mapAtScale(), data, params, 'A')), bounds(generateGeoJsonForArrow(mapAtScale(2), data, params, 'A')));
});

test('curved Bezier segments with rounded map coordinates remain valid', () => {
  let seed = 314159;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const point = () => ({ lng: random() * 500, lat: random() * 500 });
  const data = Array.from({ length: 8 }, () => ({ latlng: point(), handle1: point(), handle2: point() }));
  const map = { latLngToLayerPoint: ({ lat, lng }) => ({ x: Math.round(lng), y: Math.round(lat) }) };
  const centerline = buildArrowCenterline(map, data);
  assertValidOutline(calculateArrowOutlinePolygons(centerline, 20, 16, 36, 48));
});

test('more than one hundred anchors are included in the outline', () => {
  const data = anchors(Array.from({ length: 120 }, (_, i) => [i * 15, Math.sin(i / 6) * 50]));
  const centerline = buildArrowCenterline(mapAtScale(), data);
  assert.equal(centerline.segments.length, 119);
  const polygons = calculateArrowOutlinePolygons(centerline, 20, 16, 36, 48);
  assertValidOutline(polygons);
  assert.ok(polygons.flat(2).some(p => Math.abs(p.x - 1785) < 0.001 && Math.abs(p.y - Math.sin(119 / 6) * 50) < 0.001));
});

test('curved shaft and head meet without an inward hairline', () => {
  // This shallow curve used to produce a 51 px backtracking edge at the neck.
  const data = [
    { latlng: { lng: 260, lat: -200 }, handle2: { lng: 282.1132283657789, lat: 125.41373248677701 } },
    { latlng: { lng: 330, lat: 640 }, handle1: { lng: 320.0092197395861, lat: 472.2227869788185 } },
  ];
  const map = { latLngToLayerPoint: ({ lat, lng }) => ({ x: Math.round(lng), y: Math.round(lat) }) };
  const centerline = buildArrowCenterline(map, data);
  const polygons = calculateArrowOutlinePolygons(centerline, 140, 160, 360, 500);
  assertValidOutline(polygons);
  assert.equal(polygons.length, 1);
  assert.equal(polygons[0].length, 1, 'no narrow hole between shaft and head');
  const ring = polygons[0][0].slice(0, -1);
  for (let i = 0; i < ring.length; i++) {
    const a = ring[(i + ring.length - 1) % ring.length];
    const b = ring[i];
    const c = ring[(i + 1) % ring.length];
    const u = { x: b.x - a.x, y: b.y - a.y };
    const v = { x: c.x - b.x, y: c.y - b.y };
    const lengths = [Math.hypot(u.x, u.y), Math.hypot(v.x, v.y)];
    const backtracks = u.x * v.x + u.y * v.y < 0;
    const angleSine = Math.abs(u.x * v.y - u.y * v.x) / (lengths[0] * lengths[1]);
    assert.ok(!(backtracks && angleSine < 0.001 && Math.min(...lengths) > 2), 'neck has a visible inward spur');
  }
});


test('head retains its tip when the neck lands on a right-angle anchor', () => {
  const centerline = buildArrowCenterline(mapAtScale(), anchors([[0, 0], [200, 0], [200, 200]]));
  const polygons = calculateArrowOutlinePolygons(centerline, 20, 16, 36, 200);
  assertValidOutline(polygons);
  assert.ok(polygons.flat(2).some(p => Math.abs(p.x - 200) < 0.001 && Math.abs(p.y - 200) < 0.001));
});
