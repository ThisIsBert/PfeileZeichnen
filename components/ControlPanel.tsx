
import React from 'react';
import { EditingState } from '../types'; 

interface ControlPanelProps {
  editingState: EditingState;
  onDrawArrow: () => void;
  onCopyArrow: () => void;
  canCopyArrow: boolean;
  onDeleteArrow: () => void; 
  canDeleteArrow: boolean;  
  
  shaftThicknessFactor: number;
  onShaftThicknessChange: (value: number) => void;
  arrowHeadLengthFactor: number;
  onArrowHeadLengthChange: (value: number) => void;
  arrowHeadWidthFactor: number;
  onArrowHeadWidthChange: (value: number) => void;
  canEditParameters: boolean;

  arrowName: string;
  onArrowNameChange: (name: string) => void;
  canEditName: boolean;

  onCopyGeoJson: () => void;
  canCopyGeoJson: boolean;
  onSaveAllGeoJson: () => void;
  canSaveAllGeoJson: boolean;

  onConfirm: () => void;
  onCancel: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
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
  const isEditingOrDrawing = editingState === EditingState.DrawingNew || editingState === EditingState.EditingSelected;

  const commonButtonClass = "px-3 py-2 border-2 border-gray-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors";

  return (
    <div id="controlPanel" className="absolute top-4 right-4 z-[10000] bg-white p-4 border border-gray-300 rounded-lg shadow-lg w-64 flex flex-col gap-3">
      {/* Row 1: "Neuen Pfeil zeichnen" button - full width */}
      <button
        id="drawArrowBtn"
        title="Neuen Pfeil zeichnen"
        onClick={onDrawArrow}
        disabled={isEditingOrDrawing}
        className={`${commonButtonClass} w-full
                    bg-blue-500 text-white hover:bg-blue-600
                    disabled:bg-blue-200 disabled:text-blue-500 disabled:cursor-not-allowed`}
      >
        Neuen Pfeil zeichnen
      </button>

      {/* Row 2: "Kopieren" and "Pfeil Löschen" buttons - side by side */}
      <div className="flex gap-2">
        <button
          id="copyArrowBtn"
          title="Aktuell bearbeiteten Pfeil kopieren"
          onClick={onCopyArrow}
          disabled={!canCopyArrow}
          className={`${commonButtonClass} flex-1 text-slate-700
                      disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed`}
        >
          Kopieren
        </button>
        <button
          id="deleteArrowBtn"
          title="Ausgewählten Pfeil löschen"
          onClick={onDeleteArrow}
          disabled={!canDeleteArrow}
          className={`${commonButtonClass} flex-1 bg-red-500 text-white hover:bg-red-600
                      disabled:bg-red-200 disabled:text-red-500 disabled:cursor-not-allowed`}
        >
          Pfeil Löschen
        </button>
      </div>

      <div>
        <label htmlFor="shaftThicknessSlider" className="block text-sm font-medium text-gray-700 mb-1">
          Schaftdicke: {shaftThicknessFactor.toFixed(3)}
        </label>
        <input
          type="range"
          id="shaftThicknessSlider"
          min="0.005"
          max="0.1"
          step="0.005"
          value={shaftThicknessFactor}
          onChange={(e) => onShaftThicknessChange(parseFloat(e.target.value))}
          disabled={!canEditParameters}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      <div>
        <label htmlFor="arrowHeadLengthSlider" className="block text-sm font-medium text-gray-700 mb-1">
          Pfeilspitzenlänge: {arrowHeadLengthFactor.toFixed(3)}
        </label>
        <input
          type="range"
          id="arrowHeadLengthSlider"
          min="0.05"
          max="0.2"
          step="0.01"
          value={arrowHeadLengthFactor}
          onChange={(e) => onArrowHeadLengthChange(parseFloat(e.target.value))}
          disabled={!canEditParameters}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>
      
      <div>
        <label htmlFor="arrowHeadWidthSlider" className="block text-sm font-medium text-gray-700 mb-1">
          Pfeilspitzenbreite: {arrowHeadWidthFactor.toFixed(3)}
        </label>
        <input
          type="range"
          id="arrowHeadWidthSlider"
          min="0.05"
          max="0.2"
          step="0.01"
          value={arrowHeadWidthFactor}
          onChange={(e) => onArrowHeadWidthChange(parseFloat(e.target.value))}
          disabled={!canEditParameters}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      <div className="mt-2 border-t border-gray-200 pt-3 flex flex-col gap-2">
        <label htmlFor="arrowNameInput" className="block text-sm font-medium text-gray-700">
          Pfeil Name (aktuell):
        </label>
        <input
          type="text"
          id="arrowNameInput"
          placeholder="Name für GeoJSON"
          value={arrowName}
          onChange={(e) => onArrowNameChange(e.target.value)}
          disabled={!canEditName}
          className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-50"
        />
        <button
          id="copyGeoJsonBtn"
          title="Aktuellen Pfeil-Umriss als GeoJSON kopieren"
          onClick={onCopyGeoJson}
          disabled={!canCopyGeoJson}
          className={`${commonButtonClass} w-full mt-1 text-slate-700
                      disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed`}
        >
          GeoJSON kopieren
        </button>
        <button
          id="saveAllGeoJsonBtn"
          title="Alle finalisierten Pfeile als GeoJSON-Datei speichern"
          onClick={onSaveAllGeoJson}
          disabled={!canSaveAllGeoJson}
          className={`${commonButtonClass} w-full mt-1 
                      bg-green-500 text-white hover:bg-green-600
                      disabled:bg-green-200 disabled:text-green-500 disabled:cursor-not-allowed`}
        >
          Alle Pfeile speichern
        </button>
      </div>

      {isEditingOrDrawing && (
        <div id="confirmButtons" className="mt-2 flex gap-2">
          <button
            id="okBtn"
            title="Bearbeitung abschließen"
            onClick={onConfirm}
            className={`${commonButtonClass} flex-1 bg-green-500 text-white hover:bg-green-600`}
          >
            Ok
          </button>
          <button
            id="cancelBtn"
            title="Bearbeitung abbrechen"
            onClick={onCancel}
            className={`${commonButtonClass} flex-1 bg-red-500 text-white hover:bg-red-600`}
          >
            Abbrechen
          </button>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;
