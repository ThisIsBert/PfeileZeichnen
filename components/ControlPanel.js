import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { EditingState } from '../types.js';

const ControlPanel = ({
  editingState,
  onDrawArrow,
  onCopyArrow,
  canCopyArrow,
  onDeleteArrow,
  canDeleteArrow,
  shaftThicknessFactor,
  onShaftThicknessChange,
  arrowHeadLengthFactor,
  onArrowHeadLengthChange,
  arrowHeadWidthFactor,
  onArrowHeadWidthChange,
  tailThicknessFactor,
  onTailThicknessChange,
  canEditParameters,
  arrowName,
  onArrowNameChange,
  canEditName,
  onCopyGeoJson,
  canCopyGeoJson,
  onSaveAllGeoJson,
  canSaveAllGeoJson,
  onConfirm,
  onCancel,
}) => {
  const isEditingOrDrawing =
    editingState === EditingState.DrawingNew ||
    editingState === EditingState.EditingSelected;

  const commonButtonClass =
    "px-3 py-2 border-2 border-gray-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors";

  return _jsxs("div", {
    id: "controlPanel",
    className:
      "absolute top-4 right-4 z-[10000] bg-white p-4 border border-gray-300 rounded-lg shadow-lg w-64 flex flex-col gap-3",
    children: [
      _jsx("button", {
        id: "drawArrowBtn",
        title: "Neuen Pfeil zeichnen",
        onClick: onDrawArrow,
        disabled: isEditingOrDrawing,
        className: `${commonButtonClass} w-full\n                    bg-blue-500 text-white hover:bg-blue-600\n                    disabled:bg-blue-200 disabled:text-blue-500 disabled:cursor-not-allowed`,
        children: "Neuen Pfeil zeichnen",
      }),
      _jsxs("div", {
        className: "flex gap-2",
        children: [
          _jsx("button", {
            id: "copyArrowBtn",
            title: "Aktuell bearbeiteten Pfeil kopieren",
            onClick: onCopyArrow,
            disabled: !canCopyArrow,
            className: `${commonButtonClass} flex-1 text-slate-700\n                      disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed`,
            children: "Kopieren",
          }),
          _jsx("button", {
            id: "deleteArrowBtn",
            title: "Ausgewählten Pfeil löschen",
            onClick: onDeleteArrow,
            disabled: !canDeleteArrow,
            className: `${commonButtonClass} flex-1 bg-red-500 text-white hover:bg-red-600\n                      disabled:bg-red-200 disabled:text-red-500 disabled:cursor-not-allowed`,
            children: "Pfeil Löschen",
          }),
        ],
      }),
      _jsxs("div", {
        children: [
          _jsxs("label", {
            htmlFor: "shaftThicknessSlider",
            className: "block text-sm font-medium text-gray-700 mb-1",
            children: ["Schaftdicke: ", shaftThicknessFactor.toFixed(3)],
          }),
          _jsx("input", {
            type: "range",
            id: "shaftThicknessSlider",
            min: "0.005",
            max: "0.1",
            step: "0.005",
            value: shaftThicknessFactor,
            onChange: (e) => onShaftThicknessChange(parseFloat(e.target.value)),
            disabled: !canEditParameters,
            className:
              "w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
          }),
        ],
      }),
      _jsxs("div", {
        children: [
          _jsxs("label", {
            htmlFor: "tailThicknessSlider",
            className: "block text-sm font-medium text-gray-700 mb-1",
            children: ["Hintere Breite: ", tailThicknessFactor.toFixed(3)],
          }),
          _jsx("input", {
            type: "range",
            id: "tailThicknessSlider",
            min: "0.005",
            max: "0.1",
            step: "0.005",
            value: tailThicknessFactor,
            onChange: (e) => onTailThicknessChange(parseFloat(e.target.value)),
            disabled: !canEditParameters,
            className:
              "w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
          }),
        ],
      }),
      _jsxs("div", {
        children: [
          _jsxs("label", {
            htmlFor: "arrowHeadLengthSlider",
            className: "block text-sm font-medium text-gray-700 mb-1",
            children: [
              "Pfeilspitzenl\u00e4nge: ",
              arrowHeadLengthFactor.toFixed(3),
            ],
          }),
          _jsx("input", {
            type: "range",
            id: "arrowHeadLengthSlider",
            min: "0.05",
            max: "0.2",
            step: "0.01",
            value: arrowHeadLengthFactor,
            onChange: (e) =>
              onArrowHeadLengthChange(parseFloat(e.target.value)),
            disabled: !canEditParameters,
            className:
              "w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
          }),
        ],
      }),
      _jsxs("div", {
        children: [
          _jsxs("label", {
            htmlFor: "arrowHeadWidthSlider",
            className: "block text-sm font-medium text-gray-700 mb-1",
            children: [
              "Pfeilspitzenbreite: ",
              arrowHeadWidthFactor.toFixed(3),
            ],
          }),
          _jsx("input", {
            type: "range",
            id: "arrowHeadWidthSlider",
            min: "0.05",
            max: "0.2",
            step: "0.01",
            value: arrowHeadWidthFactor,
            onChange: (e) =>
              onArrowHeadWidthChange(parseFloat(e.target.value)),
            disabled: !canEditParameters,
            className:
              "w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
          }),
        ],
      }),
      _jsxs("div", {
        className: "mt-2 border-t border-gray-200 pt-3 flex flex-col gap-2",
        children: [
          _jsx("label", {
            htmlFor: "arrowNameInput",
            className: "block text-sm font-medium text-gray-700",
            children: "Pfeil Name (aktuell):",
          }),
          _jsx("input", {
            type: "text",
            id: "arrowNameInput",
            placeholder: "Name f\u00fcr GeoJSON",
            value: arrowName,
            onChange: (e) => onArrowNameChange(e.target.value),
            disabled: !canEditName,
            className:
              "w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-50",
          }),
          _jsx("button", {
            id: "copyGeoJsonBtn",
            title: "Aktuellen Pfeil-Umriss als GeoJSON kopieren",
            onClick: onCopyGeoJson,
            disabled: !canCopyGeoJson,
            className: `${commonButtonClass} w-full mt-1 text-slate-700\n                      disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed`,
            children: "GeoJSON kopieren",
          }),
          _jsx("button", {
            id: "saveAllGeoJsonBtn",
            title: "Alle finalisierten Pfeile als GeoJSON-Datei speichern",
            onClick: onSaveAllGeoJson,
            disabled: !canSaveAllGeoJson,
            className: `${commonButtonClass} w-full mt-1\n                      bg-green-500 text-white hover:bg-green-600\n                      disabled:bg-green-200 disabled:text-green-500 disabled:cursor-not-allowed`,
            children: "Alle Pfeile speichern",
          }),
        ],
      }),
      isEditingOrDrawing &&
        _jsxs("div", {
          id: "confirmButtons",
          className: "mt-2 flex gap-2",
          children: [
            _jsx("button", {
              id: "okBtn",
              title: "Bearbeitung abschlie\u00dfen",
              onClick: onConfirm,
              className: `${commonButtonClass} flex-1 bg-green-500 text-white hover:bg-green-600`,
              children: "Ok",
            }),
            _jsx("button", {
              id: "cancelBtn",
              title: "Bearbeitung abbrechen",
              onClick: onCancel,
              className: `${commonButtonClass} flex-1 bg-red-500 text-white hover:bg-red-600`,
              children: "Abbrechen",
            }),
          ],
        }),
    ],
  });
};

export default ControlPanel;
