import L from 'leaflet';
import { DEFAULT_FORM } from './app/types/shapeParameters.js';

export const DEFAULT_REAR_WIDTH_PX = DEFAULT_FORM.shaftThicknessPx * DEFAULT_FORM.rearTaper;
export const DEFAULT_NECK_WIDTH_PX = DEFAULT_FORM.shaftThicknessPx;
export const DEFAULT_HEAD_WIDTH_PX = DEFAULT_FORM.headWidthPx;
export const DEFAULT_HEAD_LENGTH_PX = DEFAULT_FORM.headLengthPx;

export const HANDLE_OFFSET_ON_LINE_PIXELS = 30;
export const ANCHOR_ICON_HTML = '<div style="width:12px;height:12px;border-radius:6px;background:red;border:2px solid white;box-shadow: 0 0 3px rgba(0,0,0,0.5);"></div>';
export const HANDLE_ICON_HTML = '<div style="width:10px;height:10px;border-radius:5px;background:blue;border:1px solid white;box-shadow: 0 0 3px rgba(0,0,0,0.5);"></div>';

export const anchorIcon = L.divIcon({
    html: ANCHOR_ICON_HTML,
    className: 'leaflet-div-icon anchor-icon',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
});

export const handleIcon = L.divIcon({
    html: HANDLE_ICON_HTML,
    className: 'leaflet-div-icon handle-icon',
    iconSize: [10, 10],
    iconAnchor: [5, 5],
});

export const INITIAL_MAP_CENTER = [51.1657, 10.4515];
export const INITIAL_MAP_ZOOM = 6;
