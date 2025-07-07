
import L from 'leaflet';

export const DEFAULT_SHAFT_THICKNESS_FACTOR = 0.05;
export const DEFAULT_ARROW_HEAD_LENGTH_FACTOR = 0.125;
export const DEFAULT_ARROW_HEAD_WIDTH_FACTOR = 0.125;
// Default factor for the rear (tail) width of the arrow shaft. Initially equal to the
// shaft thickness so the arrow has a uniform width unless changed by the user.
export const DEFAULT_TAIL_THICKNESS_FACTOR = DEFAULT_SHAFT_THICKNESS_FACTOR;

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

export const INITIAL_MAP_CENTER: L.LatLngTuple = [51.1657, 10.4515];
export const INITIAL_MAP_ZOOM = 6;