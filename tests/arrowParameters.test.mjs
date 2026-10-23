import test from 'node:test';
import assert from 'node:assert/strict';
import { createArrowParameters, createPersistedArrow, resolveArrowParameters } from '../app/types/arrowModel.js';
import { clampFormValue } from '../app/types/shapeParameters.js';

const form = { shaftThicknessPx: 40, rearTaper: 0.7, frontTaper: 1.8, headLengthPx: 110, headWidthPx: 120, baseZoom: 6 };

test('original slider values survive persistence and reselection', () => {
  const arrow = createPersistedArrow({ id: 'stable-id', arrowName: 'Test', savedAnchors: [], arrowParameters: form });
  const restored = resolveArrowParameters(JSON.parse(JSON.stringify(arrow)).arrowParameters);
  for (const key of Object.keys(form)) assert.equal(restored[key], form[key]);
  assert.equal(arrow.id, 'stable-id');
  assert.equal(restored.rearWidthPx, 28);
  assert.equal(restored.neckWidthPx, 72);
});

test('legacy width-only parameters preserve geometry during migration', () => {
  const legacy = { rearWidthPx: 28, neckWidthPx: 72, headLengthPx: 110, headWidthPx: 120, baseZoom: 6 };
  const restored = resolveArrowParameters(legacy);
  for (const key of Object.keys(legacy)) assert.ok(Math.abs(restored[key] - legacy[key]) < 1e-10);
  assert.equal(restored.shaftThicknessPx, 50);
  assert.equal(restored.rearTaper, 0.56);
  assert.equal(restored.frontTaper, 1.44);
});

test('explicit form values determine derived widths even if old widths differ', () => {
  const params = createArrowParameters({ ...form, rearWidthPx: 100, neckWidthPx: 200 });
  assert.equal(params.rearWidthPx, 28);
  assert.equal(params.neckWidthPx, 72);
});

test('defaults and old parameter aliases remain supported', () => {
  const defaults = resolveArrowParameters({});
  assert.equal(defaults.rearWidthPx, 20);
  assert.equal(defaults.neckWidthPx, 16);
  const old = resolveArrowParameters({ shaftThicknessPixels: 12, arrowHeadLengthPixels: 33, arrowHeadWidthPixels: 44 });
  assert.equal(old.rearWidthPx, 12);
  assert.equal(old.neckWidthPx, 12);
  assert.equal(old.headLengthPx, 33);
  assert.equal(old.headWidthPx, 44);
});

test('minimum effective widths do not alter the original form settings', () => {
  const params = resolveArrowParameters({ shaftThicknessPx: 2, rearTaper: 0.2, frontTaper: 0.3 });
  assert.equal(params.rearWidthPx, 2);
  assert.equal(params.shaftThicknessPx, 2);
  assert.equal(params.rearTaper, 0.2);
  assert.equal(params.frontTaper, 0.3);
});

test('reference zoom and decimal numbers survive an eyedropper round trip', () => {
  const source = resolveArrowParameters({ ...form, shaftThicknessPx: 31.5, rearTaper: 1.37 });
  const target = resolveArrowParameters(createArrowParameters(source));
  assert.deepEqual(target, source);
  assert.equal(target.baseZoom, 6);
});

test('numeric fields clamp bounds and reject empty or non-finite entries', () => {
  assert.equal(clampFormValue('headWidth', 300), 240);
  assert.equal(clampFormValue('rearTaper', -1), 0.2);
  assert.equal(clampFormValue('headWidth', ''), null);
  assert.equal(clampFormValue('headWidth', NaN), null);
  assert.equal(clampFormValue('headWidth', Infinity), null);
  assert.equal(clampFormValue('shaftThickness', 31.5), 31.5);
});
