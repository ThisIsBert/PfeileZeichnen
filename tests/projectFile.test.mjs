import test from 'node:test';
import assert from 'node:assert/strict';
import { EditingState } from '../types.js';
import { createArrowParameters } from '../app/types/arrowModel.js';
import { parseProject, serializeProject, validateProject } from '../app/io/projectFile.js';

const form = { shaftThicknessPx: 31.5, rearTaper: 0.7, frontTaper: 1.8, headLengthPx: 70, headWidthPx: 80, baseZoom: 6 };
const anchors = [
  { id: 'a', latlng: { lat: 50, lng: 10 }, handle1: null, handle2: { lat: 51, lng: 10 } },
  { id: 'b', latlng: { lat: 52, lng: 12 }, handle1: { lat: 52, lng: 11 }, handle2: null },
  { id: 'c', latlng: { lat: 53, lng: 13 }, handle1: null, handle2: null },
];
const arrow = { id: 'arrow', arrowName: 'Pfeil Ä <test>', savedAnchors: anchors.map(({ id, ...data }) => data), arrowParameters: createArrowParameters(form) };
const empty = () => ({
  arrows: [], selectedArrow: null, editingState: EditingState.Idle, anchors: [],
  parameters: Object.fromEntries(Object.keys(form).map(key => [key, null])), name: '',
  counter: 1, backup: [], backupCounter: 1,
});
const view = { center: { lat: 50, lng: 10 }, zoom: 8 };
const template = { data: { type: 'FeatureCollection', features: [] }, visible: true, fileNames: [] };
const document = snapshot => JSON.parse(serializeProject(snapshot, view, template));

// Assertions compare user data, not implementation details of the JSON layout.
test('empty project survives save/load including nullable idle form fields', () => {
  const loaded = parseProject(serializeProject(empty(), view, template));
  assert.deepEqual(loaded.editor, empty());
  assert.deepEqual(loaded.view, view);
  assert.deepEqual(loaded.template, template);
});

test('all anchors, Bezier handles, original form values, names and IDs survive', () => {
  const snapshot = { ...empty(), arrows: [arrow], counter: 2 };
  const loaded = parseProject(serializeProject(snapshot, view, template));
  assert.deepEqual(loaded.editor, snapshot);
  for (const key of Object.keys(form)) assert.equal(loaded.editor.arrows[0].arrowParameters[key], form[key]);
});

test('selected edit and cancellation baseline survive independently', () => {
  const snapshot = { ...empty(), selectedArrow: arrow, editingState: EditingState.EditingSelected,
    anchors, parameters: { ...form, shaftThicknessPx: 45 }, name: 'Bearbeitet', backup: [arrow], counter: 2 };
  assert.deepEqual(parseProject(serializeProject(snapshot, view, template)).editor, snapshot);
});

test('drafts with zero or one anchor, and collapsed geometry, can be saved', () => {
  for (const draftAnchors of [[], [anchors[0]], [anchors[0], { ...anchors[0], id: 'other' }]]) {
    const snapshot = { ...empty(), editingState: EditingState.DrawingNew, anchors: draftAnchors, parameters: form, name: 'Entwurf' };
    assert.deepEqual(parseProject(serializeProject(snapshot, view, template)).editor, snapshot);
  }
});

test('template properties, geometry, filenames and hidden state survive', () => {
  const reference = { data: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { name: 'Vorlage' },
    geometry: { type: 'LineString', coordinates: [[10, 50, 100], [11, 51, 200]] } }] }, visible: false, fileNames: ['hilfe.geojson'] };
  assert.deepEqual(parseProject(serializeProject(empty(), view, reference)).template, reference);
});

test('BOM is accepted but malformed JSON, GeoJSON and future versions are rejected', () => {
  assert.deepEqual(parseProject('\uFEFF' + serializeProject(empty(), view, template)).editor, empty());
  assert.throws(() => parseProject('{'), /JSON/);
  assert.throws(() => parseProject(JSON.stringify(template.data)), /keine Pfeile-Projektdatei/);
  const doc = document(empty()); doc.version = 99;
  assert.throws(() => validateProject(doc), /Version/);
});

test('missing sections, arrays and field types are rejected', () => {
  for (const mutate of [
    d => { delete d.editor; }, d => { d.editor.arrows = {}; }, d => { d.editor.name = 3; },
    d => { d.template.visible = 'true'; }, d => { d.template.fileNames = [null]; },
    d => { d.editor.counter = 1.5; }, d => { d.editor.backupCounter = 0; },
  ]) {
    const doc = document(empty()); mutate(doc);
    assert.throws(() => validateProject(doc));
  }
});

test('non-finite, non-numeric and out-of-range map coordinates/zoom are rejected', () => {
  for (const mutate of [
    d => { d.view.center.lat = NaN; }, d => { d.view.center.lat = 91; },
    d => { d.view.center.lng = Infinity; }, d => { d.view.zoom = '6'; }, d => { d.view.zoom = 20; },
  ]) {
    const doc = document(empty()); mutate(doc);
    assert.throws(() => validateProject(doc));
  }
});

test('invalid saved arrow coordinates, handles and form parameters are rejected', () => {
  for (const mutate of [
    a => { a.savedAnchors = []; }, a => { a.savedAnchors[0].handle2.lat = 100; },
    a => { a.savedAnchors[0].latlng.lng = '10'; }, a => { a.arrowParameters.shaftThicknessPx = null; },
    a => { a.arrowParameters.rearTaper = -1; }, a => { a.arrowParameters.baseZoom = Infinity; },
    a => { a.arrowName = null; },
  ]) {
    const doc = document({ ...empty(), arrows: [arrow] }); mutate(doc.editor.arrows[0]);
    assert.throws(() => validateProject(doc));
  }
});

test('duplicate arrow/anchor IDs and contradictory editing states are rejected', () => {
  for (const mutate of [
    d => { d.editor.arrows.push(structuredClone(d.editor.arrows[0])); },
    d => { d.editor.arrows[0].id = ''; },
    d => { d.editor.editingState = EditingState.EditingSelected; },
    d => { d.editor.selectedArrow = d.editor.arrows[0]; },
    d => { d.editor.editingState = 3; },
    d => { d.editor.anchors = anchors; },
    d => { d.editor.editingState = EditingState.DrawingNew; d.editor.anchors = [anchors[0], anchors[0]]; },
  ]) {
    const doc = document({ ...empty(), arrows: [arrow] }); mutate(doc);
    assert.throws(() => validateProject(doc));
  }
});

test('invalid cancellation baseline or template rejects the entire document', () => {
  const doc = document({ ...empty(), backup: [arrow] });
  doc.editor.backup[0].savedAnchors[0].latlng.lat = 100;
  assert.throws(() => validateProject(doc));
  const badTemplate = document(empty());
  badTemplate.template.data.features = [{ type: 'Feature', geometry: { type: 'Point', coordinates: [10, 100] } }];
  assert.throws(() => validateProject(badTemplate), /Breitengrade/);
});
