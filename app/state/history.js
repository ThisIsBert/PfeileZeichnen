/** Plain-data command history. A gesture is recorded only when it changes data. */
export function createHistory(limit = 100) {
  const past = [];
  const future = [];
  return {
    get canUndo() { return past.length > 0; },
    get canRedo() { return future.length > 0; },
    record(before, after) {
      if (JSON.stringify(before) === JSON.stringify(after)) return false;
      past.push({ before: structuredClone(before), after: structuredClone(after) });
      if (past.length > limit) past.shift();
      future.length = 0;
      return true;
    },
    undo() {
      const entry = past.pop();
      if (!entry) return null;
      future.push(entry);
      return structuredClone(entry.before);
    },
    redo() {
      const entry = future.pop();
      if (!entry) return null;
      past.push(entry);
      return structuredClone(entry.after);
    },
  };
}
