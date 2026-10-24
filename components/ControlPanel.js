import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import ShapeParameterControl from './ShapeParameterControl.js';
import TemplateControls from './TemplateControls.js';
import ProjectControls from './ProjectControls.js';
import { EditingState } from '../types.js';

/**
 * @typedef {Object} ControlPanelUiState
 * @property {import('../types.js').EditingState} editingState
 * @property {string[]} templateFileNames
 * @property {number} anchorCount
 * @property {boolean} canFinishArrow
 * @property {boolean} canCopyArrow
 * @property {boolean} canDeleteArrow
 * @property {string} arrowName
 * @property {boolean} canEditName
 * @property {boolean} canCopyGeoJson
 * @property {boolean} canSaveAllGeoJson
 * @property {boolean} isPickingShape
 * @property {boolean} canPickShape
 * @property {boolean} canUndo
 * @property {boolean} canRedo
 * @property {string} editorError
 * @property {number|null} parameterBaseZoom
 * @property {number|null} mapZoom
 * @property {boolean} canEditParameters
 * @property {number} shaftThickness
 * @property {number} headLength
 * @property {number} headWidth
 * @property {number} rearTaper
 * @property {number} frontTaper
 */

/**
 * @typedef {Object} ControlPanelActions
 * @property {() => void} onSaveProject
 * @property {(file: File) => Promise<void>} onLoadProject
 * @property {(files: File[]) => Promise<void>} onLoadTemplate
 * @property {() => void} onClearTemplate
 * @property {() => void} onToggleShapePicker
 * @property {() => void} onUndo
 * @property {() => void} onRedo
 * @property {() => void} onBeginChange
 * @property {() => void} onEndChange
 * @property {() => void} onDrawArrow
 * @property {() => void} onFinishArrow
 * @property {() => void} onCancelArrow
 * @property {() => void} onCopyArrow
 * @property {() => void} onDeleteArrow
 * @property {(value: string) => void} onArrowNameChange
 * @property {() => void} onCopyGeoJson
 * @property {() => void} onSaveAllGeoJson
 * @property {(key: 'shaftThickness'|'headLength'|'headWidth'|'rearTaper'|'frontTaper', value: number) => void} onShapeParamChange
 */

/**
 * @typedef {Object} ControlPanelProps
 * @property {ControlPanelUiState} uiState
 * @property {ControlPanelActions} actions
 */

/**
 * @param {ControlPanelProps} props
 */
