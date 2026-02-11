import { EditingState } from '../../types.js';

/**
 * @param {number} editingState
 * @returns {boolean}
 */
export function isEditing(editingState) {
  return editingState === EditingState.DrawingNew || editingState === EditingState.EditingSelected;
}

/**
 * @param {number} editingState
 * @returns {boolean}
 */
export function canEditParameters(editingState) {
  return isEditing(editingState);
}

/**
 * @param {number} editingState
 * @param {boolean} hasSelectedArrow
 * @returns {boolean}
 */
export function canDeleteArrow(editingState, hasSelectedArrow) {
  return editingState === EditingState.EditingSelected && hasSelectedArrow;
}

/**
 * @param {number} editingState
 * @param {number} savedArrowCount
 * @returns {boolean}
 */
export function canSaveAllGeoJson(editingState, savedArrowCount) {
  return editingState === EditingState.Idle && savedArrowCount > 0;
}
