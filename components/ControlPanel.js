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
 * @property {() => void} onConfirm
 * @property {() => void} onCancel
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
    const { onDrawArrow, onCopyArrow, onDeleteArrow, onArrowNameChange, onCopyGeoJson, onSaveAllGeoJson, onConfirm, onCancel, onShapeParamChange } = actions;
    const isEditingOrDrawing = editingState === EditingState.DrawingNew || editingState === EditingState.EditingSelected;
    const commonButtonClass = "px-3 py-2 border-2 border-gray-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors";
    const renderSlider = (id, label, min, max, step, value, paramKey) => (_jsxs("div", { className: "flex flex-col gap-1", children: [_jsxs("div", { className: "flex items-center justify-between text-sm", children: [_jsx("label", { htmlFor: id, className: "font-medium text-gray-700", children: label }), _jsx("span", { className: "text-gray-600", children: value.toFixed(step < 1 ? 2 : 0) })] }), _jsx("input", { id: id, type: "range", min: min, max: max, step: step, value: value, disabled: !canEditParameters, onChange: (e) => onShapeParamChange(paramKey, Number(e.target.value)), className: "w-full accent-blue-600 disabled:opacity-50 disabled:cursor-not-allowed" })] }));
    return (_jsxs("div", { id: "controlPanel", className: "absolute top-4 right-4 z-[10000] bg-white p-4 border border-gray-300 rounded-lg shadow-lg w-72 flex flex-col gap-3", children: [_jsx("button", { id: "drawArrowBtn", title: "Neuen Pfeil zeichnen", onClick: onDrawArrow, disabled: isEditingOrDrawing, className: `${commonButtonClass} w-full
                    bg-blue-500 text-white hover:bg-blue-600
                    disabled:bg-blue-200 disabled:text-blue-500 disabled:cursor-not-allowed`, children: "Neuen Pfeil zeichnen" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { id: "copyArrowBtn", title: "Aktuell bearbeiteten Pfeil kopieren", onClick: onCopyArrow, disabled: !canCopyArrow, className: `${commonButtonClass} flex-1 text-slate-700
                      disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed`, children: "Kopieren" }), _jsx("button", { id: "deleteArrowBtn", title: "Ausgewählten Pfeil löschen", onClick: onDeleteArrow, disabled: !canDeleteArrow, className: `${commonButtonClass} flex-1 bg-red-500 text-white hover:bg-red-600
                    disabled:bg-red-200 disabled:text-red-500 disabled:cursor-not-allowed`, children: "Pfeil Löschen" })] }), _jsxs("div", { className: "mt-1 border-t border-gray-200 pt-3 flex flex-col gap-2", children: [renderSlider('shaftThicknessSlider', 'Schaftdicke', 2, 120, 1, shaftThickness, 'shaftThickness'), renderSlider('headLengthSlider', 'Pfeilspitzen-Länge', 2, 240, 1, headLength, 'headLength'), renderSlider('headWidthSlider', 'Pfeilspitzen-Breite', 2, 240, 1, headWidth, 'headWidth'), renderSlider('rearTaperSlider', 'Rear taper', 0.2, 2.5, 0.01, rearTaper, 'rearTaper'), renderSlider('frontTaperSlider', 'Front taper', 0.2, 2.5, 0.01, frontTaper, 'frontTaper')] }), _jsxs("div", { className: "mt-2 border-t border-gray-200 pt-3 flex flex-col gap-2", children: [_jsx("label", { htmlFor: "arrowNameInput", className: "block text-sm font-medium text-gray-700", children: "Pfeil Name (aktuell):" }), _jsx("input", { type: "text", id: "arrowNameInput", placeholder: "Name für GeoJSON", value: arrowName, onChange: (e) => onArrowNameChange(e.target.value), disabled: !canEditName, className: "w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-50" }), _jsx("button", { id: "copyGeoJsonBtn", title: "Aktuellen Pfeil-Umriss als GeoJSON kopieren", onClick: onCopyGeoJson, disabled: !canCopyGeoJson, className: `${commonButtonClass} w-full mt-1 text-slate-700
                      disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed`, children: "GeoJSON kopieren" }), _jsx("button", { id: "saveAllGeoJsonBtn", title: "Alle finalisierten Pfeile als GeoJSON-Datei speichern", onClick: onSaveAllGeoJson, disabled: !canSaveAllGeoJson, className: `${commonButtonClass} w-full mt-1
                      bg-green-500 text-white hover:bg-green-600
                      disabled:bg-green-200 disabled:text-green-500 disabled:cursor-not-allowed`, children: "Alle Pfeile speichern" })] }), isEditingOrDrawing && (_jsxs("div", { id: "confirmButtons", className: "mt-2 flex gap-2", children: [_jsx("button", { id: "okBtn", title: "Bearbeitung abschließen", onClick: onConfirm, className: `${commonButtonClass} flex-1 bg-green-500 text-white hover:bg-green-600`, children: "Ok" }), _jsx("button", { id: "cancelBtn", title: "Bearbeitung abbrechen", onClick: onCancel, className: `${commonButtonClass} flex-1 bg-red-500 text-white hover:bg-red-600`, children: "Abbrechen" })] }))] }));
};

export default ControlPanel;
