import L from 'leaflet';

const TEMPLATE_PANE = 'templatePane';
const templateStyle = {
  pane: TEMPLATE_PANE,
  interactive: false,
  color: '#7c3aed',
  weight: 2,
  opacity: 0.8,
  fillColor: '#7c3aed',
  fillOpacity: 0.12,
  dashArray: '5 4',
};

export function setupTemplateLayer(map) {
  const pane = map.createPane(TEMPLATE_PANE);
  pane.style.zIndex = '350';
  pane.style.pointerEvents = 'none';
  const templateLayer = L.featureGroup().addTo(map);
  L.control.layers(null, { Vorlage: templateLayer }, { position: 'topleft', collapsed: false }).addTo(map);
  return templateLayer;
}

export function createTemplateGeometryLayer(data) {
  return L.geoJSON(data, {
    ...templateStyle,
    style: templateStyle,
    pointToLayer: (_feature, latlng) => L.circleMarker(latlng, {
      ...templateStyle,
      dashArray: null,
      radius: 5,
      fillOpacity: 0.35,
    }),
  });
}
