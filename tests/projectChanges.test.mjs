import test from 'node:test';
import assert from 'node:assert/strict';
import { EditingState } from '../types.js';
import { createArrowParameters, resolveArrowParameters } from '../app/types/arrowModel.js';
import { getProjectContentSignature } from '../app/state/projectChanges.js';

const arrow = {
    id: 'a', arrowName: 'Verbindung',
    savedAnchors: [
        { latlng: { lat: 50, lng: 10 }, handle1: null, handle2: { lat: 50.5, lng: 11 } },
        { latlng: { lat: 52, lng: 12 }, handle1: { lat: 51, lng: 11 }, handle2: null },
    ],
    arrowParameters: createArrowParameters({ shaftThicknessPx: 16, rearTaper: 1.25, frontTaper: 1, headLengthPx: 48, headWidthPx: 36, baseZoom: 6 }),
};
const template = { data: { type: 'FeatureCollection', features: [] }, visible: true, fileNames: [] };
const idle = () => ({ arrows: [structuredClone(arrow)], selectedArrow: null, editingState: EditingState.Idle, anchors: [], parameters: {}, name: '', counter: 2, backup: [] });
const selected = () => ({
    ...idle(), arrows: [], selectedArrow: structuredClone(arrow), editingState: EditingState.EditingSelected,
    anchors: arrow.savedAnchors.map((anchor, index) => ({ ...structuredClone(anchor), id: `temporary-${index}` })),
    parameters: { ...arrow.arrowParameters }, name: arrow.arrowName, backup: [structuredClone(arrow)],
});
const signature = (editor, reference = template) => getProjectContentSignature(editor, reference);

test('selecting an unchanged arrow does not mark the saved project dirty', () => {
    assert.equal(signature(idle()), signature(selected()));
});

test('arrow order, generated anchor IDs and cancellation metadata are not edits', () => {
    const before = idle();
    before.arrows.push({ ...structuredClone(arrow), id: 'b', arrowName: 'Zweiter Pfeil' });
    const after = selected();
    after.arrows = [before.arrows[1]];
    after.counter = 15;
    after.backup = [];
    assert.equal(signature(before), signature(after));
});

test('names, anchors, curve handles and original form values all mark the project dirty', () => {
    const baseline = signature(idle());
    for (const change of [
        editor => { editor.name = 'Umbenannt'; },
        editor => { editor.anchors[0].latlng.lat += 0.1; },
        editor => { editor.anchors[0].handle2.lng += 0.1; },
        editor => { editor.parameters.shaftThicknessPx = 32; },
        editor => { editor.parameters.baseZoom = 7; },
    ]) {
        const editor = selected();
        change(editor);
        assert.notEqual(signature(editor), baseline);
    }
});

test('returning to the saved content after undo clears the dirty state', () => {
    const baseline = signature(idle());
    const editor = selected();
    editor.name = 'Änderung';
    assert.notEqual(signature(editor), baseline);
    editor.name = arrow.arrowName;
    assert.equal(signature(editor), baseline);
});

test('deletion and unfinished drafts, including a draft with no anchors, are protected', () => {
    const baseline = signature(idle());
    const deleted = idle();
    deleted.arrows = [];
    assert.notEqual(signature(deleted), baseline);
    const draft = { ...idle(), editingState: EditingState.DrawingNew, name: 'Entwurf', parameters: arrow.arrowParameters };
    assert.notEqual(signature(draft), baseline);
    draft.anchors = [{ ...structuredClone(arrow.savedAnchors[0]), id: 'first' }];
    assert.notEqual(signature(draft), baseline);
});

test('template data, filenames and visibility are protected independently of arrow history', () => {
    for (const reference of [
        { ...template, visible: false },
        { ...template, fileNames: ['hilfe.geojson'] },
        { ...template, data: { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [10, 50] }, properties: {} }] } },
    ]) assert.notEqual(signature(idle(), reference), signature(idle()));
});

test('selecting legacy width-only arrows does not create a false unsaved change', () => {
    const before = idle();
    before.arrows[0].arrowParameters = { rearWidthPx: 20, neckWidthPx: 16, headWidthPx: 36, headLengthPx: 48, baseZoom: 6 };
    const after = selected();
    after.parameters = resolveArrowParameters(before.arrows[0].arrowParameters);
    assert.equal(signature(before), signature(after));
});
