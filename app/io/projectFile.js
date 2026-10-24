import { EditingState } from '../../types.js';
import { createArrowAnchorData, createPersistedArrow } from '../types/arrowModel.js';
import { parseTemplateGeoJson } from './importGeoJson.js';

const FORMAT = 'pfeile-zeichnen-project';
const VERSION = 1;
export const MAX_PROJECT_BYTES = 20 * 1024 * 1024;
const fail = message => { throw new Error(message); };
const object = value => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Ungültiges Projektobjekt.');
  return value;
};
const list = value => {
  if (!Array.isArray(value)) fail('Im Projekt fehlt eine gültige Liste.');
  return value;
};
const string = value => {
  if (typeof value !== 'string') fail('Im Projekt fehlt ein gültiger Text.');
  return value;
};
const number = (value, min, max) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    fail('Das Projekt enthält ungültige Zahlen oder Werte außerhalb des gültigen Bereichs.');
  }
  return value;
};
const counter = value => {
  if (!Number.isSafeInteger(value) || value < 1) fail('Ungültiger Pfeilzähler.');
  return value;
};
const position = value => ({ lat: number(object(value).lat, -90, 90), lng: number(value.lng, -1e6, 1e6) });
const anchor = value => {
  object(value);
  return createArrowAnchorData({ latlng: position(value.latlng),
    handle1: value.handle1 === null ? null : position(value.handle1),
    handle2: value.handle2 === null ? null : position(value.handle2) });
};
const parameters = (value, nullable = false) => {
  object(value);
  const result = {};
  for (const key of ['shaftThicknessPx', 'rearTaper', 'frontTaper', 'headLengthPx', 'headWidthPx', 'baseZoom']) {
    result[key] = nullable && value[key] === null ? null
      : number(value[key], key === 'baseZoom' ? 0 : Number.MIN_VALUE, key === 'baseZoom' ? 24 : 1e6);
  }
  return result;
};
const unique = values => {
  const ids = values.map(value => value.id);
  if (ids.some(id => !id) || new Set(ids).size !== ids.length) fail('Das Projekt enthält fehlende oder doppelte IDs.');
  return values;
};
const arrow = value => {
  object(value);
  const savedAnchors = list(value.savedAnchors).map(anchor);
  if (savedAnchors.length < 2) fail('Ein gespeicherter Pfeil benötigt mindestens zwei Stützpunkte.');
  return createPersistedArrow({ id: string(value.id), arrowName: string(value.arrowName),
    savedAnchors, arrowParameters: parameters(value.arrowParameters) });
};
function editor(value) {
  object(value);
  if (![EditingState.Idle, EditingState.DrawingNew, EditingState.EditingSelected].includes(value.editingState)) {
    fail('Ungültiger Bearbeitungszustand.');
  }
  const arrows = unique(list(value.arrows).map(arrow));
  const selectedArrow = value.selectedArrow === null ? null : arrow(value.selectedArrow);
  const anchors = unique(list(value.anchors).map(item => ({ id: string(object(item).id), ...anchor(item) })));
  const idle = value.editingState === EditingState.Idle;
  if ((value.editingState === EditingState.EditingSelected) !== Boolean(selectedArrow)
    || (selectedArrow && (!selectedArrow.id || arrows.some(item => item.id === selectedArrow.id)))
    || (idle && anchors.length)) fail('Der Bearbeitungszustand des Projekts ist widersprüchlich.');
  return {
    arrows, selectedArrow, anchors, editingState: value.editingState,
    parameters: parameters(value.parameters, true), name: string(value.name), counter: counter(value.counter),
    backup: unique(list(value.backup).map(arrow)), backupCounter: counter(value.backupCounter),
  };
}

/** Validate and normalize the complete document before touching editor or map. */
export function validateProject(value) {
  object(value);
  if (value.format !== FORMAT) fail('Dies ist keine Pfeile-Projektdatei. GeoJSON bitte unter „Vorlage“ laden.');
  if (value.version !== VERSION) fail('Diese Version der Projektdatei wird nicht unterstützt.');
  const view = object(value.view);
  const template = object(value.template);
  if (typeof template.visible !== 'boolean') fail('Ungültige Sichtbarkeit der Vorlage.');
  const data = object(template.data);
  const empty = data.type === 'FeatureCollection' && Array.isArray(data.features) && !data.features.length;
  return {
    format: FORMAT, version: VERSION, editor: editor(value.editor),
    view: { center: position(view.center), zoom: number(view.zoom, 0, 19) },
    template: { data: empty ? { type: 'FeatureCollection', features: [] } : parseTemplateGeoJson(JSON.stringify(data)),
      visible: template.visible, fileNames: list(template.fileNames).map(string) },
  };
}

export function serializeProject(editorSnapshot, view, template) {
  return JSON.stringify(validateProject({ format: FORMAT, version: VERSION, editor: editorSnapshot, view, template }), null, 2);
}

export function parseProject(text) {
  let value;
  try { value = JSON.parse(text.replace(/^\uFEFF/, '')); }
  catch { fail('Die Datei enthält kein gültiges JSON.'); }
  return validateProject(value);
}