const ControlPanel = ({ uiState, actions }) => {
    const { templateFileNames, editorError, canUndo, canRedo, parameterBaseZoom, mapZoom, isPickingShape, canPickShape, editingState, anchorCount, canFinishArrow, canCopyArrow, canDeleteArrow, arrowName, canEditName, canCopyGeoJson, canSaveAllGeoJson, canEditParameters, shaftThickness, headLength, headWidth, rearTaper, frontTaper } = uiState;
    const { onSaveProject, onLoadProject, onUndo, onRedo, onBeginChange, onEndChange, onToggleShapePicker, onLoadTemplate, onClearTemplate, onDrawArrow, onFinishArrow, onCancelArrow, onCopyArrow, onDeleteArrow, onArrowNameChange, onCopyGeoJson, onSaveAllGeoJson, onShapeParamChange } = actions;
    const isEditingOrDrawing = editingState === EditingState.DrawingNew || editingState === EditingState.EditingSelected;
    const [showShapeControls, setShowShapeControls] = React.useState(true);

    const baseButtonClass = "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
    const neutralButtonClass = `${baseButtonClass} border-slate-300 bg-white text-slate-700 hover:bg-slate-100 focus:ring-slate-400`;

    const renderSlider = (id, label, min, max, step, value, paramKey) => _jsx(ShapeParameterControl, {
        id, label, min, max, step, value, paramKey, disabled: !canEditParameters,
        onChange: onShapeParamChange, onBegin: onBeginChange, onEnd: onEndChange,
    });

    return (_jsxs("div", { id: "controlPanel", className: "absolute top-4 right-4 z-[10000] w-80 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-3 shadow-2xl backdrop-blur-sm", children: [_jsxs("div", { className: "mb-3 grid grid-cols-2 gap-2", children: [_jsx("button", { id: "undoBtn", type: "button", title: "Rückgängig (Strg/Cmd+Z)", onClick: onUndo, disabled: !canUndo, className: neutralButtonClass, children: "↶ Rückgängig" }), _jsx("button", { id: "redoBtn", type: "button", title: "Wiederholen (Strg+Y / Strg/Cmd+Umschalt+Z)", onClick: onRedo, disabled: !canRedo, className: neutralButtonClass, children: "↷ Wiederholen" })] }), editorError && _jsx("p", { id: "editorError", role: "alert", className: "mb-3 rounded-lg border border-rose-300 bg-rose-50 p-2 text-sm text-rose-800", children: editorError }), isEditingOrDrawing && _jsxs("div", { className: "mb-3 rounded-xl border border-cyan-200 bg-cyan-50 p-3", children: [_jsx("p", { role: "status", className: "text-sm font-semibold text-slate-800", children: `${anchorCount} Stützpunkte` }), _jsx("p", { className: "mt-1 text-xs text-slate-600", children: editingState === EditingState.DrawingNew ? "Jeder Kartenklick setzt einen weiteren Stützpunkt. Fertig oder Enter speichert, Esc verwirft." : "Stützpunkte und blaue Griffe ziehen. Umschalt + Klick auf den Pfeil fügt einen Stützpunkt ein. Fertig oder Enter speichert, Esc verwirft." }), _jsxs("div", { className: "mt-2 grid grid-cols-2 gap-2", children: [_jsx("button", { id: "finishArrowBtn", onClick: onFinishArrow, disabled: !canFinishArrow, className: `${baseButtonClass} border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500`, children: "Fertig" }), _jsx("button", { id: "cancelArrowBtn", onClick: onCancelArrow, className: neutralButtonClass, children: "Abbrechen" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsx("button", { id: "drawArrowBtn", title: "Neuen Pfeil zeichnen", onClick: onDrawArrow, disabled: isEditingOrDrawing, className: `${baseButtonClass} col-span-2 border-cyan-600 bg-cyan-600 text-white hover:bg-cyan-700 focus:ring-cyan-500`, children: _jsxs(React.Fragment, { children: [_jsx("svg", { viewBox: "0 0 24 24", className: "h-4 w-4", fill: "none", stroke: "currentColor", strokeWidth: "2", "aria-hidden": "true", children: _jsx("path", { d: "M5 12h14M13 6l6 6-6 6" }) }), "Neuen Pfeil zeichnen"] }) }), _jsx("button", { id: "copyArrowBtn", title: "Aktuell bearbeiteten Pfeil kopieren", onClick: onCopyArrow, disabled: !canCopyArrow, className: neutralButtonClass, children: _jsxs(React.Fragment, { children: [_jsx("svg", { viewBox: "0 0 24 24", className: "h-4 w-4", fill: "none", stroke: "currentColor", strokeWidth: "2", "aria-hidden": "true", children: _jsx("path", { d: "M9 9h11v11H9zM4 4h11v11" }) }), "Kopieren"] }) }), _jsx("button", { id: "deleteArrowBtn", title: "Ausgewählten Pfeil löschen", onClick: onDeleteArrow, disabled: !canDeleteArrow, className: `${baseButtonClass} border-rose-600 bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500`, children: _jsxs(React.Fragment, { children: [_jsx("svg", { viewBox: "0 0 24 24", className: "h-4 w-4", fill: "none", stroke: "currentColor", strokeWidth: "2", "aria-hidden": "true", children: _jsx("path", { d: "M3 6h18M8 6V4h8v2m-7 4v8m4-8v8M6 6l1 14h10l1-14" }) }), "Löschen"] }) })] }), _jsxs("div", { className: "mt-3 rounded-xl border border-slate-200 bg-white p-2", children: [_jsxs("button", { type: "button", className: "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm font-semibold text-slate-800 hover:bg-slate-100", onClick: () => setShowShapeControls(!showShapeControls), children: [_jsx("span", { children: "Formparameter" }), _jsx("span", { className: "text-slate-500", children: showShapeControls ? "-" : "+" })] }), _jsx("button", { id: "pickShapeBtn", type: "button", title: "Formparameter von einem anderen Pfeil übernehmen", "aria-pressed": isPickingShape, disabled: !canPickShape, onClick: onToggleShapePicker, className: `${neutralButtonClass} mt-2 w-full ${isPickingShape ? 'border-violet-500 bg-violet-100 text-violet-800' : ''}`, children: _jsxs(React.Fragment, { children: [_jsx("svg", { viewBox: "0 0 24 24", className: "h-4 w-4", fill: "none", stroke: "currentColor", strokeWidth: "2", "aria-hidden": "true", children: _jsx("path", { d: "m16 3 5 5-3 3-2-2-8 8-4 1 1-4 8-8-2-2 3-3z" }) }), isPickingShape ? "Pipette abbrechen" : "Form übernehmen"] }) }), isPickingShape && _jsx("p", { id: "shapePickerHint", role: "status", className: "mt-2 px-1 text-xs text-violet-800", children: "Den Pfeil anklicken, dessen Form übernommen werden soll. Esc beendet die Pipette." }), showShapeControls && (_jsxs("div", { className: "mt-2 space-y-2 px-1 pb-1", children: [_jsx("p", { id: "parameterUnits", className: "text-xs text-slate-500", children: parameterBaseZoom !== null ? `Pixelwerte bei Referenzzoom ${parameterBaseZoom}. Aktuell Zoom ${mapZoom ?? parameterBaseZoom} (×${Math.pow(2, (mapZoom ?? parameterBaseZoom) - parameterBaseZoom).toFixed(2)}). Schaft hinten/vorne sind Faktoren.` : "Pixelwerte gelten beim Anlegen des Pfeils. Schaft hinten/vorne sind Faktoren." }), renderSlider('shaftThicknessSlider', 'Schaftdicke', 2, 120, 1, shaftThickness, 'shaftThickness'), renderSlider('headLengthSlider', 'Pfeilspitzen-Länge', 2, 240, 1, headLength, 'headLength'), renderSlider('headWidthSlider', 'Pfeilspitzen-Breite', 2, 240, 1, headWidth, 'headWidth'), renderSlider('rearTaperSlider', 'Schaft hinten', 0.2, 2.5, 0.01, rearTaper, 'rearTaper'), renderSlider('frontTaperSlider', 'Schaft vorne', 0.2, 2.5, 0.01, frontTaper, 'frontTaper')] }))] }), _jsxs("div", { className: "mt-3 rounded-xl border border-slate-200 bg-white p-3", children: [_jsx("label", { htmlFor: "arrowNameInput", className: "block text-xs font-semibold uppercase tracking-wide text-slate-500", children: "Pfeilname (optional)" }), _jsx("input", { type: "text", id: "arrowNameInput", placeholder: "erscheint dann in GeoJSON", value: arrowName, onFocus: onBeginChange, onBlur: onEndChange, onChange: (e) => onArrowNameChange(e.target.value), disabled: !canEditName, className: "mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm shadow-sm focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 disabled:bg-slate-100 disabled:text-slate-400" }), _jsxs("div", { className: "mt-2 grid grid-cols-2 gap-2", children: [_jsx("button", { id: "copyGeoJsonBtn", title: "Aktuellen Pfeil-Umriss als GeoJSON kopieren", onClick: onCopyGeoJson, disabled: !canCopyGeoJson, className: `${neutralButtonClass} col-span-2`, children: _jsxs(React.Fragment, { children: [_jsx("svg", { viewBox: "0 0 24 24", className: "h-4 w-4", fill: "none", stroke: "currentColor", strokeWidth: "2", "aria-hidden": "true", children: _jsx("path", { d: "M8 4h10v16H6V6l2-2zM8 4v2h2" }) }), "GeoJSON kopieren"] }) }), _jsx("button", { id: "saveAllGeoJsonBtn", title: "Alle finalisierten Pfeile als GeoJSON-Datei speichern", onClick: onSaveAllGeoJson, disabled: !canSaveAllGeoJson, className: `${baseButtonClass} col-span-2 border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500`, children: _jsxs(React.Fragment, { children: [_jsx("svg", { viewBox: "0 0 24 24", className: "h-4 w-4", fill: "none", stroke: "currentColor", strokeWidth: "2", "aria-hidden": "true", children: _jsx("path", { d: "M12 3v12m0 0l4-4m-4 4-4-4M4 19h16" }) }), "GeoJSON speichern"] }) })] })] }), _jsx(ProjectControls, { onSave: onSaveProject, onLoad: onLoadProject }), _jsx(TemplateControls, { fileNames: templateFileNames, onLoad: onLoadTemplate, onClear: onClearTemplate })] }));
};

export default ControlPanel;

