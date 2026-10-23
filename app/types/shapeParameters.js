export const DEFAULT_FORM = Object.freeze({
  shaftThicknessPx: 16, rearTaper: 1.25, frontTaper: 1, headLengthPx: 48, headWidthPx: 36,
});

export const FORM_LIMITS = Object.freeze({
  shaftThickness: { min: 2, max: 120 },
  headLength: { min: 2, max: 240 },
  headWidth: { min: 2, max: 240 },
  rearTaper: { min: 0.2, max: 2.5 },
  frontTaper: { min: 0.2, max: 2.5 },
});

export function clampFormValue(key, value) {
  const limits = FORM_LIMITS[key];
  if (!limits || value === '' || value === null || !Number.isFinite(Number(value))) return null;
  return Math.max(limits.min, Math.min(limits.max, Number(value)));
}
