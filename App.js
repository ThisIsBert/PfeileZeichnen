import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { EditingState } from './types.js';
import ControlPanel from './components/ControlPanel.js';
import { DEFAULT_REAR_WIDTH_PX, DEFAULT_NECK_WIDTH_PX, DEFAULT_HEAD_WIDTH_PX, DEFAULT_HEAD_LENGTH_PX, anchorIcon, handleIcon } from './constants.js';
import { pointSubtract, pointAdd, pointMultiply, pointLength, normalize, perpendicular, getValidPointsAndLength, sampleCenterlineAtDistance, calculateArrowOutlinePolygons } from './app/geometry/index.js';
import { setupLeafletMap, teardownLeafletMap } from './app/map/lifecycle.js';
import { findClosestCurveSegmentIndex } from './app/map/interactions/click.js';
import { insertAnchorWithAlignedHandles } from './app/map/interactions/handleUpdates.js';
import { getContainerPoint, getInitialLayerPoints, translateAnchorsByDelta, bindSavedArrowInteractions } from './app/map/interactions/drag.js';
import { parseTemplateGeoJson } from './app/io/importGeoJson.js';
import { createTemplateGeometryLayer } from './app/map/templateLayer.js';
import { generateGeoJsonForArrow } from './app/io/exportGeoJson.js';
import { canDeleteArrow as getCanDeleteArrow, canEditParameters as getCanEditParameters, canSaveAllGeoJson as getCanSaveAllGeoJson, isEditing } from './app/state/editingState.js';
import { fromArrowAnchorData, toArrowAnchorData } from './app/adapters/leafletArrowAdapter.js';
import { createArrowAnchorData, resolveArrowParameters, createArrowAnchorEntity, createArrowParameters, createPersistedArrow, createLatLngLiteral } from './app/types/arrowModel.js';
import { useEditorHistory } from './app/hooks/useEditorHistory.js';
import { createSavedArrowGroup, getSavedArrowData } from './app/map/savedArrows.js';
import { clampFormValue } from './app/types/shapeParameters.js';
const App = () => {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const drawingLayerRef = useRef(null);
    const templateLayerRef = useRef(null);
    const arrowLayerRef = useRef(null);
    const editingArrowLayerRef = useRef(null);
    const history = useEditorHistory();
    const [editorError, setEditorError] = useState('');
    const [mapZoom, setMapZoom] = useState(null);
    const isSceneDraggingRef = useRef(false);
    const ignoreDragClickRef = useRef(false);
    const suppressDragClick = useCallback(() => {
        // A browser click can follow mouseup when a dragged marker ends over
        // another element. It must not finish the editing session.
        ignoreDragClickRef.current = true;
        setTimeout(() => { ignoreDragClickRef.current = false; }, 0);
    }, []);
    const [editingState, setEditingState] = useState(EditingState.Idle);
    const [isPickingShape, setIsPickingShape] = useState(false);
    const shapePickerRef = useRef(isPickingShape);
    shapePickerRef.current = isPickingShape;
    const editingStateRef = useRef(editingState);
    editingStateRef.current = editingState;
    const [currentAnchors, setCurrentAnchors] = useState([]);
    const [selectedArrowGroup, setSelectedArrowGroup] = useState(null);
    const [currentShaftThicknessPx, setCurrentShaftThicknessPx] = useState(null);
    const [currentRearTaper, setCurrentRearTaper] = useState(null);
    const [currentFrontTaper, setCurrentFrontTaper] = useState(null);
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
    const bindSavedArrow = useCallback((shape, arrowGroup) => {
        bindSavedArrowInteractions(mapRef.current, shape, arrowGroup, {
            canDrag: () => editingStateRef.current === EditingState.Idle && !shapePickerRef.current,
            onClick: event => handleSelectArrowRef.current?.(arrowGroup, event.latlng),
            onDragStart: () => { isSceneDraggingRef.current = true; history.begin(); },
            onDragEnd: () => { isSceneDraggingRef.current = false; history.end(); },
        });
    }, [history.begin, history.end]);
    const buildSavedArrow = useCallback(data => createSavedArrowGroup(mapRef.current, data, bindSavedArrow), [bindSavedArrow]);
    // Refs for Leaflet objects
    const anchorMarkersRef = useRef(new Map());
    const handle1MarkersRef = useRef(new Map());
    const handle2MarkersRef = useRef(new Map());
    const connector1LinesRef = useRef(new Map());
    const connector2LinesRef = useRef(new Map());
    const currentGeometryRef = useRef(null);
    const previousStationFramesRef = useRef({ rearN: null, neckN: null, tipN: null });
    const stationTangentContextsRef = useRef({
        rear: { lastMode: null, lastValidTangent: null, lastValidNormal: null },
        neck: { lastMode: null, lastValidTangent: null, lastValidNormal: null },
        tip: { lastMode: null, lastValidTangent: null, lastValidNormal: null },
    });
    const getAnchorsData = useCallback(() => toArrowAnchorData(currentAnchors), [currentAnchors]);
    const resetPreviousStationFrames = useCallback(() => {
        previousStationFramesRef.current = { rearN: null, neckN: null, tipN: null };
        stationTangentContextsRef.current = {
            rear: { lastMode: null, lastValidTangent: null, lastValidNormal: null },
            neck: { lastMode: null, lastValidTangent: null, lastValidNormal: null },
            tip: { lastMode: null, lastValidTangent: null, lastValidNormal: null },
        };
    }, []);
    const alignStationNormalWithPrevious = useCallback((nextNormal, previousNormal) => {
        if (!nextNormal || pointLength(nextNormal) < 1e-9) {
            return previousNormal ?? { x: 0, y: 1 };
        }
        if (!previousNormal) {
            return nextNormal;
        }
        return ((nextNormal.x * previousNormal.x) + (nextNormal.y * previousNormal.y)) < 0
            ? pointMultiply(nextNormal, -1)
            : nextNormal;
    }, []);
    const createGeometrySnapshot = useCallback((centerline, totalLength, headLengthPx) => {
        if (!centerline || totalLength <= 1e-6)
            return null;
        const clampedHeadLengthPx = Math.min(Math.max(0, headLengthPx), totalLength);
        const neckS = Math.max(0, totalLength - clampedHeadLengthPx);
        const tangentContexts = stationTangentContextsRef.current;
        const rearStation = sampleCenterlineAtDistance(centerline, 0, tangentContexts.rear);
        const neckStation = sampleCenterlineAtDistance(centerline, neckS, tangentContexts.neck);
        const tipStation = sampleCenterlineAtDistance(centerline, totalLength, tangentContexts.tip);
        if (!rearStation || !neckStation || !tipStation)
            return null;
        const previousNormals = previousStationFramesRef.current;
        const rearN = alignStationNormalWithPrevious(rearStation.normal, previousNormals.rearN);
        const neckN = alignStationNormalWithPrevious(neckStation.normal, previousNormals.neckN);
        const tipN = alignStationNormalWithPrevious(tipStation.normal, previousNormals.tipN);
        previousStationFramesRef.current = { rearN, neckN, tipN };
        return {
            centerline,
            totalLength,
            stations: {
                rear: { ...rearStation, normal: rearN },
                neck: { ...neckStation, normal: neckN },
                tip: { ...tipStation, normal: tipN },
                headLengthPx: clampedHeadLengthPx,
            },
        };
    }, [alignStationNormalWithPrevious]);
    const defaultRearTaper = DEFAULT_REAR_WIDTH_PX / DEFAULT_NECK_WIDTH_PX;
    const defaultFrontTaper = 1;
    const shaftThicknessPx = currentShaftThicknessPx ?? DEFAULT_NECK_WIDTH_PX;
    const rearTaper = currentRearTaper ?? defaultRearTaper;
    const frontTaper = currentFrontTaper ?? defaultFrontTaper;
    const rearWidthPx = Math.max(2, shaftThicknessPx * rearTaper);
    const neckWidthPx = Math.max(2, shaftThicknessPx * frontTaper);
    const ensureShapeDefaults = useCallback(() => {
        if (currentShaftThicknessPx !== null && currentRearTaper !== null && currentFrontTaper !== null && currentHeadWidthPx !== null && currentHeadLengthPx !== null) {
            return;
        }
        setCurrentShaftThicknessPx(currentShaftThicknessPx ?? DEFAULT_NECK_WIDTH_PX);
        setCurrentRearTaper(currentRearTaper ?? defaultRearTaper);
        setCurrentFrontTaper(currentFrontTaper ?? defaultFrontTaper);
        setCurrentHeadWidthPx(currentHeadWidthPx ?? DEFAULT_HEAD_WIDTH_PX);
        setCurrentHeadLengthPx(currentHeadLengthPx ?? DEFAULT_HEAD_LENGTH_PX);
        if (currentParamsBaseZoom === null && mapRef.current) {
            setCurrentParamsBaseZoom(mapRef.current.getZoom());
        }
    }, [currentShaftThicknessPx, currentRearTaper, currentFrontTaper, currentHeadWidthPx, currentHeadLengthPx, currentParamsBaseZoom, defaultRearTaper, defaultFrontTaper]);
    const resetCurrentPixelValues = useCallback(() => {
        setIsPickingShape(false);
        setCurrentShaftThicknessPx(null);
        setCurrentRearTaper(null);
        setCurrentFrontTaper(null);
        setCurrentHeadWidthPx(null);
        setCurrentHeadLengthPx(null);
        setCurrentParamsBaseZoom(null);
    }, []);
    const addAnchor = useCallback((latlng, index) => {
        const map = mapRef.current;
        if (!map)
            return;
        history.run(() => setCurrentAnchors(prevAnchors => {
            const newAnchorId = Date.now().toString() + Math.random().toString();
            const newAnchorLatLng = L.latLng(latlng.lat, latlng.lng);
            return insertAnchorWithAlignedHandles(map, prevAnchors, newAnchorLatLng, index, newAnchorId);
        }));
    }, [history.run]);
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
        suppressDragClick();
        isSceneDraggingRef.current = false;
        history.end();
        document.removeEventListener('mouseup', stopArrowDrag);
        window.removeEventListener('blur', stopArrowDrag);
        map.off('mousemove', onArrowDrag);
        map.off('mouseup', stopArrowDrag);
        map.dragging.enable();
        map.getContainer().style.cursor = (editingState === EditingState.DrawingNew) ? "crosshair" : "default";
    }, [editingState, onArrowDrag, history.end, suppressDragClick]);
    const startArrowDrag = useCallback((e) => {
        const map = mapRef.current;
        if (!map || currentAnchors.length < 1 || editingState === EditingState.Idle)
            return;
        if (shapePickerRef.current || e.originalEvent?.shiftKey)
            return;
        L.DomEvent.stopPropagation(e.originalEvent);
        L.DomEvent.preventDefault(e.originalEvent);
        history.begin();
        isSceneDraggingRef.current = true;
        isArrowDraggingRef.current = true;
        arrowDragStartPointRef.current = getContainerPoint(map, e.originalEvent);
        const initialLayerPoints = getInitialLayerPoints(map, currentAnchors);
        initialAnchorLayerPointsRef.current = initialLayerPoints.anchor;
        initialHandle1LayerPointsRef.current = initialLayerPoints.handle1;
        initialHandle2LayerPointsRef.current = initialLayerPoints.handle2;
        map.dragging.disable();
        map.on('mousemove', onArrowDrag);
        map.on('mouseup', stopArrowDrag);
        document.addEventListener('mouseup', stopArrowDrag);
        window.addEventListener('blur', stopArrowDrag);
        map.getContainer().style.cursor = 'grabbing';
    }, [currentAnchors, editingState, onArrowDrag, stopArrowDrag, history.begin]);
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
            currentGeometryRef.current = null;
            resetPreviousStationFrames();
            return;
        }
        const { pts, totalLength, validCurveData, centerline } = getValidPointsAndLength(map, anchorsData);
        if (pts.length < 2) {
            currentGeometryRef.current = null;
            resetPreviousStationFrames();
            return;
        }
        try {
            const latlngs = validCurveData.map(d => map.layerPointToLatLng(L.point(d.pt.x, d.pt.y)));
            if (latlngs.length >= 2) {
                const previewLine = L.polyline(latlngs, {
                    color: 'green', dashArray: '5,5', weight: 1, interactive: editingState === EditingState.EditingSelected,
                    bubblingMouseEvents: false, isPreviewLine: true
                });
                previewLine.on('click', (ev) => {
                    L.DomEvent.stopPropagation(ev);
                    if (!shapePickerRef.current && editingState === EditingState.EditingSelected) {
                        const segmentIndex = findClosestCurveSegmentIndex(map, ev.latlng, anchorsData);
                        if (segmentIndex >= 0)
                            addAnchor(ev.latlng, segmentIndex + 1);
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
        currentGeometryRef.current = createGeometrySnapshot(centerline, totalLength, (currentHeadLengthPx ?? DEFAULT_HEAD_LENGTH_PX) * scale);
        const scaledRearWidthPx = Math.max(0, rearWidthPx * scale);
        const scaledNeckWidthPx = Math.max(0, neckWidthPx * scale);
        const geometrySnapshot = currentGeometryRef.current;
        if (!geometrySnapshot)
            return;
        const headLengthPx = geometrySnapshot.stations.headLengthPx;
        const headWidthPx = Math.max(0, (currentHeadWidthPx ?? DEFAULT_HEAD_WIDTH_PX) * scale);
        const outlinePoints = calculateArrowOutlinePolygons(geometrySnapshot.centerline, scaledRearWidthPx, scaledNeckWidthPx, headWidthPx, headLengthPx);
        if (outlinePoints) {
            try {
                const outlineLatLngs = outlinePoints.map(polygon => polygon.map(ring => ring.map(p => map.layerPointToLatLng(L.point(p.x, p.y)))));
                if (outlineLatLngs.length > 0) {
                    const arrowPreviewShape = L.polygon(outlineLatLngs, {
                        color: 'blue', fillColor: 'blue', fillOpacity: 0.3, weight: 1, interactive: editingState === EditingState.EditingSelected, bubblingMouseEvents: false
                    });
                    arrowPreviewShape.on('mousedown', (ev) => {
                        L.DomEvent.stopPropagation(ev);
                        startArrowDrag(ev);
                    });
                    arrowPreviewShape.on('click', (ev) => {
                        L.DomEvent.stopPropagation(ev);
                        if (!shapePickerRef.current && ev.originalEvent?.shiftKey && editingState === EditingState.EditingSelected) {
                            const segmentIndex = findClosestCurveSegmentIndex(map, ev.latlng, anchorsData);
                            if (segmentIndex >= 0)
                                addAnchor(ev.latlng, segmentIndex + 1);
                        }
                    });
                    editingArrowLyr.addLayer(arrowPreviewShape);
                }
            }
            catch (error) {
                console.error("Error creating arrow preview shape:", error);
            }
        }
    }, [getAnchorsData, editingState, rearWidthPx, neckWidthPx, currentHeadLengthPx, currentHeadWidthPx, currentParamsBaseZoom, resetCurrentPixelValues, ensureShapeDefaults, startArrowDrag, createGeometrySnapshot, resetPreviousStationFrames, addAnchor]);
    const handleGenericDragStart = useCallback((e) => {
        isSceneDraggingRef.current = true;
        history.begin();
        mapRef.current?.dragging.disable();
        if (e.originalEvent)
            L.DomEvent.stopPropagation(e.originalEvent);
    }, [history.begin]);
    const handleGenericDragEnd = useCallback((e) => {
        suppressDragClick();
        isSceneDraggingRef.current = false;
        history.end();
        mapRef.current?.dragging.enable();
        if (e.originalEvent)
            L.DomEvent.stopPropagation(e.originalEvent);
    }, [history.end, suppressDragClick]);
    const handleAnchorDragStart = useCallback((e, _anchorId) => {
        handleGenericDragStart(e);
    }, [handleGenericDragStart]);
    const handleAnchorDrag = useCallback((e, anchorId) => {
        const map = mapRef.current;
        const targetMarker = e.target;
        const newLatLngLiteral = targetMarker.getLatLng();
        setCurrentAnchors(prev => prev.map(a => {
            if (a.id === anchorId && map) {
                const updatedAnchorPart = createArrowAnchorData({ latlng: createLatLngLiteral(newLatLngLiteral), handle1: a.handle1, handle2: a.handle2 });
                try {
                    const oldAnchorPoint = map.latLngToLayerPoint(L.latLng(a.latlng.lat, a.latlng.lng));
                    const newAnchorPoint = map.latLngToLayerPoint(newLatLngLiteral);
                    const delta = pointSubtract(newAnchorPoint, oldAnchorPoint);
                    if (a.handle1) {
                        const oldHandle1Point = map.latLngToLayerPoint(L.latLng(a.handle1.lat, a.handle1.lng));
                        const newHandle1GeomPoint = pointAdd(oldHandle1Point, delta);
                        updatedAnchorPart.handle1 = createLatLngLiteral(map.layerPointToLatLng(L.point(newHandle1GeomPoint.x, newHandle1GeomPoint.y)));
                    }
                    if (a.handle2) {
                        const oldHandle2Point = map.latLngToLayerPoint(L.latLng(a.handle2.lat, a.handle2.lng));
                        const newHandle2GeomPoint = pointAdd(oldHandle2Point, delta);
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
    const handleAnchorDragEnd = useCallback((e, _anchorId) => {
        handleGenericDragEnd(e);
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
                    id: arrowGroup.arrowId,
                    savedAnchors: JSON.parse(JSON.stringify(arrowGroup.savedAnchors)),
                    arrowParameters: JSON.parse(JSON.stringify(arrowGroup.arrowParameters)),
                    arrowName: arrowGroup.arrowName,
                }));
            }
        });
        setSavedArrowsBackup(currentFinalizedArrows);
        setBackupArrowNameCounter(arrowNameCounter);
    }, [arrowNameCounter]);

    const finalizeCurrentArrow = useCallback(() => {
        const map = mapRef.current;
        const arrowLayer = arrowLayerRef.current;
        const group = buildSavedArrow({
            id: selectedArrowGroup?.arrowId,
            savedAnchors: getAnchorsData(),
            arrowParameters: createArrowParameters({
                shaftThicknessPx, rearTaper, frontTaper,
                headLengthPx: currentHeadLengthPx ?? DEFAULT_HEAD_LENGTH_PX,
                headWidthPx: currentHeadWidthPx ?? DEFAULT_HEAD_WIDTH_PX,
                baseZoom: currentParamsBaseZoom ?? map?.getZoom() ?? null,
            }),
            arrowName: currentArrowName.trim() || `Unbenannter Pfeil ${arrowNameCounter}`,
        });
        if (!group || !arrowLayer) {
            setEditorError('Der Pfeil konnte nicht gespeichert werden. Prüfe die Stützpunkte oder wähle Rückgängig. Deine Bearbeitung bleibt erhalten.');
            return null;
        }
        if (selectedArrowGroup) arrowLayer.removeLayer(selectedArrowGroup);
        arrowLayer.addLayer(group);
        setEditorError('');
        return group;
    }, [buildSavedArrow, selectedArrowGroup, getAnchorsData, shaftThicknessPx, rearTaper, frontTaper,
        currentHeadLengthPx, currentHeadWidthPx, currentParamsBaseZoom, currentArrowName, arrowNameCounter]);
    const applyArrowParameters = useCallback(parameters => {
        const params = resolveArrowParameters(parameters);
        setCurrentShaftThicknessPx(params.shaftThicknessPx);
        setCurrentRearTaper(params.rearTaper);
        setCurrentFrontTaper(params.frontTaper);
        setCurrentHeadLengthPx(params.headLengthPx);
        setCurrentHeadWidthPx(params.headWidthPx);
        setCurrentParamsBaseZoom(params.baseZoom ?? mapRef.current?.getZoom() ?? null);
    }, []);
    const handleSelectArrow = useCallback((arrowGroupToSelect, clickedLatLng = null) => {
        const map = mapRef.current;
        if (!map)
            return;
        if (shapePickerRef.current) {
            history.run(() => applyArrowParameters(arrowGroupToSelect.arrowParameters));
            setIsPickingShape(false);
            return;
        }
        if (editingState === EditingState.DrawingNew && clickedLatLng) {
            addAnchor(clickedLatLng, currentAnchors.length);
            return;
        }
        if (editingState !== EditingState.Idle) {
            if (editingState === EditingState.DrawingNew || editingState === EditingState.EditingSelected) {
                if (!finalizeCurrentArrow()) return;
            }
        }
        saveStateForCancel();
        setEditingState(EditingState.EditingSelected);
        arrowLayerRef.current?.removeLayer(arrowGroupToSelect);
        setSelectedArrowGroup(arrowGroupToSelect);
        const loadedAnchors = fromArrowAnchorData(arrowGroupToSelect.savedAnchors, '_load');
        setCurrentAnchors(loadedAnchors);
        setCurrentArrowName(arrowGroupToSelect.arrowName);
        applyArrowParameters(arrowGroupToSelect.arrowParameters);
    }, [
        editingState, saveStateForCancel, finalizeCurrentArrow, addAnchor, currentAnchors.length, applyArrowParameters, history.run
    ]);
    useEffect(() => {
        handleSelectArrowRef.current = handleSelectArrow;
    }, [handleSelectArrow]);
    const restoreStateFromCancel = useCallback(() => {
        const groups = savedArrowsBackup.map(buildSavedArrow);
        if (groups.some(group => !group)) {
            setEditorError('Der vorherige Stand konnte nicht wiederhergestellt werden. Die Bearbeitung bleibt offen.');
            return false;
        }
        arrowLayerRef.current?.clearLayers();
        groups.forEach(group => arrowLayerRef.current?.addLayer(group));
        setArrowNameCounter(backupArrowNameCounter);
        clearBackupState();
        return true;
    }, [savedArrowsBackup, buildSavedArrow, backupArrowNameCounter, clearBackupState]);
    const handleConfirm = useCallback((incrementCounterAndUpdateBackup = true) => {
        const finalizedGroup = finalizeCurrentArrow();
        if (!finalizedGroup) return null;
        if (finalizedGroup && editingState === EditingState.DrawingNew && incrementCounterAndUpdateBackup) {
            setArrowNameCounter(prev => prev + 1);
        }
        setEditingState(EditingState.Idle);
        setCurrentAnchors([]);
        setSelectedArrowGroup(null);
        resetCurrentPixelValues();
        resetPreviousStationFrames();
        if (incrementCounterAndUpdateBackup) {
            clearBackupState();
        }
        return finalizedGroup;
    }, [finalizeCurrentArrow, editingState, resetCurrentPixelValues, clearBackupState, resetPreviousStationFrames]);
    const handleCancel = useCallback(() => {
        if (!restoreStateFromCancel()) return;
        setEditorError('');
        setEditingState(EditingState.Idle);
        setCurrentAnchors([]);
        setSelectedArrowGroup(null);
        resetCurrentPixelValues();
        resetPreviousStationFrames();
    }, [resetCurrentPixelValues, restoreStateFromCancel, resetPreviousStationFrames]);
    const endEditingSession = useCallback(() => {
        if (editingState === EditingState.Idle) {
            return;
        }
        if (currentAnchors.length >= 2) {
            handleConfirm(true);
            return;
        }
        setEditorError('Setze mindestens zwei unterschiedliche Stützpunkte, bevor du den Pfeil speicherst.');
    }, [editingState, currentAnchors.length, handleConfirm]);
    const handleDrawArrow = useCallback(() => {
        if (editingState !== EditingState.Idle) {
            handleCancel();
        }
        saveStateForCancel();
        setEditingState(EditingState.DrawingNew);
        setCurrentAnchors([]);
        setSelectedArrowGroup(null);
        resetCurrentPixelValues();
        resetPreviousStationFrames();
        setCurrentArrowName(`Unbenannter Pfeil ${arrowNameCounter}`);
        setCurrentShaftThicknessPx(DEFAULT_NECK_WIDTH_PX);
        setCurrentRearTaper(defaultRearTaper);
        setCurrentFrontTaper(defaultFrontTaper);
        setCurrentHeadLengthPx(DEFAULT_HEAD_LENGTH_PX);
        setCurrentHeadWidthPx(DEFAULT_HEAD_WIDTH_PX);
        setCurrentParamsBaseZoom(mapRef.current?.getZoom() ?? null);
        setEditorError('');
    }, [editingState, arrowNameCounter, resetCurrentPixelValues, handleCancel, saveStateForCancel, resetPreviousStationFrames]);
    const handleCopyArrow = useCallback(() => {
        const map = mapRef.current;
        if (!map || editingState === EditingState.Idle || currentAnchors.length < 2)
            return;
        const currentAnchorsDataToCopy = getAnchorsData();
        const currentPixelParams = createArrowParameters({
            shaftThicknessPx, rearTaper, frontTaper,
            rearWidthPx: rearWidthPx,
            neckWidthPx: neckWidthPx,
            headLengthPx: currentHeadLengthPx,
            headWidthPx: currentHeadWidthPx,
            baseZoom: currentParamsBaseZoom,
        });
        const currentNameVal = currentArrowName;
        if (!handleConfirm(false)) return;
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
        applyArrowParameters(currentPixelParams);
        setCurrentArrowName(`${currentNameVal} (Kopie)`);
    }, [editingState, currentAnchors.length, rearWidthPx, neckWidthPx, currentHeadLengthPx, currentHeadWidthPx, currentArrowName, currentParamsBaseZoom, getAnchorsData, handleConfirm, shaftThicknessPx, rearTaper, frontTaper, applyArrowParameters]);
    const handleDeleteSelectedArrow = useCallback(() => {
        if (editingState === EditingState.EditingSelected && selectedArrowGroup) {
            const updatedBackup = savedArrowsBackup.filter(arrow => arrow.id !== selectedArrowGroup.arrowId);
            setSavedArrowsBackup(updatedBackup);
            // Transition to idle state
            setEditingState(EditingState.Idle);
            setCurrentAnchors([]);
            setSelectedArrowGroup(null); // Crucial: this "deletes" the active editing arrow
            resetCurrentPixelValues();
            resetPreviousStationFrames();
            setCurrentArrowName('');
        }
    }, [editingState, selectedArrowGroup, resetCurrentPixelValues, savedArrowsBackup, resetPreviousStationFrames]);
    const handleShapeParamChange = useCallback((key, value) => {
        const numericValue = clampFormValue(key, value);
        if (numericValue === null) {
            return;
        }
        const clampedValue = Math.max(0, numericValue);
        if (key === 'shaftThickness') {
            setCurrentShaftThicknessPx(Math.max(2, clampedValue));
        }
        else if (key === 'headLength') {
            setCurrentHeadLengthPx(Math.max(2, clampedValue));
        }
        else if (key === 'headWidth') {
            setCurrentHeadWidthPx(Math.max(2, clampedValue));
        }
        else if (key === 'rearTaper') {
            setCurrentRearTaper(Math.max(0.2, Math.min(2.5, clampedValue)));
        }
        else if (key === 'frontTaper') {
            setCurrentFrontTaper(Math.max(0.2, Math.min(2.5, clampedValue)));
        }
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
        const rearWidthPx = Math.max(2, shaftThicknessPx * rearTaper);
        const neckWidthPx = Math.max(2, shaftThicknessPx * frontTaper);
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
    }, [editingState, currentAnchors.length, getAnchorsData, shaftThicknessPx, rearTaper, frontTaper, currentHeadLengthPx, currentHeadWidthPx, currentArrowName, currentParamsBaseZoom, generateGeoJsonForArrowForMap]);
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
    const handleLoadTemplate = useCallback(async files => {
        // Prepare the whole batch off the map; an invalid file changes nothing.
        const layers = await Promise.all(files.map(async file => {
            try {
                return createTemplateGeometryLayer(parseTemplateGeoJson(await file.text()));
            } catch (error) {
                throw new Error(`${file.name}: ${error.message}`);
            }
        }));
        const map = mapRef.current;
        const templateLayer = templateLayerRef.current;
        if (!map || !templateLayer) throw new Error('Die Karte ist noch nicht bereit.');
        layers.forEach(layer => templateLayer.addLayer(layer));
        map.addLayer(templateLayer);
        const bounds = templateLayer.getBounds();
        if (bounds.isValid() && editingStateRef.current === EditingState.Idle) {
            map.fitBounds(bounds, {
                paddingTopLeft: [24, 24],
                paddingBottomRight: [Math.min(360, map.getSize().x / 2), 24],
                maxZoom: 16,
            });
        }
    }, []);
    const handleClearTemplate = useCallback(() => {
        templateLayerRef.current?.clearLayers();
    }, []);
    // Effects
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current)
            return;
        const { map, drawingLayer, arrowLayer, editingArrowLayer, templateLayer } = setupLeafletMap(mapContainerRef.current);
        mapRef.current = map;
        setMapZoom(map.getZoom());
        map.on('zoomend', () => setMapZoom(map.getZoom()));
        templateLayerRef.current = templateLayer;
        drawingLayerRef.current = drawingLayer;
        arrowLayerRef.current = arrowLayer;
        editingArrowLayerRef.current = editingArrowLayer;
        return () => {
            teardownLeafletMap(map);
            mapRef.current = null;
            templateLayerRef.current = null;
        };
    }, []);
    useEffect(() => {
        const map = mapRef.current;
        if (!map)
            return;
        const onMapClickHandler = (e) => {
            if (shapePickerRef.current || ignoreDragClickRef.current) return;
            if ((editingState === EditingState.DrawingNew || editingState === EditingState.EditingSelected) && !isArrowDraggingRef.current) {
                if (editingState === EditingState.DrawingNew) {
                    addAnchor(e.latlng, currentAnchors.length);
                    return;
                }
                history.run(endEditingSession);
            }
        };
        if (editingState === EditingState.DrawingNew || editingState === EditingState.EditingSelected) {
            map.on('click', onMapClickHandler);
            map.getContainer().style.cursor = (isPickingShape || editingState === EditingState.DrawingNew) ? 'crosshair' : 'default';
        }
        else {
            map.off('click', onMapClickHandler);
            map.getContainer().style.cursor = (editingState === EditingState.EditingSelected) ? 'default' : '';
        }
        return () => { map.off('click', onMapClickHandler); };
    }, [editingState, currentAnchors.length, addAnchor, endEditingSession, isPickingShape, history.run]);
    useEffect(() => {
        const onWindowKeyDown = (event) => {
            const editingField = event.target.closest?.('input:not([type=range]):not([type=checkbox]):not([type=file]), textarea, [contenteditable="true"]');
            if ((event.ctrlKey || event.metaKey) && !event.altKey && !editingField) {
                const key = event.key.toLowerCase();
                if (key === 'z' || key === 'y') {
                    event.preventDefault();
                    if (!isSceneDraggingRef.current) {
                        if (key === 'y' || event.shiftKey) history.redo();
                        else history.undo();
                    }
                    return;
                }
            }
            if (isPickingShape) {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    setIsPickingShape(false);
                }
                return;
            }
            if (editingState === EditingState.Idle)
                return;
            if (event.key === 'Escape') {
                event.preventDefault();
                history.run(handleCancel);
            }
            else if (event.key === 'Enter' && !event.target.closest?.('input, textarea, select, button, [contenteditable="true"]')) {
                event.preventDefault();
                history.run(endEditingSession);
            }
        };
        window.addEventListener('keydown', onWindowKeyDown);
        return () => {
            window.removeEventListener('keydown', onWindowKeyDown);
        };
    }, [editingState, endEditingSession, handleCancel, isPickingShape, history.run, history.undo, history.redo]);
   useEffect(() => {
       if (editingState === EditingState.DrawingNew || editingState === EditingState.EditingSelected) {
           updateCurveAndArrowPreview();
       }
       else {
           currentGeometryRef.current = null;
           resetPreviousStationFrames();
           drawingLayerRef.current?.eachLayer(layer => {
               if (layer.options?.isPreviewLine)
                   drawingLayerRef.current?.removeLayer(layer);
           });
           editingArrowLayerRef.current?.clearLayers();
       }
    }, [currentAnchors, DEFAULT_HEAD_LENGTH_PX, DEFAULT_HEAD_WIDTH_PX, currentHeadLengthPx, currentHeadWidthPx, editingState, updateCurveAndArrowPreview, resetPreviousStationFrames]);

    useEffect(() => {
        if (currentAnchors.length < 2) {
            resetPreviousStationFrames();
        }
    }, [currentAnchors.length, resetPreviousStationFrames]);


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
        // Sampling a source must not drag a target anchor or Bezier handle.
        [anchorMarkersRef, handle1MarkersRef, handle2MarkersRef].forEach(ref => {
            ref.current.forEach(marker => {
                if (isPickingShape) marker.dragging.disable();
                else marker.dragging.enable();
                const element = marker.getElement();
                if (element) element.style.pointerEvents = isPickingShape ? 'none' : '';
            });
        });
    }, [isPickingShape, currentAnchors]);
    history.captureRef.current = () => ({
        arrows: arrowLayerRef.current?.getLayers().map(getSavedArrowData) ?? [],
        selectedArrow: selectedArrowGroup ? getSavedArrowData(selectedArrowGroup) : null,
        editingState,
        anchors: currentAnchors.map(anchor => ({ id: anchor.id, ...createArrowAnchorData(anchor) })),
        parameters: { shaftThicknessPx: currentShaftThicknessPx, rearTaper: currentRearTaper,
            frontTaper: currentFrontTaper, headLengthPx: currentHeadLengthPx,
            headWidthPx: currentHeadWidthPx, baseZoom: currentParamsBaseZoom },
        name: currentArrowName,
        counter: arrowNameCounter,
        backup: savedArrowsBackup.map(createPersistedArrow),
        backupCounter: backupArrowNameCounter,
    });
    history.restoreRef.current = snapshot => {
        const groups = snapshot.arrows.map(buildSavedArrow);
        const selected = snapshot.selectedArrow ? buildSavedArrow(snapshot.selectedArrow) : null;
        if (groups.some(group => !group) || (snapshot.selectedArrow && !selected)) {
            setEditorError('Der Verlauf konnte nicht wiederhergestellt werden. Der aktuelle Stand bleibt erhalten.');
            return false;
        }
        arrowLayerRef.current?.clearLayers();
        groups.forEach(group => arrowLayerRef.current?.addLayer(group));
        setEditingState(snapshot.editingState);
        setCurrentAnchors(snapshot.anchors.map(createArrowAnchorEntity));
        setSelectedArrowGroup(selected);
        const params = snapshot.parameters;
        setCurrentShaftThicknessPx(params.shaftThicknessPx);
        setCurrentRearTaper(params.rearTaper);
        setCurrentFrontTaper(params.frontTaper);
        setCurrentHeadLengthPx(params.headLengthPx);
        setCurrentHeadWidthPx(params.headWidthPx);
        setCurrentParamsBaseZoom(params.baseZoom);
        setCurrentArrowName(snapshot.name);
        setArrowNameCounter(snapshot.counter);
        setSavedArrowsBackup(snapshot.backup);
        setBackupArrowNameCounter(snapshot.backupCounter);
        setIsPickingShape(false);
        setEditorError('');
        resetPreviousStationFrames();
        return true;
    };
    useEffect(() => {
        setEditorError('');
    }, [currentAnchors, currentShaftThicknessPx, currentRearTaper, currentFrontTaper, currentHeadLengthPx, currentHeadWidthPx]);
    // Control panel contract
    const canEditParameters = getCanEditParameters(editingState) && currentAnchors.length >= 2;
    const canCopyCurrentArrow = isEditing(editingState) && currentAnchors.length >= 2;
    const canDeleteArrow = getCanDeleteArrow(editingState, selectedArrowGroup !== null);
    const canCopyGeoJsonCurrent = canEditParameters;
    const canSaveAllGeoJsonExport = getCanSaveAllGeoJson(editingState, arrowLayerRef.current?.getLayers().length ?? 0);
    const controlPanelUiState = {
        editingState,
        editorError,
        canUndo: history.canUndo,
        canRedo: history.canRedo,
        parameterBaseZoom: currentParamsBaseZoom,
        mapZoom,
        anchorCount: currentAnchors.length,
        canFinishArrow: isEditing(editingState) && currentAnchors.length >= 2,
        canCopyArrow: canCopyCurrentArrow,
        canDeleteArrow,
        arrowName: currentArrowName,
        canEditName: editingState !== EditingState.Idle,
        canCopyGeoJson: canCopyGeoJsonCurrent,
        canSaveAllGeoJson: canSaveAllGeoJsonExport,
        canEditParameters,
        isPickingShape,
        canPickShape: canEditParameters && (arrowLayerRef.current?.getLayers().length ?? 0) > 0,
        shaftThickness: shaftThicknessPx,
        headLength: currentHeadLengthPx ?? DEFAULT_HEAD_LENGTH_PX,
        headWidth: currentHeadWidthPx ?? DEFAULT_HEAD_WIDTH_PX,
        rearTaper,
        frontTaper,
    };
    const controlPanelActions = {
        onToggleShapePicker: () => setIsPickingShape(previous => !previous),
        onLoadTemplate: handleLoadTemplate,
        onClearTemplate: handleClearTemplate,
        onUndo: history.undo,
        onRedo: history.redo,
        onBeginChange: history.begin,
        onEndChange: history.end,
        onDrawArrow: () => history.run(handleDrawArrow),
        onFinishArrow: () => history.run(endEditingSession),
        onCancelArrow: () => history.run(handleCancel),
        onCopyArrow: () => history.run(handleCopyArrow),
        onDeleteArrow: () => history.run(handleDeleteSelectedArrow),
        onArrowNameChange: value => history.run(() => setCurrentArrowName(value)),
        onCopyGeoJson: handleCopyGeoJson,
        onSaveAllGeoJson: handleSaveAllGeoJson,
        onShapeParamChange: (key, value) => history.run(() => handleShapeParamChange(key, value)),
    };
    return (_jsxs("div", { className: "relative h-full w-full flex", children: [_jsx("div", { ref: mapContainerRef, id: "map", className: "h-full w-full grow" }), _jsx(ControlPanel, { uiState: controlPanelUiState, actions: controlPanelActions })] }));
};
export default App;
