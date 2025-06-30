import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { EditingState } from '../types.js';
const ControlPanel = ({ editingState, onDrawArrow, onCopyArrow, canCopyArrow, onDeleteArrow, canDeleteArrow, arrowName, onArrowNameChange, canEditName, onCopyGeoJson, canCopyGeoJson, onSaveAllGeoJson, canSaveAllGeoJson, onConfirm, onCancel, }) => {
    const isEditingOrDrawing = editingState === EditingState.DrawingNew || editingState === EditingState.EditingSelected;
    const commonButtonClass = "px-3 py-2 border-2 border-gray-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors";
    return (_jsxs("div", { id: "controlPanel", className: "absolute top-4 right-4 z-[10000] bg-white p-4 border border-gray-300 rounded-lg shadow-lg w-64 flex flex-col gap-3", children: [_jsx("button", { id: "drawArrowBtn", title: "Neuen Pfeil zeichnen", onClick: onDrawArrow, disabled: isEditingOrDrawing, className: `${commonButtonClass} w-full
                    bg-blue-500 text-white hover:bg-blue-600
                    disabled:bg-blue-200 disabled:text-blue-500 disabled:cursor-not-allowed`, children: "Neuen Pfeil zeichnen" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { id: "copyArrowBtn", title: "Aktuell bearbeiteten Pfeil kopieren", onClick: onCopyArrow, disabled: !canCopyArrow, className: `${commonButtonClass} flex-1 text-slate-700
                      disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed`, children: "Kopieren" }), _jsx("button", { id: "deleteArrowBtn", title: "Ausgew\u00E4hlten Pfeil l\u00F6schen", onClick: onDeleteArrow, disabled: !canDeleteArrow, className: `${commonButtonClass} flex-1 bg-red-500 text-white hover:bg-red-600
                      disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed`, children: "GeoJSON kopieren" }), _jsx("button", { id: "saveAllGeoJsonBtn", title: "Alle finalisierten Pfeile als GeoJSON-Datei speichern", onClick: onSaveAllGeoJson, disabled: !canSaveAllGeoJson, className: `${commonButtonClass} w-full mt-1 
                      bg-green-500 text-white hover:bg-green-600
                      disabled:bg-green-200 disabled:text-green-500 disabled:cursor-not-allowed`, children: "Alle Pfeile speichern" })] }), isEditingOrDrawing && (_jsxs("div", { id: "confirmButtons", className: "mt-2 flex gap-2", children: [_jsx("button", { id: "okBtn", title: "Bearbeitung abschlie\u00DFen", onClick: onConfirm, className: `${commonButtonClass} flex-1 bg-green-500 text-white hover:bg-green-600`, children: "Ok" }), _jsx("button", { id: "cancelBtn", title: "Bearbeitung abbrechen", onClick: onCancel, className: `${commonButtonClass} flex-1 bg-red-500 text-white hover:bg-red-600`, children: "Abbrechen" })] }))] }));
};
export default ControlPanel;
