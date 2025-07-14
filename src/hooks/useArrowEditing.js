import { useState } from 'react';
import { EditingState } from '../types.js';

export default function useArrowEditing() {
  const [editingState, setEditingState] = useState(EditingState.Idle);
  const [anchors, setAnchors] = useState([]);
  const [arrows, setArrows] = useState([]);

  const startDrawing = () => {
    setAnchors([]);
    setEditingState(EditingState.DrawingNew);
  };

  const addPoint = (latlng) => {
    setAnchors((prev) => [...prev, latlng]);
  };

  const confirm = () => {
    if (anchors.length >= 2) {
      setArrows((prev) => [...prev, { id: Date.now(), points: anchors }]);
    }
    setAnchors([]);
    setEditingState(EditingState.Idle);
  };

  const cancel = () => {
    setAnchors([]);
    setEditingState(EditingState.Idle);
  };

  const deleteArrow = (id) => {
    setArrows((prev) => prev.filter((a) => a.id !== id));
  };

  return {
    editingState,
    anchors,
    arrows,
    startDrawing,
    addPoint,
    confirm,
    cancel,
    deleteArrow,
  };
}
