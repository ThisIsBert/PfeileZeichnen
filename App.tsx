
import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import type { Anchor, AnchorData, ArrowGroup, ArrowParameters, EditingState as EditingStateType, GeoJsonFeature, GeoJsonFeatureCollection, LatLngLiteral, Point as GeomPoint, SavedArrowProperties } from './types';
import { EditingState } from './types';
import ControlPanel from './components/ControlPanel';
import { 
  DEFAULT_SHAFT_THICKNESS_FACTOR, DEFAULT_ARROW_HEAD_LENGTH_FACTOR, DEFAULT_ARROW_HEAD_WIDTH_FACTOR, 
  anchorIcon, handleIcon, HANDLE_OFFSET_ON_LINE_PIXELS, INITIAL_MAP_CENTER, INITIAL_MAP_ZOOM
} from './constants';
import { 
  pointSubtract, pointAdd, pointMultiply, pointLength, normalize, perpendicular, 
  getValidPointsAndLength, calculateArrowOutlinePoints 
} from './utils/geometry';

interface CustomPathOptions extends L.PathOptions {
  className?: string;
  isPreviewLine?: boolean;
}

const App: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const drawingLayerRef = useRef<L.LayerGroup | null>(null); 
  const arrowLayerRef = useRef<L.LayerGroup | null>(null);   
  const editingArrowLayerRef = useRef<L.LayerGroup | null>(null); 

  const [editingState, setEditingState] = useState<EditingStateType>(EditingState.Idle);
  const [currentAnchors, setCurrentAnchors] = useState<Anchor[]>([]);
  const [selectedArrowGroup, setSelectedArrowGroup] = useState<ArrowGroup | null>(null);
  
  const [currentShaftThicknessFactor, setCurrentShaftThicknessFactor] = useState<number>(DEFAULT_SHAFT_THICKNESS_FACTOR);
  const [currentArrowHeadLengthFactor, setCurrentArrowHeadLengthFactor] = useState<number>(DEFAULT_ARROW_HEAD_LENGTH_FACTOR);
  const [currentArrowHeadWidthFactor, setCurrentArrowHeadWidthFactor] = useState<number>(DEFAULT_ARROW_HEAD_WIDTH_FACTOR);

  const [currentShaftThicknessPixels, setCurrentShaftThicknessPixels] = useState<number | null>(null);
  const [currentArrowHeadLengthPixels, setCurrentArrowHeadLengthPixels] = useState<number | null>(null);
  const [currentArrowHeadWidthPixels, setCurrentArrowHeadWidthPixels] = useState<number | null>(null);

  const [currentArrowName, setCurrentArrowName] = useState<string>('');
  const [arrowNameCounter, setArrowNameCounter] = useState<number>(1);
  
  const [savedArrowsBackup, setSavedArrowsBackup] = useState<SavedArrowProperties[]>([]);
  const [backupArrowNameCounter, setBackupArrowNameCounter] = useState<number>(1);

  const isArrowDraggingRef = useRef<boolean>(false);
  const arrowDragStartPointRef = useRef<GeomPoint | null>(null);
  const initialAnchorLayerPointsRef = useRef<Array<L.Point | null>>([]); 
  const initialHandle1LayerPointsRef = useRef<Array<L.Point | null>>([]); 
  const initialHandle2LayerPointsRef = useRef<Array<L.Point | null>>([]); 
  
  const handleSelectArrowRef = useRef<((arrowGroupToSelect: ArrowGroup) => void) | null>(null);

  // Refs for Leaflet objects
  const anchorMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const handle1MarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const handle2MarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const connector1LinesRef = useRef<Map<string, L.Polyline>>(new Map());
  const connector2LinesRef = useRef<Map<string, L.Polyline>>(new Map());


  const getAnchorsData = useCallback((): AnchorData[] => {
    return currentAnchors.map(a => ({
      latlng: a.latlng, 
      handle1: a.handle1 || null,
      handle2: a.handle2 || null,
    }));
  }, [currentAnchors]);


  const updatePixelValuesFromFactors = useCallback(() => {
    if (!mapRef.current || currentAnchors.length < 2) {
      setCurrentShaftThicknessPixels(null);
      setCurrentArrowHeadLengthPixels(null);
      setCurrentArrowHeadWidthPixels(null);
      return;
    }
    const { totalLength } = getValidPointsAndLength(mapRef.current, getAnchorsData());
    if (totalLength > 1e-6) {
      setCurrentShaftThicknessPixels(totalLength * currentShaftThicknessFactor);
      setCurrentArrowHeadLengthPixels(totalLength * currentArrowHeadLengthFactor);
      setCurrentArrowHeadWidthPixels(totalLength * currentArrowHeadWidthFactor);
    } else {
      setCurrentShaftThicknessPixels(0);
      setCurrentArrowHeadLengthPixels(0);
      setCurrentArrowHeadWidthPixels(0);
    }
  }, [currentAnchors.length, getAnchorsData, currentShaftThicknessFactor, currentArrowHeadLengthFactor, currentArrowHeadWidthFactor]);

  const updateFactorsFromPixelValues = useCallback(() => {
    if (!mapRef.current || currentAnchors.length < 2) return;
    const { totalLength } = getValidPointsAndLength(mapRef.current, getAnchorsData());

    if (totalLength > 1e-6) {
        if (currentShaftThicknessPixels !== null) setCurrentShaftThicknessFactor(Math.max(0.005, Math.min(0.1, currentShaftThicknessPixels / totalLength)));
        if (currentArrowHeadLengthPixels !== null) setCurrentArrowHeadLengthFactor(Math.max(0.05, Math.min(0.2,currentArrowHeadLengthPixels / totalLength)));
        if (currentArrowHeadWidthPixels !== null) setCurrentArrowHeadWidthFactor(Math.max(0.05, Math.min(0.2,currentArrowHeadWidthPixels / totalLength)));
    } else { 
        setCurrentShaftThicknessFactor(DEFAULT_SHAFT_THICKNESS_FACTOR);
        setCurrentArrowHeadLengthFactor(DEFAULT_ARROW_HEAD_LENGTH_FACTOR);
        setCurrentArrowHeadWidthFactor(DEFAULT_ARROW_HEAD_WIDTH_FACTOR);
    }
  }, [currentAnchors.length, getAnchorsData, currentShaftThicknessPixels, currentArrowHeadLengthPixels, currentArrowHeadWidthPixels]);

  const resetCurrentPixelValues = useCallback(() => {
    setCurrentShaftThicknessPixels(null);
    setCurrentArrowHeadLengthPixels(null);
    setCurrentArrowHeadWidthPixels(null);
  }, []);

  const addAnchor = useCallback((latlng: L.LatLng | L.LatLngLiteral, index: number) => {
    const map = mapRef.current;
    if (!map) return;
    
    const newAnchorId = Date.now().toString() + Math.random().toString();
    const newAnchorLatLng = L.latLng(latlng.lat, latlng.lng); 

    const newAnchorData: Anchor = {
      id: newAnchorId,
      latlng: {lat: newAnchorLatLng.lat, lng: newAnchorLatLng.lng}, 
      handle1: {lat: newAnchorLatLng.lat, lng: newAnchorLatLng.lng},
      handle2: {lat: newAnchorLatLng.lat, lng: newAnchorLatLng.lng},
    };
    
    setCurrentAnchors(prevAnchors => {
        const updatedAnchors = [...prevAnchors];
        updatedAnchors.splice(index, 0, newAnchorData);

        if (index > 0) {
            const prevAnchor = updatedAnchors[index - 1];
            try {
                const p_prev = map.latLngToLayerPoint(L.latLng(prevAnchor.latlng.lat, prevAnchor.latlng.lng)); 
                const p_new = map.latLngToLayerPoint(newAnchorLatLng); 
                const vec = pointSubtract(p_new, p_prev); 
                const len = pointLength(vec);
                if (len > 1e-6) {
                    const unitVec = pointMultiply(vec, 1 / len); 
                    const offsetVec = pointMultiply(unitVec, HANDLE_OFFSET_ON_LINE_PIXELS); 
                    
                    const prevAnchorH2Pos = pointAdd(p_prev, offsetVec); 
                    prevAnchor.handle2 = map.layerPointToLatLng(L.point(prevAnchorH2Pos.x, prevAnchorH2Pos.y)).wrap();
                    
                    const newAnchorH1Pos = pointSubtract(p_new, offsetVec); 
                    updatedAnchors[index].handle1 = map.layerPointToLatLng(L.point(newAnchorH1Pos.x, newAnchorH1Pos.y)).wrap();
                }
            } catch(e) { console.error("Error aligning previous segment handles:", e); }
        }
        if (index < updatedAnchors.length - 1) {
            const nextAnchor = updatedAnchors[index + 1];
            try {
                const p_new = map.latLngToLayerPoint(newAnchorLatLng); 
                const p_next = map.latLngToLayerPoint(L.latLng(nextAnchor.latlng.lat, nextAnchor.latlng.lng)); 
                const vec = pointSubtract(p_next, p_new); 
                const len = pointLength(vec);
                if (len > 1e-6) {
                    const unitVec = pointMultiply(vec, 1 / len); 
                    const offsetVec = pointMultiply(unitVec, HANDLE_OFFSET_ON_LINE_PIXELS); 

                    const newAnchorH2Pos = pointAdd(p_new, offsetVec); 
                    updatedAnchors[index].handle2 = map.layerPointToLatLng(L.point(newAnchorH2Pos.x, newAnchorH2Pos.y)).wrap();
                    
                    const nextAnchorH1Pos = pointSubtract(p_next, offsetVec); 
                    nextAnchor.handle1 = map.layerPointToLatLng(L.point(nextAnchorH1Pos.x, nextAnchorH1Pos.y)).wrap();
                }
            } catch(e) { console.error("Error aligning next segment handles:", e); }
        }
        return updatedAnchors;
    });

    const newCount = currentAnchors.length + 1;

    if (newCount <= 2) {
      resetCurrentPixelValues();
      if (newCount === 2) {
        setCurrentShaftThicknessFactor(DEFAULT_SHAFT_THICKNESS_FACTOR);
        setCurrentArrowHeadLengthFactor(DEFAULT_ARROW_HEAD_LENGTH_FACTOR);
        setCurrentArrowHeadWidthFactor(DEFAULT_ARROW_HEAD_WIDTH_FACTOR);
        updatePixelValuesFromFactors();
      }
    } else {
      updateFactorsFromPixelValues();
    }
  }, [currentAnchors.length, resetCurrentPixelValues, updatePixelValuesFromFactors, updateFactorsFromPixelValues]);

  const onArrowDrag = useCallback((e: L.LeafletMouseEvent) => {
    const map = mapRef.current;
    if (!isArrowDraggingRef.current || !map || !arrowDragStartPointRef.current) return;

    const currentMousePoint = map.mouseEventToContainerPoint(e.originalEvent); 
    const currentGeomPoint: GeomPoint = {x: currentMousePoint.x, y: currentMousePoint.y}; 
    const delta = pointSubtract(currentGeomPoint, arrowDragStartPointRef.current); 

    setCurrentAnchors(prevAnchors => prevAnchors.map((anchor, i) => {
        const newAnchorPart: Partial<Anchor> = {};
        try {
            if (initialAnchorLayerPointsRef.current[i]) {
                const initialPt = initialAnchorLayerPointsRef.current[i]!; 
                const newAnchorGeomPoint = pointAdd(initialPt, delta); 
                newAnchorPart.latlng = map.layerPointToLatLng(L.point(newAnchorGeomPoint.x, newAnchorGeomPoint.y)).wrap();
            }
            if (anchor.handle1 && initialHandle1LayerPointsRef.current[i]) {
                const initialH1Pt = initialHandle1LayerPointsRef.current[i]!; 
                const newHandle1GeomPoint = pointAdd(initialH1Pt, delta); 
                newAnchorPart.handle1 = map.layerPointToLatLng(L.point(newHandle1GeomPoint.x, newHandle1GeomPoint.y)).wrap();
            }
            if (anchor.handle2 && initialHandle2LayerPointsRef.current[i]) {
                const initialH2Pt = initialHandle2LayerPointsRef.current[i]!; 
                const newHandle2GeomPoint = pointAdd(initialH2Pt, delta); 
                newAnchorPart.handle2 = map.layerPointToLatLng(L.point(newHandle2GeomPoint.x, newHandle2GeomPoint.y)).wrap();
            }
        } catch (error) { console.error("Arrow drag update error:", error); }
        return {...anchor, ...newAnchorPart};
    }));
  }, []); 

  const stopArrowDrag = useCallback(() => {
    const map = mapRef.current;
    if (!isArrowDraggingRef.current || !map) return;

    isArrowDraggingRef.current = false;
    map.off('mousemove', onArrowDrag);
    map.off('mouseup', stopArrowDrag);
    map.dragging.enable();
    map.getContainer().style.cursor = (editingState === EditingState.DrawingNew) ? "crosshair" : "default";
    updateFactorsFromPixelValues();
  }, [editingState, onArrowDrag, updateFactorsFromPixelValues]);

  const startArrowDrag = useCallback((e: L.LeafletMouseEvent) => {
    const map = mapRef.current;
    if (!map || currentAnchors.length < 1 || editingState === EditingState.Idle) return;
    
    L.DomEvent.stopPropagation(e.originalEvent);
    L.DomEvent.preventDefault(e.originalEvent);
    
    isArrowDraggingRef.current = true;
    const startMousePoint = map.mouseEventToContainerPoint(e.originalEvent);
    arrowDragStartPointRef.current = {x: startMousePoint.x, y: startMousePoint.y }; 
    
    initialAnchorLayerPointsRef.current = currentAnchors.map(a => a.latlng ? map.latLngToLayerPoint(L.latLng(a.latlng.lat, a.latlng.lng)) : null);
    initialHandle1LayerPointsRef.current = currentAnchors.map(a => a.handle1 ? map.latLngToLayerPoint(L.latLng(a.handle1.lat, a.handle1.lng)) : null);
    initialHandle2LayerPointsRef.current = currentAnchors.map(a => a.handle2 ? map.latLngToLayerPoint(L.latLng(a.handle2.lat, a.handle2.lng)) : null);

    map.dragging.disable();
    map.on('mousemove', onArrowDrag);
    map.on('mouseup', stopArrowDrag);
    map.getContainer().style.cursor = 'grabbing';
  }, [currentAnchors, editingState, onArrowDrag, stopArrowDrag]);

  const handleCurveClick = useCallback((e: L.LeafletMouseEvent) => {
    const map = mapRef.current;
    if (!map || isArrowDraggingRef.current || (editingState !== EditingState.DrawingNew && editingState !== EditingState.EditingSelected)) return;

    const clickLatLng = e.latlng;
    const clickPtLPoint = map.latLngToLayerPoint(clickLatLng); 
    const clickPt: GeomPoint = {x: clickPtLPoint.x, y: clickPtLPoint.y};

    const { validCurveData } = getValidPointsAndLength(map, getAnchorsData());

    if (!validCurveData || validCurveData.length === 0) return;

    let minDistSq = Infinity;
    let closestSegIndex = -1;

    validCurveData.forEach(d => { 
        const pt = d.pt;
        const dx = pt.x - clickPt.x;
        const dy = pt.y - clickPt.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < minDistSq) {
            minDistSq = distSq;
            closestSegIndex = d.segIndex;
        }
    });
    
    if (closestSegIndex !== -1) {
        addAnchor(clickLatLng, closestSegIndex + 1);
    } else {
        console.warn("Could not find closest point on curve for click:", clickLatLng);
    }
  }, [editingState, addAnchor, getAnchorsData]);

  const updateCurveAndArrowPreview = useCallback(() => {
    const map = mapRef.current;
    const drawingLayer = drawingLayerRef.current;
    const editingArrowLyr = editingArrowLayerRef.current;

    if (!map || !drawingLayer || !editingArrowLyr ) return;

    drawingLayer.eachLayer(layer => {
       if ((layer.options as CustomPathOptions)?.isPreviewLine) {
         drawingLayer.removeLayer(layer);
       }
     });
    editingArrowLyr.clearLayers();

    const anchorsData = getAnchorsData();
    if (anchorsData.length < 2) {
      resetCurrentPixelValues(); 
      if (currentShaftThicknessPixels === null) setCurrentShaftThicknessFactor(DEFAULT_SHAFT_THICKNESS_FACTOR);
      if (currentArrowHeadLengthPixels === null) setCurrentArrowHeadLengthFactor(DEFAULT_ARROW_HEAD_LENGTH_FACTOR);
      if (currentArrowHeadWidthPixels === null) setCurrentArrowHeadWidthFactor(DEFAULT_ARROW_HEAD_WIDTH_FACTOR);
      return;
    }
    
    const { pts, totalLength, cumLengths, validCurveData } = getValidPointsAndLength(map, anchorsData);

    if (pts.length < 2) {
      resetCurrentPixelValues();
      return;
    }
    
    try {
      const latlngs = validCurveData.map(d => map.layerPointToLatLng(L.point(d.pt.x, d.pt.y)));
      if (latlngs.length >= 2) {
        const previewLine = L.polyline(latlngs, { 
            color: 'green', dashArray: '5,5', weight: 1, interactive: true, 
            bubblingMouseEvents: false, isPreviewLine: true 
        } as CustomPathOptions);
        
        previewLine.on('click', (ev: L.LeafletMouseEvent) => {
           L.DomEvent.stopPropagation(ev);
           if (editingState === EditingState.DrawingNew || editingState === EditingState.EditingSelected) {
             handleCurveClick(ev);
           }
        });
        drawingLayer.addLayer(previewLine);
      }
    } catch (error) { console.error("Error drawing preview line:", error); }

    let sThicknessPx = currentShaftThicknessPixels;
    let ahLengthPx = currentArrowHeadLengthPixels;
    let ahWidthPx = currentArrowHeadWidthPixels;

    if (sThicknessPx === null || ahLengthPx === null || ahWidthPx === null) {
        sThicknessPx = totalLength * currentShaftThicknessFactor;
        ahLengthPx = totalLength * currentArrowHeadLengthFactor;
        ahWidthPx = totalLength * currentArrowHeadWidthFactor;
        setCurrentShaftThicknessPixels(sThicknessPx);
        setCurrentArrowHeadLengthPixels(ahLengthPx);
        setCurrentArrowHeadWidthPixels(ahWidthPx);
    }
     
    ahLengthPx = Math.min(ahLengthPx, totalLength);
    sThicknessPx = Math.max(0, sThicknessPx);
    ahWidthPx = Math.max(0, ahWidthPx);

    const outlinePoints = calculateArrowOutlinePoints(pts, totalLength, cumLengths, sThicknessPx, ahLengthPx, ahWidthPx);

    if (outlinePoints) {
      try {
        const outlineLatLngs = outlinePoints.map(p => map.layerPointToLatLng(L.point(p.x, p.y)));
        if (outlineLatLngs.length >=3) { 
          const arrowPreviewShape = L.polygon(outlineLatLngs, { 
            color: 'blue', fillColor: 'blue', fillOpacity: 0.3, weight: 1, interactive: true, bubblingMouseEvents: false 
          });
          
          arrowPreviewShape.on('mousedown', (ev: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(ev); 
            startArrowDrag(ev);
          });
          arrowPreviewShape.on('click', (ev: L.LeafletMouseEvent) => {
             L.DomEvent.stopPropagation(ev);
             if (editingState === EditingState.DrawingNew || editingState === EditingState.EditingSelected) {
               handleCurveClick(ev);
             }
          });
          editingArrowLyr.addLayer(arrowPreviewShape);
        }
      } catch (error) { console.error("Error creating arrow preview shape:", error); }
    }
  }, [getAnchorsData, editingState, currentShaftThicknessFactor, currentArrowHeadLengthFactor, currentArrowHeadWidthFactor, currentShaftThicknessPixels, currentArrowHeadLengthPixels, currentArrowHeadWidthPixels, resetCurrentPixelValues, handleCurveClick, startArrowDrag]);

  const removeAnchor = useCallback((anchorId: string) => {
    setCurrentAnchors(prev => {
        const newAnchors = prev.filter(a => a.id !== anchorId);
        if (newAnchors.length < 2) {
          resetCurrentPixelValues();
        }
        return newAnchors;
    });
    updateFactorsFromPixelValues();
  }, [resetCurrentPixelValues, updateFactorsFromPixelValues]);
  
  const handleGenericDragStart = useCallback((e: L.LeafletEvent) => {
    mapRef.current?.dragging.disable();
    if ((e as L.LeafletMouseEvent).originalEvent) L.DomEvent.stopPropagation((e as L.LeafletMouseEvent).originalEvent);
  }, []);

  const handleGenericDragEnd = useCallback((e: L.LeafletEvent) => {
    mapRef.current?.dragging.enable();
    if ((e as L.LeafletMouseEvent).originalEvent) L.DomEvent.stopPropagation((e as L.LeafletMouseEvent).originalEvent);
    updateFactorsFromPixelValues();
  }, [updateFactorsFromPixelValues]);

  const handleAnchorDragStart = useCallback((e: L.LeafletEvent, anchorId: string) => {
    handleGenericDragStart(e);
    const anchor = currentAnchors.find(a => a.id === anchorId);
    const map = mapRef.current;
    if (anchor && map) {
        const _oldLatLng = L.latLng(anchor.latlng.lat, anchor.latlng.lng); 
        let _handle1OffsetPixels: GeomPoint | undefined = undefined;
        let _handle2OffsetPixels: GeomPoint | undefined = undefined;
        try {
            const anchorPoint = map.latLngToLayerPoint(_oldLatLng); 
            if (anchor.handle1) {
                const handle1Point = map.latLngToLayerPoint(L.latLng(anchor.handle1.lat, anchor.handle1.lng)); 
                _handle1OffsetPixels = pointSubtract(handle1Point, anchorPoint); 
            }
            if (anchor.handle2) {
                const handle2Point = map.latLngToLayerPoint(L.latLng(anchor.handle2.lat, anchor.handle2.lng)); 
                _handle2OffsetPixels = pointSubtract(handle2Point, anchorPoint); 
            }
        } catch (err) { console.error("DragStart offset error:", err); }

        setCurrentAnchors(prev => prev.map(a => a.id === anchorId ? { ...a, _oldLatLng, _handle1OffsetPixels, _handle2OffsetPixels } : a));
    }
  }, [currentAnchors, handleGenericDragStart]);

  const handleAnchorDrag = useCallback((e: L.LeafletEvent, anchorId: string) => {
    const map = mapRef.current;
    const targetMarker = e.target as L.Marker;
    const newLatLngLiteral = targetMarker.getLatLng().wrap();

    setCurrentAnchors(prev => prev.map(a => {
      if (a.id === anchorId && map && a._oldLatLng) { // Ensure _oldLatLng is present from dragstart
        const updatedAnchorPart = { latlng: {lat: newLatLngLiteral.lat, lng: newLatLngLiteral.lng}, handle1: a.handle1, handle2: a.handle2 };
        try {
            const newAnchorPoint = map.latLngToLayerPoint(newLatLngLiteral); 
            if (a.handle1 && a._handle1OffsetPixels) { 
                const newHandle1GeomPoint = pointAdd(newAnchorPoint, a._handle1OffsetPixels); 
                updatedAnchorPart.handle1 = map.layerPointToLatLng(L.point(newHandle1GeomPoint.x, newHandle1GeomPoint.y)).wrap();
            }
            if (a.handle2 && a._handle2OffsetPixels) { 
                const newHandle2GeomPoint = pointAdd(newAnchorPoint, a._handle2OffsetPixels); 
                updatedAnchorPart.handle2 = map.layerPointToLatLng(L.point(newHandle2GeomPoint.x, newHandle2GeomPoint.y)).wrap();
            }
        } catch(err) { console.error("Drag error:", err); }
        return {...a, ...updatedAnchorPart};
      }
      return a;
    }));
  }, []); 
  
  const handleAnchorDragEnd = useCallback((e: L.LeafletEvent, anchorId: string) => {
    handleGenericDragEnd(e); 
    setCurrentAnchors(prev => prev.map(a => a.id === anchorId ? { ...a, _oldLatLng: undefined, _handle1OffsetPixels: undefined, _handle2OffsetPixels: undefined } : a));
  }, [handleGenericDragEnd]);

  const handleHandleDrag = useCallback((e: L.LeafletEvent, anchorId: string, handleNum: 1 | 2) => {
    const targetMarker = e.target as L.Marker;
    const newHandleLatLngLiteral = targetMarker.getLatLng().wrap();
    setCurrentAnchors(prev => prev.map(a => {
      if (a.id === anchorId) {
        const updatedAnchorPart = (handleNum === 1) 
          ? { handle1: {lat: newHandleLatLngLiteral.lat, lng: newHandleLatLngLiteral.lng} }
          : { handle2: {lat: newHandleLatLngLiteral.lat, lng: newHandleLatLngLiteral.lng} };
        return { ...a, ...updatedAnchorPart };
      }
      return a;
    }));
  }, []);
  
  const clearBackupState = useCallback(() => {
    setSavedArrowsBackup([]);
    setBackupArrowNameCounter(1); 
  }, []);

  const saveStateForCancel = useCallback(() => {
    const currentFinalizedArrows: SavedArrowProperties[] = [];
    arrowLayerRef.current?.eachLayer(layer => {
        const arrowGroup = layer as ArrowGroup;
        if (arrowGroup.savedAnchors && arrowGroup.arrowParameters) {
            currentFinalizedArrows.push({
                savedAnchors: JSON.parse(JSON.stringify(arrowGroup.savedAnchors)), 
                arrowParameters: JSON.parse(JSON.stringify(arrowGroup.arrowParameters)),
                arrowName: arrowGroup.arrowName,
            });
        }
    });
    setSavedArrowsBackup(currentFinalizedArrows);
    setBackupArrowNameCounter(arrowNameCounter);
  }, [arrowNameCounter]);
  
  const finalizeCurrentArrow = useCallback(() => {
    const map = mapRef.current;
    const arrowLyr = arrowLayerRef.current;
    if (!map || !arrowLyr || currentAnchors.length < 2) {
      setCurrentAnchors([]); 
      return null; 
    }

    const anchorsToSave = getAnchorsData().map(a => ({ 
        latlng: a.latlng,
        handle1: a.handle1 || null,
        handle2: a.handle2 || null,
    }));

    let sThicknessPx = currentShaftThicknessPixels ?? 0;
    let ahLengthPx = currentArrowHeadLengthPixels ?? 0;
    let ahWidthPx = currentArrowHeadWidthPixels ?? 0;
    
    const finalArrowParams: ArrowParameters = {
      shaftThicknessPixels: sThicknessPx,
      arrowHeadLengthPixels: ahLengthPx,
      arrowHeadWidthPixels: ahWidthPx,
    };

    const { pts, totalLength, cumLengths } = getValidPointsAndLength(map, getAnchorsData());
    if (pts.length < 2) {
      console.error("Finalize: Invalid points for geometry.");
      return null;
    }

    const outlinePoints = calculateArrowOutlinePoints(pts, totalLength, cumLengths, sThicknessPx, ahLengthPx, ahWidthPx);
    
    if (!outlinePoints) {
        console.warn("Finalize: No polygons generated for arrow.");
        return null;
    }

    const newArrowGroup = L.layerGroup() as ArrowGroup;
    try {
        const outlineLatLngs = outlinePoints.map(p => map.layerPointToLatLng(L.point(p.x,p.y)));
        if (outlineLatLngs.length >= 3) {
            const finalShape = L.polygon(outlineLatLngs, { color: 'red', fillColor: 'red', fillOpacity: 0.5, weight: 1 });
            finalShape.on('click', (ev: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(ev);
                if (handleSelectArrowRef.current) {
                    handleSelectArrowRef.current(newArrowGroup);
                }
            });
            newArrowGroup.addLayer(finalShape);
        } else {
             console.warn("Finalize: Not enough points for polygon."); return null;
        }
    } catch (error) { console.error("Error generating final polygons:", error); return null; }
    
    newArrowGroup.savedAnchors = anchorsToSave;
    newArrowGroup.arrowParameters = finalArrowParams;
    newArrowGroup.arrowName = currentArrowName.trim() || `Unbenannter Pfeil ${arrowNameCounter}`;
    
    if (selectedArrowGroup) { 
        arrowLyr.removeLayer(selectedArrowGroup);
    }
    arrowLyr.addLayer(newArrowGroup);
    
    return newArrowGroup; 
  }, [
    currentAnchors, getAnchorsData, currentShaftThicknessFactor, currentArrowHeadLengthFactor, 
    currentArrowHeadWidthFactor, currentShaftThicknessPixels, currentArrowHeadLengthPixels, 
    currentArrowHeadWidthPixels, currentArrowName, arrowNameCounter, selectedArrowGroup
  ]);
  
  const handleSelectArrow = useCallback((arrowGroupToSelect: ArrowGroup) => {
    const map = mapRef.current;
    if (!map) return;

    if (editingState !== EditingState.Idle) { 
        if (editingState === EditingState.DrawingNew || editingState === EditingState.EditingSelected) {
             finalizeCurrentArrow(); 
        }
    }
    saveStateForCancel(); 

    setEditingState(EditingState.EditingSelected);
    arrowLayerRef.current?.removeLayer(arrowGroupToSelect); 
    setSelectedArrowGroup(arrowGroupToSelect);

    const loadedAnchors: Anchor[] = arrowGroupToSelect.savedAnchors.map((sa, idx) => ({
        id: Date.now().toString() + Math.random().toString() + `_load_${idx}`,
        latlng: sa.latlng, 
        handle1: sa.handle1 || null,
        handle2: sa.handle2 || null,
    }));
    setCurrentAnchors(loadedAnchors);
    
    setCurrentArrowName(arrowGroupToSelect.arrowName);
    setCurrentShaftThicknessPixels(arrowGroupToSelect.arrowParameters.shaftThicknessPixels);
    setCurrentArrowHeadLengthPixels(arrowGroupToSelect.arrowParameters.arrowHeadLengthPixels);
    setCurrentArrowHeadWidthPixels(arrowGroupToSelect.arrowParameters.arrowHeadWidthPixels);
    
    updateFactorsFromPixelValues(); 
    
  }, [
    editingState, saveStateForCancel, updateFactorsFromPixelValues, finalizeCurrentArrow
  ]);

  useEffect(() => {
    handleSelectArrowRef.current = handleSelectArrow;
  }, [handleSelectArrow]);

  const restoreStateFromCancel = useCallback(() => {
    arrowLayerRef.current?.clearLayers();
    const map = mapRef.current;
    if (!map) return;

    savedArrowsBackup.forEach(arrowData => {
        const anchorsDataForGeom: AnchorData[] = arrowData.savedAnchors.map(sa => ({
            latlng: sa.latlng, 
            handle1: sa.handle1 || null, 
            handle2: sa.handle2 || null
        }));
        
        const { pts, totalLength, cumLengths } = getValidPointsAndLength(map, anchorsDataForGeom); 
        
        if (pts.length < 2 || arrowData.arrowParameters.shaftThicknessPixels === null || arrowData.arrowParameters.arrowHeadLengthPixels === null || arrowData.arrowParameters.arrowHeadWidthPixels === null) return;

        const outlinePoints = calculateArrowOutlinePoints(pts, totalLength, cumLengths,
            arrowData.arrowParameters.shaftThicknessPixels!,
            arrowData.arrowParameters.arrowHeadLengthPixels!,
            arrowData.arrowParameters.arrowHeadWidthPixels!
        );

        if (outlinePoints) {
            const restoredGroup = L.layerGroup() as ArrowGroup;
            try {
                const latlngs = outlinePoints.map(p => map.layerPointToLatLng(L.point(p.x,p.y)));
                const shape = L.polygon(latlngs, { color: 'red', fillColor: 'red', fillOpacity: 0.5, weight: 1 });
                 shape.on('click', (ev: L.LeafletMouseEvent) => {
                    L.DomEvent.stopPropagation(ev);
                    if (handleSelectArrowRef.current) {
                        handleSelectArrowRef.current(restoredGroup);
                    }
                });
                restoredGroup.addLayer(shape);

                restoredGroup.savedAnchors = arrowData.savedAnchors; 
                restoredGroup.arrowParameters = arrowData.arrowParameters;
                restoredGroup.arrowName = arrowData.arrowName;
                arrowLayerRef.current?.addLayer(restoredGroup);
            } catch (error) { console.error("Error restoring arrow shape:", error); }
        }
    });
    setArrowNameCounter(backupArrowNameCounter);
    clearBackupState();
  }, [savedArrowsBackup, backupArrowNameCounter, clearBackupState]);
  
  const handleConfirm = useCallback((incrementCounterAndUpdateBackup = true) => {
    const finalizedGroup = finalizeCurrentArrow();
    
    if (finalizedGroup && editingState === EditingState.DrawingNew && incrementCounterAndUpdateBackup) {
      setArrowNameCounter(prev => prev + 1);
    }

    setEditingState(EditingState.Idle);
    setCurrentAnchors([]); 
    setSelectedArrowGroup(null);
    resetCurrentPixelValues();
    
    if (incrementCounterAndUpdateBackup) {
      clearBackupState(); 
    }
  }, [finalizeCurrentArrow, editingState, resetCurrentPixelValues, clearBackupState]);

  const handleCancel = useCallback(() => {
    restoreStateFromCancel(); 
    setEditingState(EditingState.Idle);
    setCurrentAnchors([]); 
    setSelectedArrowGroup(null);
    resetCurrentPixelValues();
  }, [resetCurrentPixelValues, restoreStateFromCancel]);

  const handleDrawArrow = useCallback(() => {
    if (editingState !== EditingState.Idle) { 
        handleCancel(); 
    }
    saveStateForCancel(); 
    setEditingState(EditingState.DrawingNew);
    setCurrentAnchors([]);
    setSelectedArrowGroup(null);
    resetCurrentPixelValues();
    setCurrentArrowName(`Unbenannter Pfeil ${arrowNameCounter}`);
    setCurrentShaftThicknessFactor(DEFAULT_SHAFT_THICKNESS_FACTOR);
    setCurrentArrowHeadLengthFactor(DEFAULT_ARROW_HEAD_LENGTH_FACTOR);
    setCurrentArrowHeadWidthFactor(DEFAULT_ARROW_HEAD_WIDTH_FACTOR);
  }, [editingState, arrowNameCounter, resetCurrentPixelValues, handleCancel, saveStateForCancel]);

  const handleCopyArrow = useCallback(() => {
    const map = mapRef.current;
    if (!map || editingState === EditingState.Idle || currentAnchors.length < 2) return;

    const currentAnchorsDataToCopy = getAnchorsData();
    const currentPixelParams = {
        shaftThicknessPixels: currentShaftThicknessPixels,
        arrowHeadLengthPixels: currentArrowHeadLengthPixels,
        arrowHeadWidthPixels: currentArrowHeadWidthPixels,
    };
    const currentNameVal = currentArrowName;

    handleConfirm(false); 

    setEditingState(EditingState.DrawingNew); 
    setSelectedArrowGroup(null);
    
    const firstAnchorLatlngLiteral = currentAnchorsDataToCopy[0].latlng;
    const lastAnchorLatlngLiteral = currentAnchorsDataToCopy[currentAnchorsDataToCopy.length - 1].latlng;

    const firstPt = map.latLngToLayerPoint(L.latLng(firstAnchorLatlngLiteral.lat, firstAnchorLatlngLiteral.lng));
    const lastPt = map.latLngToLayerPoint(L.latLng(lastAnchorLatlngLiteral.lat, lastAnchorLatlngLiteral.lng));
    const vec = pointSubtract(lastPt, firstPt); 
    const len = pointLength(vec);
    const offsetMagnitude = 20; 
    let perpDir: GeomPoint = { x: 0, y: 1 };
    if (len > 1e-6) perpDir = normalize(perpendicular(vec)); 
    const offset = pointMultiply(perpDir, offsetMagnitude); 

    const copiedAnchors: Anchor[] = currentAnchorsDataToCopy.map((aData, i) => {
        const newId = Date.now().toString() + Math.random().toString() + `_copy_${i}`;
        const currentAnchorPt = map.latLngToLayerPoint(L.latLng(aData.latlng.lat, aData.latlng.lng)); 
        const newGeomPt = pointAdd(currentAnchorPt, offset); 
        const newLatLng = map.layerPointToLatLng(L.point(newGeomPt.x, newGeomPt.y)).wrap();
        
        let newH1: LatLngLiteral | undefined | null = undefined;
        if (aData.handle1) {
            const currentH1Pt = map.latLngToLayerPoint(L.latLng(aData.handle1.lat, aData.handle1.lng)); 
            const newH1GeomPt = pointAdd(currentH1Pt, offset); 
            newH1 = map.layerPointToLatLng(L.point(newH1GeomPt.x, newH1GeomPt.y)).wrap();
        }
        let newH2: LatLngLiteral | undefined | null = undefined;
        if (aData.handle2) {
            const currentH2Pt = map.latLngToLayerPoint(L.latLng(aData.handle2.lat, aData.handle2.lng)); 
            const newH2GeomPt = pointAdd(currentH2Pt, offset); 
            newH2 = map.layerPointToLatLng(L.point(newH2GeomPt.x, newH2GeomPt.y)).wrap();
        }
        return { id: newId, latlng: newLatLng, handle1: newH1, handle2: newH2 };
    });
    
    setCurrentAnchors(copiedAnchors); 
    
    setCurrentShaftThicknessPixels(currentPixelParams.shaftThicknessPixels);
    setCurrentArrowHeadLengthPixels(currentPixelParams.arrowHeadLengthPixels);
    setCurrentArrowHeadWidthPixels(currentPixelParams.arrowHeadWidthPixels);
    setCurrentArrowName(`${currentNameVal} (Kopie)`);

    updateFactorsFromPixelValues(); 

  }, [editingState, currentAnchors.length, currentShaftThicknessPixels, currentArrowHeadLengthPixels, currentArrowHeadWidthPixels, currentArrowName, getAnchorsData, updateFactorsFromPixelValues, handleConfirm]);

  const handleDeleteSelectedArrow = useCallback(() => {
    if (editingState === EditingState.EditingSelected && selectedArrowGroup) {
      // The selectedArrowGroup is already removed from arrowLayerRef.current.
      // We need to ensure it's also removed from the `savedArrowsBackup` if it was there.
      // This backup represents the state *before* this arrow was selected for editing.
      
      const updatedBackup = savedArrowsBackup.filter(backupProps => {
        // Attempt to identify if backupProps corresponds to selectedArrowGroup.
        // This is imperfect without a stable ID. Comparing by name and structure.
        if (backupProps.arrowName !== selectedArrowGroup.arrowName) return true;
        if (backupProps.savedAnchors.length !== selectedArrowGroup.savedAnchors.length) return true;
        
        // Deep compare anchors for more robustness if needed
        let anchorsMatch = true;
        for (let i = 0; i < backupProps.savedAnchors.length; i++) {
            const bsa = backupProps.savedAnchors[i];
            const ssa = selectedArrowGroup.savedAnchors[i];
            if (bsa.latlng.lat !== ssa.latlng.lat || bsa.latlng.lng !== ssa.latlng.lng) {
                anchorsMatch = false;
                break;
            }
            // Could also compare handles if necessary
        }
        return !anchorsMatch; // If they match, filter it out (return false)
      });
      setSavedArrowsBackup(updatedBackup);
      
      // Transition to idle state
      setEditingState(EditingState.Idle);
      setCurrentAnchors([]);
      setSelectedArrowGroup(null); // Crucial: this "deletes" the active editing arrow
      resetCurrentPixelValues();
      setCurrentArrowName('');
    }
  }, [editingState, selectedArrowGroup, resetCurrentPixelValues, savedArrowsBackup]);



  const generateGeoJsonForArrow = useCallback((anchorsData: AnchorData[], params: ArrowParameters, name: string): GeoJsonFeature | null => {
    const map = mapRef.current;
    if (!map || anchorsData.length < 2) return null;

    const { pts, totalLength, cumLengths } = getValidPointsAndLength(map, anchorsData);
    if (pts.length < 2) return null;

    let sTP = params.shaftThicknessPixels ?? 0;
    let aHLP = params.arrowHeadLengthPixels ?? 0;
    let aHWP = params.arrowHeadWidthPixels ?? 0;

    const outlinePoints = calculateArrowOutlinePoints(pts, totalLength, cumLengths, sTP, aHLP, aHWP);
    if (!outlinePoints) return null;

    try {
        const coordinates = [outlinePoints.map(p => { 
            const latLng = map.layerPointToLatLng(L.point(p.x, p.y)).wrap();
            return [latLng.lng, latLng.lat];
        })];
        
        if (coordinates[0].length > 0) {
            const first = coordinates[0][0];
            const last = coordinates[0][coordinates[0].length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) {
                coordinates[0].push([...first]);
            }
        }
        if (coordinates[0].length < 4) { 
           console.error("GeoJSON generation: Not enough points for polygon.", coordinates[0]);
           return null;
        }

        return {
            type: "Feature",
            properties: { name },
            geometry: { type: "Polygon", coordinates },
        };
    } catch (error) {
        console.error("Error converting points to GeoJSON:", error);
        return null;
    }
  }, []); 

  const handleCopyGeoJson = useCallback(() => {
    if (editingState === EditingState.Idle || currentAnchors.length < 2) return;
    
    let sThicknessPx = currentShaftThicknessPixels;
    let ahLengthPx = currentArrowHeadLengthPixels;
    let ahWidthPx = currentArrowHeadWidthPixels;
    const map = mapRef.current;

    if ((sThicknessPx === null || ahLengthPx === null || ahWidthPx === null)) {
        sThicknessPx = sThicknessPx ?? 0;
        ahLengthPx = ahLengthPx ?? 0;
        ahWidthPx = ahWidthPx ?? 0;
    }

    const feature = generateGeoJsonForArrow(
        getAnchorsData(),
        { 
            shaftThicknessPixels: sThicknessPx, 
            arrowHeadLengthPixels: ahLengthPx, 
            arrowHeadWidthPixels: ahWidthPx 
        },
        currentArrowName
    );

    if (feature) {
        const jsonString = JSON.stringify(feature, null, 2);
        navigator.clipboard.writeText(jsonString)
            .then(() => alert("GeoJSON copied to clipboard!"))
            .catch(err => {
                console.error('Clipboard copy failed:', err);
                alert('Failed to copy GeoJSON. Check console.');
            });
    } else {
        alert("Could not generate GeoJSON for the current arrow.");
    }
  }, [editingState, currentAnchors.length, getAnchorsData, currentShaftThicknessPixels, currentArrowHeadLengthPixels, currentArrowHeadWidthPixels, currentShaftThicknessFactor, currentArrowHeadLengthFactor, currentArrowHeadWidthFactor, currentArrowName, generateGeoJsonForArrow]);

  const handleSaveAllGeoJson = useCallback(() => {
    if (editingState !== EditingState.Idle && currentAnchors.length > 0) {
        alert("Please finish or cancel current editing before saving all arrows.");
        return;
    }
    const features: GeoJsonFeature[] = [];
    arrowLayerRef.current?.eachLayer(layer => {
        const arrowGroup = layer as ArrowGroup;
        if (arrowGroup.savedAnchors && arrowGroup.arrowParameters) {
            const anchorsForGeoJson: AnchorData[] = arrowGroup.savedAnchors.map(sa => ({
                latlng: sa.latlng,
                handle1: sa.handle1,
                handle2: sa.handle2,
            }));

            const feature = generateGeoJsonForArrow(
                anchorsForGeoJson, 
                arrowGroup.arrowParameters,
                arrowGroup.arrowName
            );
            if (feature) features.push(feature);
        }
    });

    if (features.length === 0) {
        alert("No arrows to export.");
        return;
    }

    const featureCollection: GeoJsonFeatureCollection = { type: "FeatureCollection", features };
    const jsonString = JSON.stringify(featureCollection, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "pfeile.geojson";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [editingState, currentAnchors.length, generateGeoJsonForArrow]);


  // Effects
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView(INITIAL_MAP_CENTER, INITIAL_MAP_ZOOM);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    mapRef.current = map;
    drawingLayerRef.current = L.layerGroup().addTo(map);
    arrowLayerRef.current = L.layerGroup().addTo(map);
    editingArrowLayerRef.current = L.layerGroup().addTo(map);
    
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const onMapClickHandler = (e: L.LeafletMouseEvent) => {
      if (editingState === EditingState.DrawingNew && !isArrowDraggingRef.current) {
        addAnchor(e.latlng, currentAnchors.length);
      }
    };

    if (editingState === EditingState.DrawingNew) {
      map.on('click', onMapClickHandler);
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.off('click', onMapClickHandler);
      map.getContainer().style.cursor = (editingState === EditingState.EditingSelected) ? 'default' : '';
    }

    return () => { map.off('click', onMapClickHandler); };
  }, [editingState, currentAnchors.length, addAnchor]); 

  useEffect(() => {
    if (editingState === EditingState.DrawingNew || editingState === EditingState.EditingSelected) {
      updateCurveAndArrowPreview();
    } else {
        drawingLayerRef.current?.eachLayer(layer => {
           if ((layer.options as CustomPathOptions)?.isPreviewLine) drawingLayerRef.current?.removeLayer(layer);
        });
        editingArrowLayerRef.current?.clearLayers();
    }
  }, [currentAnchors, currentShaftThicknessFactor, currentArrowHeadLengthFactor, currentArrowHeadWidthFactor, currentShaftThicknessPixels, currentArrowHeadLengthPixels, currentArrowHeadWidthPixels, editingState, updateCurveAndArrowPreview]);

  // Keep arrow thickness constant during zoom by recalculating shapes on zoom end
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleZoom = () => {
      if (editingState === EditingState.DrawingNew || editingState === EditingState.EditingSelected) {
        updateCurveAndArrowPreview();
      }

      arrowLayerRef.current?.eachLayer(layer => {
        const arrowGroup = layer as ArrowGroup;
        if (!arrowGroup.savedAnchors || !arrowGroup.arrowParameters) return;

        const anchorsData: AnchorData[] = arrowGroup.savedAnchors.map(sa => ({
          latlng: sa.latlng,
          handle1: sa.handle1,
          handle2: sa.handle2,
        }));

        const { pts, totalLength, cumLengths } = getValidPointsAndLength(map, anchorsData);
        if (pts.length < 2) return;

        const outline = calculateArrowOutlinePoints(
          pts,
          totalLength,
          cumLengths,
          arrowGroup.arrowParameters.shaftThicknessPixels ?? 0,
          arrowGroup.arrowParameters.arrowHeadLengthPixels ?? 0,
          arrowGroup.arrowParameters.arrowHeadWidthPixels ?? 0,
        );

        if (!outline) return;

        const latlngs = outline.map(p => map.layerPointToLatLng(L.point(p.x, p.y)));
        arrowGroup.eachLayer(l => (l as L.Polygon).setLatLngs(latlngs as any));
      });
    };

    map.on('zoomend', handleZoom);
    return () => {
      map.off('zoomend', handleZoom);
    };
  }, [editingState, updateCurveAndArrowPreview]);

  // Effect for managing anchor/handle markers and connector lines
  useEffect(() => {
    const map = mapRef.current;
    const drawingLayer = drawingLayerRef.current;

    if (!map || !drawingLayer) return;

    if (editingState !== EditingState.DrawingNew && editingState !== EditingState.EditingSelected) {
        // If not actively editing/drawing, clear all managed markers/lines from the drawingLayer
        anchorMarkersRef.current.forEach(marker => drawingLayer.removeLayer(marker));
        anchorMarkersRef.current.clear();
        handle1MarkersRef.current.forEach(marker => drawingLayer.removeLayer(marker));
        handle1MarkersRef.current.clear();
        handle2MarkersRef.current.forEach(marker => drawingLayer.removeLayer(marker));
        handle2MarkersRef.current.clear();
        connector1LinesRef.current.forEach(line => drawingLayer.removeLayer(line));
        connector1LinesRef.current.clear();
        connector2LinesRef.current.forEach(line => drawingLayer.removeLayer(line));
        connector2LinesRef.current.clear();
        return;
    }

    const currentAnchorIds = new Set(currentAnchors.map(a => a.id));

    // Cleanup phase for all types of markers and lines
    [anchorMarkersRef, handle1MarkersRef, handle2MarkersRef, connector1LinesRef, connector2LinesRef].forEach(ref => {
        ref.current.forEach((layer, id) => {
            if (!currentAnchorIds.has(id)) {
                drawingLayer.removeLayer(layer);
                ref.current.delete(id);
            }
        });
    });
    
    // Special cleanup for handles/connectors if anchor exists but handle doesn't
    currentAnchors.forEach(anchor => {
        if (!anchor.handle1) {
            const h1Marker = handle1MarkersRef.current.get(anchor.id);
            if (h1Marker) { drawingLayer.removeLayer(h1Marker); handle1MarkersRef.current.delete(anchor.id); }
            const c1Line = connector1LinesRef.current.get(anchor.id);
            if (c1Line) { drawingLayer.removeLayer(c1Line); connector1LinesRef.current.delete(anchor.id); }
        }
        if (!anchor.handle2) {
            const h2Marker = handle2MarkersRef.current.get(anchor.id);
            if (h2Marker) { drawingLayer.removeLayer(h2Marker); handle2MarkersRef.current.delete(anchor.id); }
            const c2Line = connector2LinesRef.current.get(anchor.id);
            if (c2Line) { drawingLayer.removeLayer(c2Line); connector2LinesRef.current.delete(anchor.id); }
        }
    });


    currentAnchors.forEach((anchor, anchorIndex) => {
        const anchorLatLng = L.latLng(anchor.latlng.lat, anchor.latlng.lng);

        // Anchor Marker
        let existingAnchorMarker = anchorMarkersRef.current.get(anchor.id);
        if (existingAnchorMarker) {
            if (!existingAnchorMarker.getLatLng().equals(anchorLatLng)) {
                existingAnchorMarker.setLatLng(anchorLatLng);
            }
        } else {
            existingAnchorMarker = L.marker(anchorLatLng, { icon: anchorIcon, draggable: true, zIndexOffset: 1000 })
                .addTo(drawingLayer);
            existingAnchorMarker.on('dragstart', (e) => handleAnchorDragStart(e, anchor.id));
            existingAnchorMarker.on('drag', (e) => handleAnchorDrag(e, anchor.id));
            existingAnchorMarker.on('dragend', (e) => handleAnchorDragEnd(e, anchor.id));
            existingAnchorMarker.on('click', (e: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(e);
                if (e.originalEvent.altKey) removeAnchor(anchor.id);
            });
            anchorMarkersRef.current.set(anchor.id, existingAnchorMarker);
        }

        // Handle 1 & Connector 1
        if (anchor.handle1 && anchorIndex > 0) {
            const handle1LatLng = L.latLng(anchor.handle1.lat, anchor.handle1.lng);
            let h1Marker = handle1MarkersRef.current.get(anchor.id);
            if (h1Marker) {
                if (!h1Marker.getLatLng().equals(handle1LatLng)) h1Marker.setLatLng(handle1LatLng);
            } else {
                h1Marker = L.marker(handle1LatLng, { icon: handleIcon, draggable: true, zIndexOffset: 900 }).addTo(drawingLayer);
                h1Marker.on('dragstart', handleGenericDragStart);
                h1Marker.on('drag', (e) => handleHandleDrag(e, anchor.id, 1));
                h1Marker.on('dragend', handleGenericDragEnd);
                h1Marker.on('click', L.DomEvent.stopPropagation);
                handle1MarkersRef.current.set(anchor.id, h1Marker);
            }

            let c1Line = connector1LinesRef.current.get(anchor.id);
            const c1LatLngs: L.LatLngExpression[] = [anchorLatLng, handle1LatLng];
            if (c1Line) {
                c1Line.setLatLngs(c1LatLngs);
            } else {
                c1Line = L.polyline(c1LatLngs, { color: 'gray', dashArray: '2,2', weight: 1, interactive: false } as CustomPathOptions).addTo(drawingLayer);
                connector1LinesRef.current.set(anchor.id, c1Line);
            }
        } else { // Cleanup if handle1 should not exist
            const oldH1Marker = handle1MarkersRef.current.get(anchor.id);
            if (oldH1Marker) { drawingLayer.removeLayer(oldH1Marker); handle1MarkersRef.current.delete(anchor.id); }
            const oldC1Line = connector1LinesRef.current.get(anchor.id);
            if (oldC1Line) { drawingLayer.removeLayer(oldC1Line); connector1LinesRef.current.delete(anchor.id); }
        }

        // Handle 2 & Connector 2
        if (anchor.handle2 && anchorIndex < currentAnchors.length - 1) {
            const handle2LatLng = L.latLng(anchor.handle2.lat, anchor.handle2.lng);
            let h2Marker = handle2MarkersRef.current.get(anchor.id);
            if (h2Marker) {
                if (!h2Marker.getLatLng().equals(handle2LatLng)) h2Marker.setLatLng(handle2LatLng);
            } else {
                h2Marker = L.marker(handle2LatLng, { icon: handleIcon, draggable: true, zIndexOffset: 900 }).addTo(drawingLayer);
                h2Marker.on('dragstart', handleGenericDragStart);
                h2Marker.on('drag', (e) => handleHandleDrag(e, anchor.id, 2));
                h2Marker.on('dragend', handleGenericDragEnd);
                h2Marker.on('click', L.DomEvent.stopPropagation);
                handle2MarkersRef.current.set(anchor.id, h2Marker);
            }

            let c2Line = connector2LinesRef.current.get(anchor.id);
            const c2LatLngs: L.LatLngExpression[] = [anchorLatLng, handle2LatLng];
            if (c2Line) {
                c2Line.setLatLngs(c2LatLngs);
            } else {
                c2Line = L.polyline(c2LatLngs, { color: 'gray', dashArray: '2,2', weight: 1, interactive: false } as CustomPathOptions).addTo(drawingLayer);
                connector2LinesRef.current.set(anchor.id, c2Line);
            }
        } else { // Cleanup if handle2 should not exist
            const oldH2Marker = handle2MarkersRef.current.get(anchor.id);
            if (oldH2Marker) { drawingLayer.removeLayer(oldH2Marker); handle2MarkersRef.current.delete(anchor.id); }
            const oldC2Line = connector2LinesRef.current.get(anchor.id);
            if (oldC2Line) { drawingLayer.removeLayer(oldC2Line); connector2LinesRef.current.delete(anchor.id); }
        }
    });
  }, [currentAnchors, editingState, removeAnchor, handleAnchorDragStart, handleAnchorDrag, handleAnchorDragEnd, handleGenericDragStart, handleHandleDrag, handleGenericDragEnd]);


  // Control panel props
  const canEditParameters = (editingState === EditingState.DrawingNew || editingState === EditingState.EditingSelected) && currentAnchors.length >= 2;
  const canCopyCurrentArrow = (editingState === EditingState.DrawingNew || editingState === EditingState.EditingSelected) && currentAnchors.length >= 2;
  const canDeleteArrow = editingState === EditingState.EditingSelected && selectedArrowGroup !== null;
  const canCopyGeoJsonCurrent = canEditParameters;
  const canSaveAllGeoJsonExport = editingState === EditingState.Idle && (arrowLayerRef.current?.getLayers().length ?? 0) > 0;


  return (
    <div className="relative h-full w-full flex">
      <div ref={mapContainerRef} id="map" className="h-full w-full grow"></div>
      <ControlPanel
        editingState={editingState}
        onDrawArrow={handleDrawArrow}
        onCopyArrow={handleCopyArrow}
        canCopyArrow={canCopyCurrentArrow}
        onDeleteArrow={handleDeleteSelectedArrow}
        canDeleteArrow={canDeleteArrow}
        shaftThicknessFactor={currentShaftThicknessFactor}
        arrowHeadLengthFactor={currentArrowHeadLengthFactor}
        arrowHeadWidthFactor={currentArrowHeadWidthFactor}
        arrowName={currentArrowName}
        onArrowNameChange={setCurrentArrowName}
        canEditName={editingState !== EditingState.Idle}
        onCopyGeoJson={handleCopyGeoJson}
        canCopyGeoJson={canCopyGeoJsonCurrent}
        onSaveAllGeoJson={handleSaveAllGeoJson}
        canSaveAllGeoJson={canSaveAllGeoJsonExport}
        onConfirm={() => handleConfirm(true)}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default App;
