import L from 'leaflet';
import { DEFAULT_FORM } from './app/types/shapeParameters.js';

export const DEFAULT_REAR_WIDTH_PX = DEFAULT_FORM.shaftThicknessPx * DEFAULT_FORM.rearTaper;
export const DEFAULT_NECK_WIDTH_PX = DEFAULT_FORM.shaftThicknessPx;
export const DEFAULT_HEAD_WIDTH_PX = DEFAULT_FORM.headWidthPx;
export const DEFAULT_HEAD_LENGTH_PX = DEFAULT_FORM.headLengthPx;

export const HANDLE_OFFSET_ON_LINE_PIXELS = 30;
export const ANCHOR_ICON_HTML = '<span aria-hidden="true"></span>';
export const HANDLE_ICON_HTML = '<span aria-hidden="true"></span>';

export const anchorIcon = L.divIcon({
    html: ANCHOR_ICON_HTML,
    className: 'leaflet-div-icon editor-marker anchor-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
});

export const handleIcon = L.divIcon({
    html: HANDLE_ICON_HTML,
    className: 'leaflet-div-icon editor-marker handle-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
});

export const INITIAL_MAP_CENTER = [51.1657, 10.4515];
export const INITIAL_MAP_ZOOM = 6;
