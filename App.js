import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { EditingState } from './types.js';
import ControlPanel from './components/ControlPanel.js';
import { DEFAULT_REAR_WIDTH_PX, DEFAULT_NECK_WIDTH_PX, DEFAULT_HEAD_WIDTH_PX, DEFAULT_HEAD_LENGTH_PX, anchorIcon, handleIcon } from './constants.js';
import { pointSubtract, pointAdd, pointMultiply, pointLength, normalize, perpendicular, getValidPointsAndLength, calculateArrowOutlinePoints } from './app/geometry/index.js';
import { setupLeafletMap, teardownLeafletMap } from './app/map/lifecycle.js';
import { insertAnchorWithAlignedHandles } from './app/map/interactions/handleUpdates.js';
import { getContainerPoint, getInitialLayerPoints, translateAnchorsByDelta } from './app/map/interactions/drag.js';
import { generateGeoJsonForArrow } from './app/io/exportGeoJson.js';
import { canDeleteArrow as getCanDeleteArrow, canEditParameters as getCanEditParameters, canSaveAllGeoJson as getCanSaveAllGeoJson, isEditing } from './app/state/editingState.js';
import { fromArrowAnchorData, toArrowAnchorData } from './app/adapters/leafletArrowAdapter.js';
import { createArrowAnchorData, createArrowAnchorEntity, createArrowParameters, createPersistedArrow, createLatLngLiteral } from './app/types/arrowModel.js';
const App = () => {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const drawingLayerRef = useRef(null);
    const arrowLayerRef = useRef(null);
    const editingArrowLayerRef = useRef(null);
    const [editingState, setEditingState] = useState(EditingState.Idle);
    const [currentAnchors, setCurrentAnchors] = useState([]);
    const [selectedArrowGroup, setSelectedArrowGroup] = useState(null);
    const [currentRearWidthPx, setCurrentRearWidthPx] = useState(null);
    const [currentNeckWidthPx, setCurrentNeckWidthPx] = useState(null);
    const [currentHeadWidthPx, setCurrentHeadWidthPx] = useState(null);
    const [currentHeadLengthPx, setCurrentHeadLengthPx] = useState(null);
    const [currentParamsBaseZoom, setCurrentParamsBaseZoom] = useState(null);
    const [currentArrowName, setCurrentArrowName] = useState('');
    const [arrowNameCounter, setArrowNameCounter] = useState(1);
    const [savedArrowsBackup, setSavedArrowsBackup] = useState([]);
    const [backupArrowNameCounter, setBackupArrowNameCounter] = useState(1);
    const isArrowDraggingRef = useRef(false);
    const arrowDragStartPointRef = useRef(null);
    const initialAnchorLayerPointsRef = useRef([]);
    const initialHandle1LayerPointsRef = useRef([]);
    const initialHandle2LayerPointsRef = useRef([]);
    const handleSelectArrowRef = useRef(null);
    // Refs for Leaflet objects
    const anchorMarkersRef = useRef(new Map());
    const handle1MarkersRef = useRef(new Map());
    const handle2MarkersRef = useRef(new Map());
    const connector1LinesRef = useRef(new Map());
    const connector2LinesRef = useRef(new Map());
    const shapeControlMarkersRef = useRef(new Map());
    const getAnchorsData = useCallback(() => toArrowAnchorData(currentAnchors), [currentAnchors]);
    const ensureShapeDefaults = useCallback(() => {
        if (currentRearWidthPx !== null && currentNeckWidthPx !== null && currentHeadWidthPx !== null && currentHeadLengthPx !== null) {
            return;
        }
        setCurrentRearWidthPx(currentRearWidthPx ?? DEFAULT_REAR_WIDTH_PX);
        setCurrentNeckWidthPx(currentNeckWidthPx ?? DEFAULT_NECK_WIDTH_PX);
        setCurrentHeadWidthPx(currentHeadWidthPx ?? DEFAULT_HEAD_WIDTH_PX);
        setCurrentHeadLengthPx(currentHeadLengthPx ?? DEFAULT_HEAD_LENGTH_PX);
        if (currentParamsBaseZoom === null && mapRef.current) {
            setCurrentParamsBaseZoom(mapRef.current.getZoom());
        }
    }, [currentRearWidthPx, currentNeckWidthPx, currentHeadWidthPx, currentHeadLengthPx, currentParamsBaseZoom]);
    const resetCurrentPixelValues = useCallback(() => {
        setCurrentRearWidthPx(null);
        setCurrentNeckWidthPx(null);
        setCurrentHeadWidthPx(null);
        setCurrentHeadLengthPx(null);
        setCurrentParamsBaseZoom(null);
    }, []);
    const addAnchor = useCallback((latlng, index) => {
        const map = mapRef.current;
        if (!map)
            return;
        setCurrentAnchors(prevAnchors => {
            if (prevAnchors.length >= 2)
                return prevAnchors;
            const newAnchorId = Date.now().toString() + Math.random().toString();
            const newAnchorLatLng = L.latLng(latlng.lat, latlng.lng);
            return insertAnchorWithAlignedHandles(map, prevAnchors, newAnchorLatLng, index, newAnchorId);
        });
    }, []);
    const onArrowDrag = useCallback((e) => {
        const map = mapRef.current;
        if (!isArrowDraggingRef.current || !map || !arrowDragStartPointRef.current)
            return;
        const currentGeomPoint = getContainerPoint(map, e.originalEvent);
        const delta = pointSubtract(currentGeomPoint, arrowDragStartPointRef.current);
        setCurrentAnchors(prevAnchors => translateAnchorsByDelta(map, prevAnchors, delta, initialAnchorLayerPointsRef.current, initialHandle1LayerPointsRef.current, initialHandle2LayerPointsRef.current));
    }, []);
    const stopArrowDrag = useCallback(() => {
        const map = mapRef.current;
        if (!isArrowDraggingRef.current || !map)
            return;
        isArrowDraggingRef.current = false;
        map.off('mousemove', onArrowDrag);
        map.off('mouseup', stopArrowDrag);
        map.dragging.enable();
        map.getContainer().style.cursor = (editingState === EditingState.DrawingNew) ? "crosshair" : "default";
    }, [editingState, onArrowDrag]);
    const startArrowDrag = useCallback((e) => {
        const map = mapRef.current;
        if (!map || currentAnchors.length < 1 || editingState === EditingState.Idle)
            return;
        L.DomEvent.stopPropagation(e.originalEvent);
        L.DomEvent.preventDefault(e.originalEvent);
        isArrowDraggingRef.current = true;
        arrowDragStartPointRef.current = getContainerPoint(map, e.originalEvent);
        const initialLayerPoints = getInitialLayerPoints(map, currentAnchors);
        initialAnchorLayerPointsRef.current = initialLayerPoints.anchor;
        initialHandle1LayerPointsRef.current = initialLayerPoints.handle1;
        initialHandle2LayerPointsRef.current = initialLayerPoints.handle2;
        map.dragging.disable();
        map.on('mousemove', onArrowDrag);
        map.on('mouseup', stopArrowDrag);
        map.getContainer().style.cursor = 'grabbing';
    }, [currentAnchors, editingState, onArrowDrag, stopArrowDrag]);
    const updateCurveAndArrowPreview = useCallback(() => {
        const map = mapRef.current;
        const drawingLayer = drawingLayerRef.current;
        const editingArrowLyr = editingArrowLayerRef.current;
        if (!map || !drawingLayer || !editingArrowLyr)
            return;
        drawingLayer.eachLayer(layer => {
            if (layer.options?.isPreviewLine) {
                drawingLayer.removeLayer(layer);
            }
        });
        editingArrowLyr.clearLayers();
        const anchorsData = getAnchorsData();
        if (anchorsData.length < 2) {
            resetCurrentPixelValues();
            if (currentRearWidthPx === null)
                setCurrentRearWidthPx(DEFAULT_REAR_WIDTH_PX);
            if (currentHeadLengthPx === null)
                setCurrentHeadLengthPx(DEFAULT_HEAD_LENGTH_PX);
            if (currentHeadWidthPx === null)
                setCurrentHeadWidthPx(DEFAULT_HEAD_WIDTH_PX);
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
                });
                previewLine.on('click', (ev) => {
                    L.DomEvent.stopPropagation(ev);
                    if (editingState === EditingState.DrawingNew || editingState === EditingState.EditingSelected) {
                    }
                });
                drawingLayer.addLayer(previewLine);
            }
        }
        catch (error) {
            console.error("Error drawing preview line:", error);
        }
        ensureShapeDefaults();
        const scale = currentParamsBaseZoom !== null ? map.getZoomScale(map.getZoom(), currentParamsBaseZoom) : 1;
        const rearWidthPx = Math.max(0, (currentRearWidthPx ?? DEFAULT_REAR_WIDTH_PX) * scale);
        const neckWidthPx = Math.max(0, (currentNeckWidthPx ?? DEFAULT_NECK_WIDTH_PX) * scale);
        const headLengthPx = Math.min((currentHeadLengthPx ?? DEFAULT_HEAD_LENGTH_PX) * scale, totalLength);
        const headWidthPx = Math.max(0, (currentHeadWidthPx ?? DEFAULT_HEAD_WIDTH_PX) * scale);
        const outlinePoints = calculateArrowOutlinePoints(pts, totalLength, cumLengths, rearWidthPx, neckWidthPx, headWidthPx, headLengthPx);
        if (outlinePoints) {
            try {
                const outlineLatLngs = outlinePoints.map(p => map.layerPointToLatLng(L.point(p.x, p.y)));
                if (outlineLatLngs.length >= 3) {
                    const arrowPreviewShape = L.polygon(outlineLatLngs, {
                        color: 'blue', fillColor: 'blue', fillOpacity: 0.3, weight: 1, interactive: true, bubblingMouseEvents: false
                    });
                    arrowPreviewShape.on('mousedown', (ev) => {
                        L.DomEvent.stopPropagation(ev);
                        startArrowDrag(ev);
                    });
                    arrowPreviewShape.on('click', (ev) => {
                        L.DomEvent.stopPropagation(ev);
                        if (editingState === EditingState.DrawingNew || editingState === EditingState.EditingSelected) {

                        }
                    });
                    editingArrowLyr.addLayer(arrowPreviewShape);
                }
            }
            catch (error) {
                console.error("Error creating arrow preview shape:", error);
            }
        }
    }, [getAnchorsData, editingState, currentRearWidthPx, currentNeckWidthPx, currentHeadLengthPx, currentHeadWidthPx, currentParamsBaseZoom, resetCurrentPixelValues, ensureShapeDefaults, startArrowDrag]);
    const handleGenericDragStart = useCallback((e) => {
        mapRef.current?.dragging.disable();
        if (e.originalEvent)
            L.DomEvent.stopPropagation(e.originalEvent);
    }, []);
    const handleGenericDragEnd = useCallback((e) => {
        mapRef.current?.dragging.enable();
        if (e.originalEvent)
            L.DomEvent.stopPropagation(e.originalEvent);
    }, []);
    const handleAnchorDragStart = useCallback((e, anchorId) => {
        handleGenericDragStart(e);
        const anchor = currentAnchors.find(a => a.id === anchorId);
        const map = mapRef.current;
        if (anchor && map) {
            const _oldLatLng = createLatLngLiteral(anchor.latlng);
            let _handle1OffsetPixels = undefined;
            let _handle2OffsetPixels = undefined;
            try {
                const anchorPoint = map.latLngToLayerPoint(_oldLatLng);
                const h1Marker = handle1MarkersRef.current.get(anchorId);
                if (h1Marker) {
                    const handle1Point = map.latLngToLayerPoint(h1Marker.getLatLng());
                    _handle1OffsetPixels = pointSubtract(handle1Point, anchorPoint);
                }
                else if (anchor.handle1) {
                    const handle1Point = map.latLngToLayerPoint(L.latLng(anchor.handle1.lat, anchor.handle1.lng));
                    _handle1OffsetPixels = pointSubtract(handle1Point, anchorPoint);
                }
                const h2Marker = handle2MarkersRef.current.get(anchorId);
                if (h2Marker) {
                    const handle2Point = map.latLngToLayerPoint(h2Marker.getLatLng());
                    _handle2OffsetPixels = pointSubtract(handle2Point, anchorPoint);
                }
                else if (anchor.handle2) {
                    const handle2Point = map.latLngToLayerPoint(L.latLng(anchor.handle2.lat, anchor.handle2.lng));
                    _handle2OffsetPixels = pointSubtract(handle2Point, anchorPoint);
                }
            }
            catch (err) {
                console.error("DragStart offset error:", err);
            }
            setCurrentAnchors(prev => prev.map(a => a.id === anchorId ? { ...a, _oldLatLng, _handle1OffsetPixels, _handle2OffsetPixels } : a));
        }
    }, [currentAnchors, handleGenericDragStart]);
    const handleAnchorDrag = useCallback((e, anchorId) => {
        const map = mapRef.current;
        const targetMarker = e.target;
        const newLatLngLiteral = targetMarker.getLatLng();
        setCurrentAnchors(prev => prev.map(a => {
            if (a.id === anchorId && map && a._oldLatLng) { // Ensure _oldLatLng is present from dragstart
                const updatedAnchorPart = createArrowAnchorData({ latlng: createLatLngLiteral(newLatLngLiteral), handle1: a.handle1, handle2: a.handle2 });
                try {
                    const newAnchorPoint = map.latLngToLayerPoint(newLatLngLiteral);
                    if (a.handle1 && a._handle1OffsetPixels) {
                        const newHandle1GeomPoint = pointAdd(newAnchorPoint, a._handle1OffsetPixels);
                        updatedAnchorPart.handle1 = createLatLngLiteral(map.layerPointToLatLng(L.point(newHandle1GeomPoint.x, newHandle1GeomPoint.y)));
                    }
                    if (a.handle2 && a._handle2OffsetPixels) {
                        const newHandle2GeomPoint = pointAdd(newAnchorPoint, a._handle2OffsetPixels);
                        updatedAnchorPart.handle2 = createLatLngLiteral(map.layerPointToLatLng(L.point(newHandle2GeomPoint.x, newHandle2GeomPoint.y)));
                    }
                }
                catch (err) {
                    console.error("Drag error:", err);
                }
                return { ...a, ...updatedAnchorPart };
            }
            return a;
        }));
    }, []);
    const handleAnchorDragEnd = useCallback((e, anchorId) => {
        handleGenericDragEnd(e);
        setCurrentAnchors(prev => prev.map(a => a.id === anchorId ? { ...a, _oldLatLng: undefined, _handle1OffsetPixels: undefined, _handle2OffsetPixels: undefined } : a));
    }, [handleGenericDragEnd]);
    const handleHandleDrag = useCallback((e, anchorId, handleNum) => {
        const targetMarker = e.target;
        const newHandleLatLngLiteral = targetMarker.getLatLng();
        setCurrentAnchors(prev => prev.map(a => {
            if (a.id === anchorId) {
                const updatedAnchorPart = (handleNum === 1)
                    ? { handle1: createLatLngLiteral(newHandleLatLngLiteral) }
                    : { handle2: createLatLngLiteral(newHandleLatLngLiteral) };
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
        const currentFinalizedArrows = [];
        arrowLayerRef.current?.eachLayer(layer => {
            const arrowGroup = layer;
            if (arrowGroup.savedAnchors && arrowGroup.arrowParameters) {
                currentFinalizedArrows.push(createPersistedArrow({
                    savedAnchors: JSON.parse(JSON.stringify(arrowGroup.savedAnchors)),
                    arrowParameters: JSON.parse(JSON.stringify(arrowGroup.arrowParameters)),
                    arrowName: arrowGroup.arrowName,
                }));
            }
        });
        setSavedArrowsBackup(currentFinalizedArrows);
        setBackupArrowNameCounter(arrowNameCounter);
    }, [arrowNameCounter]);

    const getShapeControlGeometry = useCallback(() => {
        const map = mapRef.current;
        if (!map || currentAnchors.length < 2)
            return null;
        const anchorsData = getAnchorsData();
        const { pts, totalLength, cumLengths } = getValidPointsAndLength(map, anchorsData);
        if (pts.length < 2 || totalLength <= 1e-6)
            return null;
        const headLengthPx = Math.min(currentHeadLengthPx ?? DEFAULT_HEAD_LENGTH_PX, totalLength);
        const neckS = Math.max(0, totalLength - headLengthPx);
        const pointAtDistance = (s) => {
            for (let i = 0; i < cumLengths.length - 1; i++) {
                if (cumLengths[i] <= s && cumLengths[i + 1] >= s) {
                    const segLen = cumLengths[i + 1] - cumLengths[i];
                    const t = segLen > 1e-9 ? (s - cumLengths[i]) / segLen : 0;
                    return { x: pts[i].x + t * (pts[i + 1].x - pts[i].x), y: pts[i].y + t * (pts[i + 1].y - pts[i].y) };
                }
            }
            return pts[pts.length - 1];
        };
        const rearPt = pts[0];
        const neckPt = pointAtDistance(neckS);
        const tip = pts[pts.length - 1];
        const rearTan = normalize(pointSubtract(pts[Math.min(1, pts.length - 1)], pts[0]));
        let neckTan = { x: 1, y: 0 };
        for (let pIdx = pts.length - 2; pIdx >= 0; pIdx--) {
            const diff = pointSubtract(tip, pts[pIdx]);
            if (pointLength(diff) > 1e-6) {
                neckTan = normalize(diff);
                break;
            }
        }
        const rearN = normalize(perpendicular(rearTan.x || rearTan.y ? rearTan : { x: 1, y: 0 }));
        const neckN = normalize(perpendicular(neckTan.x || neckTan.y ? neckTan : { x: 1, y: 0 }));
        const rearHalf = (currentRearWidthPx ?? DEFAULT_REAR_WIDTH_PX) / 2;
        const neckHalf = (currentNeckWidthPx ?? DEFAULT_NECK_WIDTH_PX) / 2;
        const headHalf = (currentHeadWidthPx ?? DEFAULT_HEAD_WIDTH_PX) / 2;
        const headBaseCenter = neckPt;
        return {
            rearLeft: pointAdd(rearPt, pointMultiply(rearN, rearHalf)),
            rearRight: pointSubtract(rearPt, pointMultiply(rearN, rearHalf)),
            neckLeft: pointAdd(neckPt, pointMultiply(neckN, neckHalf)),
            neckRight: pointSubtract(neckPt, pointMultiply(neckN, neckHalf)),
            headControl: pointAdd(neckPt, pointMultiply(neckN, headHalf)),
            headBaseCenter,
            tip,
            rearPt,
            neckPt,
            rearN,
            neckN,
            neckTan,
        };
    }, [currentAnchors, getAnchorsData, currentHeadLengthPx, currentRearWidthPx, currentNeckWidthPx, currentHeadWidthPx]);

    const updateShapeControl = useCallback((key, e) => {
        const map = mapRef.current;
        const geom = getShapeControlGeometry();
        if (!map || !geom)
            return;
        const markerPt = map.latLngToLayerPoint(e.target.getLatLng());
        const toPt = (base, vec) => ({ x: markerPt.x - base.x, y: markerPt.y - base.y, dot: (markerPt.x - base.x) * vec.x + (markerPt.y - base.y) * vec.y });
        const signedDistance = (base, dir) => {
            const d = toPt(base, dir);
            return d.dot;
        };
        if (key === 'rearLeft') {
            setCurrentRearWidthPx(Math.max(2, 2 * signedDistance(geom.rearPt, geom.rearN)));
        }
        else if (key === 'rearRight') {
            setCurrentRearWidthPx(Math.max(2, -2 * signedDistance(geom.rearPt, geom.rearN)));
        }
        else if (key === 'neckLeft') {
            setCurrentNeckWidthPx(Math.max(2, 2 * signedDistance(geom.neckPt, geom.neckN)));
        }
        else if (key === 'neckRight') {
            setCurrentNeckWidthPx(Math.max(2, -2 * signedDistance(geom.neckPt, geom.neckN)));
        }
        else if (key === 'headControl') {
            const currentLength = currentHeadLengthPx ?? DEFAULT_HEAD_LENGTH_PX;
            const currentHalfWidth = (currentHeadWidthPx ?? DEFAULT_HEAD_WIDTH_PX) / 2;
            const controlOrigin = pointAdd(geom.neckPt, pointMultiply(geom.neckN, currentHalfWidth));
            const controlDelta = pointSubtract(markerPt, controlOrigin);
            const projectedLengthDelta = -((controlDelta.x * geom.neckTan.x) + (controlDelta.y * geom.neckTan.y));
            const projectedHalfWidthDelta = (controlDelta.x * geom.neckN.x) + (controlDelta.y * geom.neckN.y);
            setCurrentHeadLengthPx(Math.max(2, currentLength + projectedLengthDelta));
            setCurrentHeadWidthPx(Math.max(2, 2 * (currentHalfWidth + projectedHalfWidthDelta)));
        }
    }, [getShapeControlGeometry, currentHeadLengthPx, DEFAULT_HEAD_LENGTH_PX, currentHeadWidthPx, DEFAULT_HEAD_WIDTH_PX]);
    const finalizeCurrentArrow = useCallback(() => {
        const map = mapRef.current;
        const arrowLyr = arrowLayerRef.current;
        if (!map || !arrowLyr || currentAnchors.length < 2) {
            setCurrentAnchors([]);
            return null;
        }
        const anchorsToSave = getAnchorsData().map((a) => createArrowAnchorData(a));
        let rearWidthPx = currentRearWidthPx ?? DEFAULT_REAR_WIDTH_PX;
        let neckWidthPx = currentNeckWidthPx ?? DEFAULT_NECK_WIDTH_PX;
        let headLengthPx = currentHeadLengthPx ?? DEFAULT_HEAD_LENGTH_PX;
        let headWidthPx = currentHeadWidthPx ?? DEFAULT_HEAD_WIDTH_PX;

        const baseZoom = currentParamsBaseZoom ?? map.getZoom();
        const finalArrowParams = createArrowParameters({
            rearWidthPx,
            neckWidthPx,
            headLengthPx,
            headWidthPx,
            baseZoom
        });
        const { pts, totalLength, cumLengths } = getValidPointsAndLength(map, getAnchorsData());
        if (pts.length < 2) {
            console.error("Finalize: Invalid points for geometry.");
            return null;
        }
        const scale = map.getZoomScale(map.getZoom(), baseZoom);
        const outlinePoints = calculateArrowOutlinePoints(pts, totalLength, cumLengths, rearWidthPx * scale, neckWidthPx * scale, headWidthPx * scale, headLengthPx * scale);
        if (!outlinePoints) {
            console.warn("Finalize: No polygons generated for arrow.");
            return null;
        }
        const newArrowGroup = L.layerGroup();
        try {
            const outlineLatLngs = outlinePoints.map(p => map.layerPointToLatLng(L.point(p.x, p.y)));
            if (outlineLatLngs.length >= 3) {
                const finalShape = L.polygon(outlineLatLngs, { color: 'red', fillColor: 'red', fillOpacity: 0.5, weight: 1 });
                finalShape.on('click', (ev) => {
                    L.DomEvent.stopPropagation(ev);
                    if (handleSelectArrowRef.current) {
                        handleSelectArrowRef.current(newArrowGroup);
                    }
                });
                newArrowGroup.addLayer(finalShape);
            }
            else {
                console.warn("Finalize: Not enough points for polygon.");
                return null;
            }
        }
        catch (error) {
            console.error("Error generating final polygons:", error);
            return null;
        }
        newArrowGroup.savedAnchors = anchorsToSave;
        newArrowGroup.arrowParameters = finalArrowParams;
        newArrowGroup.arrowName = currentArrowName.trim() || `Unbenannter Pfeil ${arrowNameCounter}`;
        if (selectedArrowGroup) {
            arrowLyr.removeLayer(selectedArrowGroup);
        }
        arrowLyr.addLayer(newArrowGroup);
        return newArrowGroup;
    }, [
        currentAnchors, getAnchorsData, DEFAULT_REAR_WIDTH_PX, DEFAULT_NECK_WIDTH_PX,
        DEFAULT_HEAD_LENGTH_PX, DEFAULT_HEAD_WIDTH_PX, currentRearWidthPx,
        currentNeckWidthPx, currentHeadLengthPx, currentHeadWidthPx,
        currentArrowName, arrowNameCounter, selectedArrowGroup
    ]);
    const handleSelectArrow = useCallback((arrowGroupToSelect) => {
        const map = mapRef.current;
        if (!map)
            return;
        if (editingState !== EditingState.Idle) {
            if (editingState === EditingState.DrawingNew || editingState === EditingState.EditingSelected) {
                finalizeCurrentArrow();
            }
        }
        saveStateForCancel();
        setEditingState(EditingState.EditingSelected);
        arrowLayerRef.current?.removeLayer(arrowGroupToSelect);
        setSelectedArrowGroup(arrowGroupToSelect);
        const loadedAnchors = fromArrowAnchorData(arrowGroupToSelect.savedAnchors, '_load');
        setCurrentAnchors(loadedAnchors);
        setCurrentArrowName(arrowGroupToSelect.arrowName);
        setCurrentRearWidthPx(arrowGroupToSelect.arrowParameters.rearWidthPx);
        setCurrentNeckWidthPx(arrowGroupToSelect.arrowParameters.neckWidthPx);
        setCurrentHeadLengthPx(arrowGroupToSelect.arrowParameters.headLengthPx);
        setCurrentHeadWidthPx(arrowGroupToSelect.arrowParameters.headWidthPx);
        setCurrentParamsBaseZoom(arrowGroupToSelect.arrowParameters.baseZoom);
    }, [
        editingState, saveStateForCancel, finalizeCurrentArrow
    ]);
    useEffect(() => {
        handleSelectArrowRef.current = handleSelectArrow;
    }, [handleSelectArrow]);
    const restoreStateFromCancel = useCallback(() => {
        arrowLayerRef.current?.clearLayers();
        const map = mapRef.current;
        if (!map)
            return;
        savedArrowsBackup.forEach(arrowData => {
            const anchorsDataForGeom = arrowData.savedAnchors.map((sa) => createArrowAnchorData(sa));
            const { pts, totalLength, cumLengths } = getValidPointsAndLength(map, anchorsDataForGeom);
            if (pts.length < 2 || arrowData.arrowParameters.rearWidthPx === null || arrowData.arrowParameters.neckWidthPx === null || arrowData.arrowParameters.headLengthPx === null || arrowData.arrowParameters.headWidthPx === null)
                return;
            const scale = arrowData.arrowParameters.baseZoom !== null ? map.getZoomScale(map.getZoom(), arrowData.arrowParameters.baseZoom) : 1;
            const outlinePoints = calculateArrowOutlinePoints(pts, totalLength, cumLengths, (arrowData.arrowParameters.rearWidthPx ?? 0) * scale, (arrowData.arrowParameters.neckWidthPx ?? 0) * scale, (arrowData.arrowParameters.headWidthPx ?? 0) * scale, (arrowData.arrowParameters.headLengthPx ?? 0) * scale);
            if (outlinePoints) {
                const restoredGroup = L.layerGroup();
                try {
                    const latlngs = outlinePoints.map(p => map.layerPointToLatLng(L.point(p.x, p.y)));
                    const shape = L.polygon(latlngs, { color: 'red', fillColor: 'red', fillOpacity: 0.5, weight: 1 });
                    shape.on('click', (ev) => {
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
                }
                catch (error) {
                    console.error("Error restoring arrow shape:", error);
                }
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
        setCurrentRearWidthPx(DEFAULT_REAR_WIDTH_PX);
        setCurrentNeckWidthPx(DEFAULT_NECK_WIDTH_PX);
        setCurrentHeadLengthPx(DEFAULT_HEAD_LENGTH_PX);
        setCurrentHeadWidthPx(DEFAULT_HEAD_WIDTH_PX);
    }, [editingState, arrowNameCounter, resetCurrentPixelValues, handleCancel, saveStateForCancel]);
    const handleCopyArrow = useCallback(() => {
        const map = mapRef.current;
        if (!map || editingState === EditingState.Idle || currentAnchors.length < 2)
            return;
        const currentAnchorsDataToCopy = getAnchorsData();
        const currentPixelParams = createArrowParameters({
            rearWidthPx: currentRearWidthPx,
            neckWidthPx: currentNeckWidthPx,
            headLengthPx: currentHeadLengthPx,
            headWidthPx: currentHeadWidthPx,
            baseZoom: currentParamsBaseZoom,
        });
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
        let perpDir = { x: 0, y: 1 };
        if (len > 1e-6)
            perpDir = normalize(perpendicular(vec));
        const offset = pointMultiply(perpDir, offsetMagnitude);
        const copiedAnchors = currentAnchorsDataToCopy.map((aData, i) => {
            const newId = Date.now().toString() + Math.random().toString() + `_copy_${i}`;
            const currentAnchorPt = map.latLngToLayerPoint(L.latLng(aData.latlng.lat, aData.latlng.lng));
            const newGeomPt = pointAdd(currentAnchorPt, offset);
            const newLatLng = createLatLngLiteral(map.layerPointToLatLng(L.point(newGeomPt.x, newGeomPt.y)));
            let newH1 = undefined;
            if (aData.handle1) {
                const currentH1Pt = map.latLngToLayerPoint(L.latLng(aData.handle1.lat, aData.handle1.lng));
                const newH1GeomPt = pointAdd(currentH1Pt, offset);
                newH1 = createLatLngLiteral(map.layerPointToLatLng(L.point(newH1GeomPt.x, newH1GeomPt.y)));
            }
            let newH2 = undefined;
            if (aData.handle2) {
                const currentH2Pt = map.latLngToLayerPoint(L.latLng(aData.handle2.lat, aData.handle2.lng));
                const newH2GeomPt = pointAdd(currentH2Pt, offset);
                newH2 = createLatLngLiteral(map.layerPointToLatLng(L.point(newH2GeomPt.x, newH2GeomPt.y)));
            }
            return createArrowAnchorEntity({ id: newId, latlng: newLatLng, handle1: newH1, handle2: newH2 });
        });
        setCurrentAnchors(copiedAnchors);
        setCurrentRearWidthPx(currentPixelParams.rearWidthPx);
        setCurrentNeckWidthPx(currentPixelParams.neckWidthPx);
        setCurrentHeadLengthPx(currentPixelParams.headLengthPx);
        setCurrentHeadWidthPx(currentPixelParams.headWidthPx);
        setCurrentParamsBaseZoom(currentPixelParams.baseZoom);
        setCurrentArrowName(`${currentNameVal} (Kopie)`);
    }, [editingState, currentAnchors.length, currentRearWidthPx, currentHeadLengthPx, currentHeadWidthPx, currentArrowName, getAnchorsData, handleConfirm]);
    const handleDeleteSelectedArrow = useCallback(() => {
        if (editingState === EditingState.EditingSelected && selectedArrowGroup) {
            // The selectedArrowGroup is already removed from arrowLayerRef.current.
            // We need to ensure it's also removed from the `savedArrowsBackup` if it was there.
            // This backup represents the state *before* this arrow was selected for editing.
            const updatedBackup = savedArrowsBackup.filter(backupProps => {
                // Attempt to identify if backupProps corresponds to selectedArrowGroup.
                // This is imperfect without a stable ID. Comparing by name and structure.
                if (backupProps.arrowName !== selectedArrowGroup.arrowName)
                    return true;
                if (backupProps.savedAnchors.length !== selectedArrowGroup.savedAnchors.length)
                    return true;
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
    const handleSliderChange = useCallback((value, type) => {
    }, []);
    const generateGeoJsonForArrowForMap = useCallback((anchorsData, params, name) => {
        const map = mapRef.current;
        if (!map)
            return null;
        return generateGeoJsonForArrow(map, anchorsData, params, name);
    }, []);
    const handleCopyGeoJson = useCallback(() => {
        if (editingState === EditingState.Idle || currentAnchors.length < 2)
            return;
        const rearWidthPx = currentRearWidthPx ?? DEFAULT_REAR_WIDTH_PX;
        const neckWidthPx = currentNeckWidthPx ?? DEFAULT_NECK_WIDTH_PX;
        const headLengthPx = currentHeadLengthPx ?? DEFAULT_HEAD_LENGTH_PX;
        const headWidthPx = currentHeadWidthPx ?? DEFAULT_HEAD_WIDTH_PX;
        const feature = generateGeoJsonForArrowForMap(getAnchorsData(), createArrowParameters({
            rearWidthPx,
            neckWidthPx,
            headLengthPx,
            headWidthPx,
            baseZoom: currentParamsBaseZoom ?? (mapRef.current ? mapRef.current.getZoom() : 0)
        }), currentArrowName);
        if (feature) {
            const jsonString = JSON.stringify(feature, null, 2);
            navigator.clipboard.writeText(jsonString)
                .then(() => alert("GeoJSON copied to clipboard!"))
                .catch(err => {
                console.error('Clipboard copy failed:', err);
                alert('Failed to copy GeoJSON. Check console.');
            });
        }
        else {
            alert("Could not generate GeoJSON for the current arrow.");
        }
    }, [editingState, currentAnchors.length, getAnchorsData, currentRearWidthPx, currentNeckWidthPx, currentHeadLengthPx, currentHeadWidthPx, currentArrowName, currentParamsBaseZoom, generateGeoJsonForArrowForMap]);
    const handleSaveAllGeoJson = useCallback(() => {
        if (editingState !== EditingState.Idle && currentAnchors.length > 0) {
            alert("Please finish or cancel current editing before saving all arrows.");
            return;
        }
        const features = [];
        arrowLayerRef.current?.eachLayer(layer => {
            const arrowGroup = layer;
            if (arrowGroup.savedAnchors && arrowGroup.arrowParameters) {
                const anchorsForGeoJson = arrowGroup.savedAnchors.map((sa) => createArrowAnchorData(sa));
                const feature = generateGeoJsonForArrowForMap(anchorsForGeoJson, arrowGroup.arrowParameters, arrowGroup.arrowName);
                if (feature)
                    features.push(feature);
            }
        });
        if (features.length === 0) {
            alert("No arrows to export.");
            return;
        }
        const featureCollection = { type: "FeatureCollection", features };
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
    }, [editingState, currentAnchors.length, generateGeoJsonForArrowForMap]);
    // Effects
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current)
            return;
        const { map, drawingLayer, arrowLayer, editingArrowLayer } = setupLeafletMap(mapContainerRef.current);
        mapRef.current = map;
        drawingLayerRef.current = drawingLayer;
        arrowLayerRef.current = arrowLayer;
        editingArrowLayerRef.current = editingArrowLayer;
        return () => {
            teardownLeafletMap(map);
            mapRef.current = null;
        };
    }, []);
    useEffect(() => {
        const map = mapRef.current;
        if (!map)
            return;
        const onMapClickHandler = (e) => {
            if (editingState === EditingState.DrawingNew && !isArrowDraggingRef.current) {
                addAnchor(e.latlng, currentAnchors.length);
            }
        };
        if (editingState === EditingState.DrawingNew) {
            map.on('click', onMapClickHandler);
            map.getContainer().style.cursor = 'crosshair';
        }
        else {
            map.off('click', onMapClickHandler);
            map.getContainer().style.cursor = (editingState === EditingState.EditingSelected) ? 'default' : '';
        }
        return () => { map.off('click', onMapClickHandler); };
    }, [editingState, currentAnchors.length, addAnchor]);
   useEffect(() => {
       if (editingState === EditingState.DrawingNew || editingState === EditingState.EditingSelected) {
           updateCurveAndArrowPreview();
       }
       else {
           drawingLayerRef.current?.eachLayer(layer => {
               if (layer.options?.isPreviewLine)
                   drawingLayerRef.current?.removeLayer(layer);
           });
           editingArrowLayerRef.current?.clearLayers();
       }
    }, [currentAnchors, DEFAULT_REAR_WIDTH_PX, DEFAULT_HEAD_LENGTH_PX, DEFAULT_HEAD_WIDTH_PX, currentRearWidthPx, currentHeadLengthPx, currentHeadWidthPx, editingState, updateCurveAndArrowPreview]);


    // Effect for managing anchor/handle markers and connector lines
    useEffect(() => {
        const map = mapRef.current;
        const drawingLayer = drawingLayerRef.current;
        if (!map || !drawingLayer)
            return;
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
                if (h1Marker) {
                    drawingLayer.removeLayer(h1Marker);
                    handle1MarkersRef.current.delete(anchor.id);
                }
                const c1Line = connector1LinesRef.current.get(anchor.id);
                if (c1Line) {
                    drawingLayer.removeLayer(c1Line);
                    connector1LinesRef.current.delete(anchor.id);
                }
            }
            if (!anchor.handle2) {
                const h2Marker = handle2MarkersRef.current.get(anchor.id);
                if (h2Marker) {
                    drawingLayer.removeLayer(h2Marker);
                    handle2MarkersRef.current.delete(anchor.id);
                }
                const c2Line = connector2LinesRef.current.get(anchor.id);
                if (c2Line) {
                    drawingLayer.removeLayer(c2Line);
                    connector2LinesRef.current.delete(anchor.id);
                }
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
            }
            else {
                existingAnchorMarker = L.marker(anchorLatLng, { icon: anchorIcon, draggable: true, zIndexOffset: 1000 })
                    .addTo(drawingLayer);
                existingAnchorMarker.on('dragstart', (e) => handleAnchorDragStart(e, anchor.id));
                existingAnchorMarker.on('drag', (e) => handleAnchorDrag(e, anchor.id));
                existingAnchorMarker.on('dragend', (e) => handleAnchorDragEnd(e, anchor.id));
                existingAnchorMarker.on('click', (e) => {
                    L.DomEvent.stopPropagation(e);
                });
                anchorMarkersRef.current.set(anchor.id, existingAnchorMarker);
            }
            // Handle 1 & Connector 1
            if (anchor.handle1 && anchorIndex > 0) {
                const handle1LatLng = L.latLng(anchor.handle1.lat, anchor.handle1.lng);
                let h1Marker = handle1MarkersRef.current.get(anchor.id);
                if (h1Marker) {
                    if (!h1Marker.getLatLng().equals(handle1LatLng))
                        h1Marker.setLatLng(handle1LatLng);
                }
                else {
                    h1Marker = L.marker(handle1LatLng, { icon: handleIcon, draggable: true, zIndexOffset: 900 }).addTo(drawingLayer);
                    h1Marker.on('dragstart', handleGenericDragStart);
                    h1Marker.on('drag', (e) => handleHandleDrag(e, anchor.id, 1));
                    h1Marker.on('dragend', handleGenericDragEnd);
                    h1Marker.on('click', L.DomEvent.stopPropagation);
                    handle1MarkersRef.current.set(anchor.id, h1Marker);
                }
                let c1Line = connector1LinesRef.current.get(anchor.id);
                const c1LatLngs = [anchorLatLng, handle1LatLng];
                if (c1Line) {
                    c1Line.setLatLngs(c1LatLngs);
                }
                else {
                    c1Line = L.polyline(c1LatLngs, { color: 'gray', dashArray: '2,2', weight: 1, interactive: false }).addTo(drawingLayer);
                    connector1LinesRef.current.set(anchor.id, c1Line);
                }
            }
            else { // Cleanup if handle1 should not exist
                const oldH1Marker = handle1MarkersRef.current.get(anchor.id);
                if (oldH1Marker) {
                    drawingLayer.removeLayer(oldH1Marker);
                    handle1MarkersRef.current.delete(anchor.id);
                }
                const oldC1Line = connector1LinesRef.current.get(anchor.id);
                if (oldC1Line) {
                    drawingLayer.removeLayer(oldC1Line);
                    connector1LinesRef.current.delete(anchor.id);
                }
            }
            // Handle 2 & Connector 2
            if (anchor.handle2 && anchorIndex < currentAnchors.length - 1) {
                const handle2LatLng = L.latLng(anchor.handle2.lat, anchor.handle2.lng);
                let h2Marker = handle2MarkersRef.current.get(anchor.id);
                if (h2Marker) {
                    if (!h2Marker.getLatLng().equals(handle2LatLng))
                        h2Marker.setLatLng(handle2LatLng);
                }
                else {
                    h2Marker = L.marker(handle2LatLng, { icon: handleIcon, draggable: true, zIndexOffset: 900 }).addTo(drawingLayer);
                    h2Marker.on('dragstart', handleGenericDragStart);
                    h2Marker.on('drag', (e) => handleHandleDrag(e, anchor.id, 2));
                    h2Marker.on('dragend', handleGenericDragEnd);
                    h2Marker.on('click', L.DomEvent.stopPropagation);
                    handle2MarkersRef.current.set(anchor.id, h2Marker);
                }
                let c2Line = connector2LinesRef.current.get(anchor.id);
                const c2LatLngs = [anchorLatLng, handle2LatLng];
                if (c2Line) {
                    c2Line.setLatLngs(c2LatLngs);
                }
                else {
                    c2Line = L.polyline(c2LatLngs, { color: 'gray', dashArray: '2,2', weight: 1, interactive: false }).addTo(drawingLayer);
                    connector2LinesRef.current.set(anchor.id, c2Line);
                }
            }
            else { // Cleanup if handle2 should not exist
                const oldH2Marker = handle2MarkersRef.current.get(anchor.id);
                if (oldH2Marker) {
                    drawingLayer.removeLayer(oldH2Marker);
                    handle2MarkersRef.current.delete(anchor.id);
                }
                const oldC2Line = connector2LinesRef.current.get(anchor.id);
                if (oldC2Line) {
                    drawingLayer.removeLayer(oldC2Line);
                    connector2LinesRef.current.delete(anchor.id);
                }
            }
        });
    }, [currentAnchors, editingState , handleAnchorDragStart, handleAnchorDrag, handleAnchorDragEnd, handleGenericDragStart, handleHandleDrag, handleGenericDragEnd]);
    useEffect(() => {
        const map = mapRef.current;
        const drawingLayer = drawingLayerRef.current;
        if (!map || !drawingLayer)
            return;
        const geom = getShapeControlGeometry();
        if (!geom || !isEditing(editingState)) {
            shapeControlMarkersRef.current.forEach((m) => drawingLayer.removeLayer(m));
            shapeControlMarkersRef.current.clear();
            return;
        }
        const controlDefs = [
            { key: 'rearLeft', point: geom.rearLeft },
            { key: 'rearRight', point: geom.rearRight },
            { key: 'neckLeft', point: geom.neckLeft },
            { key: 'neckRight', point: geom.neckRight },
            { key: 'headControl', point: geom.headControl },
        ];
        controlDefs.forEach((control) => {
            const p = control.point;
            const latlng = map.layerPointToLatLng(L.point(p.x, p.y));
            let marker = shapeControlMarkersRef.current.get(control.key);
            if (!marker) {
                marker = L.marker(latlng, { draggable: true, zIndexOffset: 1100, icon: L.divIcon({ html: '<div style="width:10px;height:10px;border-radius:5px;background:#111;border:2px solid #fff"></div>', className: 'leaflet-div-icon shape-control-icon', iconSize: [10, 10], iconAnchor: [5, 5] }) }).addTo(drawingLayer);
                marker.on('dragstart', handleGenericDragStart);
                marker.on('drag', (e) => updateShapeControl(control.key, e));
                marker.on('dragend', handleGenericDragEnd);
                shapeControlMarkersRef.current.set(control.key, marker);
            }
            else {
                marker.setLatLng(latlng);
            }
        });
    }, [editingState, getShapeControlGeometry, currentRearWidthPx, currentNeckWidthPx, currentHeadWidthPx, currentHeadLengthPx, updateShapeControl, handleGenericDragStart, handleGenericDragEnd]);

    // Control panel contract
    const canEditParameters = getCanEditParameters(editingState) && currentAnchors.length >= 2;
    const canCopyCurrentArrow = isEditing(editingState) && currentAnchors.length >= 2;
    const canDeleteArrow = getCanDeleteArrow(editingState, selectedArrowGroup !== null);
    const canCopyGeoJsonCurrent = canEditParameters;
    const canSaveAllGeoJsonExport = getCanSaveAllGeoJson(editingState, arrowLayerRef.current?.getLayers().length ?? 0);
    const controlPanelUiState = {
        editingState,
        canCopyArrow: canCopyCurrentArrow,
        canDeleteArrow,
        arrowName: currentArrowName,
        canEditName: editingState !== EditingState.Idle,
        canCopyGeoJson: canCopyGeoJsonCurrent,
        canSaveAllGeoJson: canSaveAllGeoJsonExport,
    };
    const controlPanelActions = {
        onDrawArrow: handleDrawArrow,
        onCopyArrow: handleCopyArrow,
        onDeleteArrow: handleDeleteSelectedArrow,
        onArrowNameChange: setCurrentArrowName,
        onCopyGeoJson: handleCopyGeoJson,
        onSaveAllGeoJson: handleSaveAllGeoJson,
        onConfirm: () => handleConfirm(true),
        onCancel: handleCancel,
    };
    return (_jsxs("div", { className: "relative h-full w-full flex", children: [_jsx("div", { ref: mapContainerRef, id: "map", className: "h-full w-full grow" }), _jsx(ControlPanel, { uiState: controlPanelUiState, actions: controlPanelActions })] }));
};
export default App;
