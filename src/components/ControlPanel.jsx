import React from 'react';
import { EditingState } from '../types.js';

export default function ControlPanel({
  editingState,
  startDrawing,
  confirm,
  cancel,
  onExport,
}) {
  const drawing = editingState === EditingState.DrawingNew;

  return (
    <div
      id="controlPanel"
      className="absolute top-4 right-4 z-[10000] bg-white p-4 border border-gray-300 rounded-lg shadow-lg w-48 flex flex-col gap-2"
    >
      {!drawing && (
        <button
          onClick={startDrawing}
          className="px-3 py-2 bg-blue-500 text-white rounded"
        >
          Draw Arrow
        </button>
      )}
      {drawing && (
        <>
          <button
            onClick={confirm}
            className="px-3 py-2 bg-green-500 text-white rounded"
          >
            Confirm
          </button>
          <button onClick={cancel} className="px-3 py-2 bg-gray-200 rounded">
            Cancel
          </button>
        </>
      )}
      <button onClick={onExport} className="px-3 py-2 bg-slate-200 rounded">
        Export GeoJSON
      </button>
    </div>
  );
}
