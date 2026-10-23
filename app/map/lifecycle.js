import L from 'leaflet';
import { setupTemplateLayer } from './templateLayer.js';
import { INITIAL_MAP_CENTER, INITIAL_MAP_ZOOM } from '../../constants.js';

/**
 * @param {HTMLElement} container
 */
export function setupLeafletMap(container) {
  const map = L.map(container).setView(INITIAL_MAP_CENTER, INITIAL_MAP_ZOOM);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors',
  }).addTo(map);

  return {
    map,
    templateLayer: setupTemplateLayer(map),
    drawingLayer: L.layerGroup().addTo(map),
    arrowLayer: L.layerGroup().addTo(map),
    editingArrowLayer: L.layerGroup().addTo(map),
  };
}

/**
 * @param {import('leaflet').Map | null} map
 */
export function teardownLeafletMap(map) {
  map?.remove();
}
