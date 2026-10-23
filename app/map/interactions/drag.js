import L from 'leaflet';
import { pointAdd, pointSubtract } from '../../geometry/index.js';
import { createLatLngLiteral } from '../../types/arrowModel.js';

/**
 * @param {import('leaflet').Map} map
 * @param {MouseEvent} originalEvent
 */
export function getContainerPoint(map, originalEvent) {
  const mousePoint = map.mouseEventToContainerPoint(originalEvent);
  return { x: mousePoint.x, y: mousePoint.y };
}

/**
 * @param {import('leaflet').Map} map
 * @param {Array<any>} anchors
 */
export function getInitialLayerPoints(map, anchors) {
  return {
    anchor: anchors.map((a) => (a.latlng ? map.latLngToLayerPoint(L.latLng(a.latlng.lat, a.latlng.lng)) : null)),
    handle1: anchors.map((a) => (a.handle1 ? map.latLngToLayerPoint(L.latLng(a.handle1.lat, a.handle1.lng)) : null)),
    handle2: anchors.map((a) => (a.handle2 ? map.latLngToLayerPoint(L.latLng(a.handle2.lat, a.handle2.lng)) : null)),
  };
}

/**
 * @param {import('leaflet').Map} map
 * @param {Array<any>} prevAnchors
 * @param {{x:number,y:number}} delta
 * @param {Array<any>} initialAnchors
 * @param {Array<any>} initialHandle1
 * @param {Array<any>} initialHandle2
 */
export function translateAnchorsByDelta(map, prevAnchors, delta, initialAnchors, initialHandle1, initialHandle2) {
  return prevAnchors.map((anchor, i) => {
    const newAnchorPart = {};
    try {
      if (initialAnchors[i]) {
        const newAnchorGeomPoint = pointAdd(initialAnchors[i], delta);
        newAnchorPart.latlng = createLatLngLiteral(map.layerPointToLatLng(L.point(newAnchorGeomPoint.x, newAnchorGeomPoint.y)));
      }
      if (anchor.handle1 && initialHandle1[i]) {
        const newHandle1GeomPoint = pointAdd(initialHandle1[i], delta);
        newAnchorPart.handle1 = createLatLngLiteral(map.layerPointToLatLng(L.point(newHandle1GeomPoint.x, newHandle1GeomPoint.y)));
      }
      if (anchor.handle2 && initialHandle2[i]) {
        const newHandle2GeomPoint = pointAdd(initialHandle2[i], delta);
        newAnchorPart.handle2 = createLatLngLiteral(map.layerPointToLatLng(L.point(newHandle2GeomPoint.x, newHandle2GeomPoint.y)));
      }
    } catch (error) {
      console.error('Arrow drag update error:', error);
    }
    return { ...anchor, ...newAnchorPart };
  });
}

export { pointSubtract };

/**
 * Keep a short click for selection, and move a saved arrow without selecting it
 * once the pointer travels at least three pixels. Document listeners also catch
 * releases outside the map, so map dragging is always restored.
 */
export function bindSavedArrowInteractions(map, shape, arrowGroup, { canDrag, onClick }) {
  let activeDrag = null;
  let suppressClick = false;
  const projectRings = rings => rings.map(value => Array.isArray(value)
    ? projectRings(value)
    : map.latLngToLayerPoint(value));
  const translateRings = (rings, delta) => rings.map(value => Array.isArray(value)
    ? translateRings(value, delta)
    : map.layerPointToLatLng(L.point(value.x + delta.x, value.y + delta.y)));
  const onMove = event => {
    if (!activeDrag) return;
    const delta = pointSubtract(getContainerPoint(map, event), activeDrag.start);
    if (!suppressClick && Math.hypot(delta.x, delta.y) < 3) return;
    suppressClick = true;
    event.preventDefault();
    shape.setLatLngs(translateRings(activeDrag.rings, delta));
    const initial = activeDrag.points;
    arrowGroup.savedAnchors = translateAnchorsByDelta(map, activeDrag.anchors, delta, initial.anchor, initial.handle1, initial.handle2);
  };
  const stop = () => {
    if (!activeDrag) return;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', stop);
    window.removeEventListener('blur', stop);
    map.getContainer().style.cursor = activeDrag.cursor;
    if (activeDrag.mapDraggingEnabled) map.dragging.enable();
    activeDrag = null;
  };
  shape.on('mousedown', event => {
    suppressClick = false;
    if (!canDrag() || event.originalEvent?.button !== 0) return;
    L.DomEvent.stop(event.originalEvent);
    const anchors = arrowGroup.savedAnchors;
    activeDrag = {
      start: getContainerPoint(map, event.originalEvent),
      anchors,
      points: getInitialLayerPoints(map, anchors),
      rings: projectRings(shape.getLatLngs()),
      cursor: map.getContainer().style.cursor,
      mapDraggingEnabled: map.dragging.enabled(),
    };
    map.dragging.disable();
    map.getContainer().style.cursor = 'grabbing';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', stop);
    window.addEventListener('blur', stop);
  });
  shape.on('click', event => {
    L.DomEvent.stopPropagation(event);
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    onClick(event);
  });
  shape.on('remove', stop);
}
