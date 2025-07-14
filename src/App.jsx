import React from 'react';
import ControlPanel from './components/ControlPanel.jsx';
import ArrowMap from './components/ArrowMap.jsx';
import useArrowEditing from './hooks/useArrowEditing.js';
import { arrowsToGeoJSON } from './utils/export.js';

function App() {
  const {
    editingState,
    anchors,
    arrows,
    startDrawing,
    addPoint,
    confirm,
    cancel,
  } = useArrowEditing();

  const handleExport = () => {
    const geo = arrowsToGeoJSON(arrows);
    navigator.clipboard
      .writeText(JSON.stringify(geo, null, 2))
      .then(() => alert('GeoJSON copied to clipboard!'))
      .catch(() => alert('Failed to copy GeoJSON'));
  };

  return (
    <div className="relative h-full w-full flex">
      <ArrowMap
        anchors={anchors}
        arrows={arrows}
        editingState={editingState}
        addPoint={addPoint}
      />
      <ControlPanel
        editingState={editingState}
        startDrawing={startDrawing}
        confirm={confirm}
        cancel={cancel}
        onExport={handleExport}
      />
    </div>
  );
}

export default App;
