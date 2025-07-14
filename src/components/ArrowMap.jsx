import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { INITIAL_MAP_CENTER, INITIAL_MAP_ZOOM } from '../constants.js';
import { EditingState } from '../types.js';

export default function ArrowMap({ anchors, arrows, editingState, addPoint }) {
  const mapRef = useRef(null);
  const drawingLayerRef = useRef(null);
  const arrowLayerRef = useRef(null);

  useEffect(() => {
    const map = L.map('map').setView(INITIAL_MAP_CENTER, INITIAL_MAP_ZOOM);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);
    mapRef.current = map;
    drawingLayerRef.current = L.layerGroup().addTo(map);
    arrowLayerRef.current = L.layerGroup().addTo(map);
    return () => map.remove();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handleClick = (e) => {
      if (editingState === EditingState.DrawingNew) {
        addPoint(e.latlng);
      }
    };
    map.on('click', handleClick);
    return () => map.off('click', handleClick);
  }, [editingState, addPoint]);

  useEffect(() => {
    const layer = drawingLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (anchors.length > 0) {
      L.polyline(anchors, { color: 'red' }).addTo(layer);
    }
  }, [anchors]);

  useEffect(() => {
    const layer = arrowLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    arrows.forEach((arrow) => {
      L.polyline(arrow.points, { color: 'blue' }).addTo(layer);
    });
  }, [arrows]);

  return <div id="map" className="h-full w-full grow"></div>;
}
