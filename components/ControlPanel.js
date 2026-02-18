import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { EditingState } from '../types.js';

/**
 * @typedef {Object} ControlPanelUiState
 * @property {import('../types.js').EditingState} editingState
 * @property {boolean} canCopyArrow
 * @property {boolean} canDeleteArrow
 * @property {string} arrowName
 * @property {boolean} canEditName
 * @property {boolean} canCopyGeoJson
 * @property {boolean} canSaveAllGeoJson
 * @property {boolean} canEditParameters
 * @property {number} shaftThickness
 * @property {number} headLength
 * @property {number} headWidth
 * @property {number} rearTaper
 * @property {number} frontTaper
 */

/**
 * @typedef {Object} ControlPanelActions
 * @property {() => void} onDrawArrow
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
    const { editingState, canCopyArrow, canDeleteArrow, arrowName, canEditName, canCopyGeoJson, canSaveAllGeoJson, canEditParameters, shaftThickness, headLength, headWidth, rearTaper, frontTaper } = uiState;
    const { onDrawArrow, onCopyArrow, onDeleteArrow, onArrowNameChange, onCopyGeoJson, onSaveAllGeoJson, onShapeParamChange } = actions;
    const isEditingOrDrawing = editingState === EditingState.DrawingNew || editingState === EditingState.EditingSelected;
    const [showShapeControls, setShowShapeControls] = React.useState(true);

    const baseButtonClass = "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
    const neutralButtonClass = `${baseButtonClass} border-slate-300 bg-white text-slate-700 hover:bg-slate-100 focus:ring-slate-400`;

    const renderSlider = (id, label, min, max, step, value, paramKey) => (_jsxs("div", { className: "flex flex-col gap-1", children: [_jsxs("div", { className: "flex items-center justify-between text-xs", children: [_jsx("label", { htmlFor: id, className: "font-medium text-slate-700", children: label }), _jsx("span", { className: "font-semibold text-slate-500 tabular-nums", children: value.toFixed(step < 1 ? 2 : 0) })] }), _jsx("input", { id: id, type: "range", min: min, max: max, step: step, value: value, disabled: !canEditParameters, onChange: (e) => onShapeParamChange(paramKey, Number(e.target.value)), className: "w-full accent-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed" })] }));

    return (_jsxs("div", { id: "controlPanel", className: "absolute top-4 right-4 z-[10000] w-80 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-3 shadow-2xl backdrop-blur-sm", children: [_jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsx("button", { id: "drawArrowBtn", title: "Neuen Pfeil zeichnen", onClick: onDrawArrow, disabled: isEditingOrDrawing, className: `${baseButtonClass} col-span-2 border-cyan-600 bg-cyan-600 text-white hover:bg-cyan-700 focus:ring-cyan-500`, children: _jsxs(React.Fragment, { children: [_jsx("svg", { viewBox: "0 0 24 24", className: "h-4 w-4", fill: "none", stroke: "currentColor", strokeWidth: "2", "aria-hidden": "true", children: _jsx("path", { d: "M5 12h14M13 6l6 6-6 6" }) }), "Neuen Pfeil zeichnen"] }) }), _jsx("button", { id: "copyArrowBtn", title: "Aktuell bearbeiteten Pfeil kopieren", onClick: onCopyArrow, disabled: !canCopyArrow, className: neutralButtonClass, children: _jsxs(React.Fragment, { children: [_jsx("svg", { viewBox: "0 0 24 24", className: "h-4 w-4", fill: "none", stroke: "currentColor", strokeWidth: "2", "aria-hidden": "true", children: _jsx("path", { d: "M9 9h11v11H9zM4 4h11v11" }) }), "Kopieren"] }) }), _jsx("button", { id: "deleteArrowBtn", title: "Ausgewählten Pfeil löschen", onClick: onDeleteArrow, disabled: !canDeleteArrow, className: `${baseButtonClass} border-rose-600 bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500`, children: _jsxs(React.Fragment, { children: [_jsx("svg", { viewBox: "0 0 24 24", className: "h-4 w-4", fill: "none", stroke: "currentColor", strokeWidth: "2", "aria-hidden": "true", children: _jsx("path", { d: "M3 6h18M8 6V4h8v2m-7 4v8m4-8v8M6 6l1 14h10l1-14" }) }), "Löschen"] }) })] }), _jsxs("div", { className: "mt-3 rounded-xl border border-slate-200 bg-white p-2", children: [_jsxs("button", { type: "button", className: "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm font-semibold text-slate-800 hover:bg-slate-100", onClick: () => setShowShapeControls(!showShapeControls), children: [_jsx("span", { children: "Formparameter" }), _jsx("span", { className: "text-slate-500", children: showShapeControls ? "-" : "+" })] }), showShapeControls && (_jsxs("div", { className: "mt-2 space-y-2 px-1 pb-1", children: [renderSlider('shaftThicknessSlider', 'Schaftdicke', 2, 120, 1, shaftThickness, 'shaftThickness'), renderSlider('headLengthSlider', 'Pfeilspitzen-Länge', 2, 240, 1, headLength, 'headLength'), renderSlider('headWidthSlider', 'Pfeilspitzen-Breite', 2, 240, 1, headWidth, 'headWidth'), renderSlider('rearTaperSlider', 'Schaft hinten', 0.2, 2.5, 0.01, rearTaper, 'rearTaper'), renderSlider('frontTaperSlider', 'Schaft vorne', 0.2, 2.5, 0.01, frontTaper, 'frontTaper')] }))] }), _jsxs("div", { className: "mt-3 rounded-xl border border-slate-200 bg-white p-3", children: [_jsx("label", { htmlFor: "arrowNameInput", className: "block text-xs font-semibold uppercase tracking-wide text-slate-500", children: "Pfeilname (optional)" }), _jsx("input", { type: "text", id: "arrowNameInput", placeholder: "erscheint dann in GeoJSON", value: arrowName, onChange: (e) => onArrowNameChange(e.target.value), disabled: !canEditName, className: "mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm shadow-sm focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 disabled:bg-slate-100 disabled:text-slate-400" }), _jsxs("div", { className: "mt-2 grid grid-cols-2 gap-2", children: [_jsx("button", { id: "copyGeoJsonBtn", title: "Aktuellen Pfeil-Umriss als GeoJSON kopieren", onClick: onCopyGeoJson, disabled: !canCopyGeoJson, className: `${neutralButtonClass} col-span-2`, children: _jsxs(React.Fragment, { children: [_jsx("svg", { viewBox: "0 0 24 24", className: "h-4 w-4", fill: "none", stroke: "currentColor", strokeWidth: "2", "aria-hidden": "true", children: _jsx("path", { d: "M8 4h10v16H6V6l2-2zM8 4v2h2" }) }), "GeoJSON kopieren"] }) }), _jsx("button", { id: "saveAllGeoJsonBtn", title: "Alle finalisierten Pfeile als GeoJSON-Datei speichern", onClick: onSaveAllGeoJson, disabled: !canSaveAllGeoJson, className: `${baseButtonClass} col-span-2 border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500`, children: _jsxs(React.Fragment, { children: [_jsx("svg", { viewBox: "0 0 24 24", className: "h-4 w-4", fill: "none", stroke: "currentColor", strokeWidth: "2", "aria-hidden": "true", children: _jsx("path", { d: "M12 3v12m0 0l4-4m-4 4-4-4M4 19h16" }) }), "Alle speichern"] }) })] })] })] }));
};

export default ControlPanel;

