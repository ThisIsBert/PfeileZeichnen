
import type L from 'leaflet';

export interface Point {
  x: number;
  y: number;
}

export interface LatLngLiteral { 
  lat: number;
  lng: number;
}

export interface AnchorData {
  latlng: L.LatLngLiteral; 
  handle1?: L.LatLngLiteral | null;
  handle2?: L.LatLngLiteral | null;
}

export interface Anchor extends AnchorData {
  id: string; // Unique ID for React keys and management
  marker?: L.Marker; // Not part of state directly, but managed alongside
  handle1Marker?: L.Marker;
  handle2Marker?: L.Marker;
  connector1?: L.Polyline;
  connector2?: L.Polyline;

  // Temporary properties for dragging logic, not part of serialized data
  _oldLatLng?: L.LatLng; 
  _handle1OffsetPixels?: Point; 
  _handle2OffsetPixels?: Point;
}


export interface CurvePointData {
  pt: Point;
  segIndex: number;
}

export interface ValidatedCurveData {
  pts: Point[];
  totalLength: number;
  cumLengths: number[];
  validCurveData: CurvePointData[];
}

export interface ArrowParameters {
  shaftThicknessPixels: number | null;
  arrowHeadLengthPixels: number | null;
  arrowHeadWidthPixels: number | null;
}

export interface SavedArrowProperties {
  savedAnchors: Array<{
    latlng: LatLngLiteral;
    handle1: LatLngLiteral | null;
    handle2: LatLngLiteral | null;
  }>;
  arrowParameters: ArrowParameters;
  arrowName: string;
}

// Extend L.LayerGroup to store custom data
export interface ArrowGroup extends L.LayerGroup, SavedArrowProperties {}

export enum EditingState {
  Idle, // Not editing, not drawing
  DrawingNew, // Actively drawing a new arrow, map clicks add anchors
  EditingSelected, // An existing arrow is selected and being edited
}

export interface GeoJsonFeature {
  type: "Feature";
  properties: { name: string; [key: string]: any };
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
}

export interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}