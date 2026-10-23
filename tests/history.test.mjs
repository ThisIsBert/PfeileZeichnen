import test from 'node:test';
import assert from 'node:assert/strict';
import { createHistory } from '../app/state/history.js';

const scene = (x, width = 20) => ({ arrows: [{ id: 'a', anchors: [{ x, y: 12 }], width }], draft: null });

test('undo and redo restore full independent snapshots', () => {
  const history = createHistory();
  const before = scene(10);
  const after = scene(40, 35);
  history.record(before, after);
  after.arrows[0].width = 100;
  const undone = history.undo();
  assert.deepEqual(undone, scene(10));
  undone.arrows.length = 0;
  assert.deepEqual(history.redo(), scene(40, 35));
});

test('a drag is one entry when only its start and end are recorded', () => {
  const history = createHistory();
  history.record(scene(0), scene(250));
  assert.deepEqual(history.undo(), scene(0));
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, true);
  assert.deepEqual(history.redo(), scene(250));
});

test('new edits clear redo, but no-op actions preserve it', () => {
  const history = createHistory();
  history.record(scene(0), scene(10));
  history.undo();
  assert.equal(history.record(scene(0), scene(0)), false);
  assert.equal(history.canRedo, true);
  history.record(scene(0), scene(20));
  assert.equal(history.canRedo, false);
  assert.equal(history.redo(), null);
});

test('creation, deletion and draft metadata can all be restored', () => {
  const history = createHistory();
  const draft = { arrows: [], draft: { name: 'Entwurf', parameters: { shaftThicknessPx: 37, baseZoom: 6 }, anchors: [{ id: 'p1', lat: 50, lng: 12 }] } };
  history.record(draft, { arrows: [], draft: null });
  assert.deepEqual(history.undo(), draft);
});

test('history respects its memory limit and empty histories are safe', () => {
  const history = createHistory(2);
  assert.equal(history.undo(), null);
  assert.equal(history.redo(), null);
  history.record(scene(0), scene(1));
  history.record(scene(1), scene(2));
  history.record(scene(2), scene(3));
  assert.deepEqual(history.undo(), scene(2));
  assert.deepEqual(history.undo(), scene(1));
  assert.equal(history.undo(), null);
});
