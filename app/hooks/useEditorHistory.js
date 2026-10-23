import { useCallback, useEffect, useRef, useState } from 'react';
import { createHistory } from '../state/history.js';

export function useEditorHistory() {
  const historyRef = useRef(null);
  if (!historyRef.current) historyRef.current = createHistory();
  const captureRef = useRef(null);
  const restoreRef = useRef(null);
  const activeRef = useRef(null);
  const pendingRef = useRef(null);
  const frameRef = useRef(null);
  const [, update] = useState(0);
  const flush = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    if (pendingRef.current === null) return;
    const before = pendingRef.current;
    pendingRef.current = null;
    if (historyRef.current.record(before, captureRef.current())) update(version => version + 1);
  }, []);
  const begin = useCallback(() => {
    if (activeRef.current !== null) return;
    flush();
    activeRef.current = captureRef.current();
  }, [flush]);
  const end = useCallback(() => {
    if (activeRef.current === null) return;
    pendingRef.current = activeRef.current;
    activeRef.current = null;
    // Read after React has committed the final pointer/input event of a gesture.
    frameRef.current = requestAnimationFrame(flush);
  }, [flush]);
  const run = useCallback(action => {
    const ownsTransaction = activeRef.current === null;
    if (ownsTransaction) begin();
    try { return action(); }
    finally { if (ownsTransaction) end(); }
  }, [begin, end]);
  const undo = useCallback(() => {
    end();
    flush();
    const snapshot = historyRef.current.undo();
    if (snapshot !== null && restoreRef.current(snapshot) === false) historyRef.current.redo();
    update(version => version + 1);
  }, [end, flush]);
  const redo = useCallback(() => {
    end();
    flush();
    const snapshot = historyRef.current.redo();
    if (snapshot !== null && restoreRef.current(snapshot) === false) historyRef.current.undo();
    update(version => version + 1);
  }, [end, flush]);
  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
  }, []);
  return { captureRef, restoreRef, begin, end, run, undo, redo,
    canUndo: historyRef.current.canUndo, canRedo: historyRef.current.canRedo };
}
