// Balanced column count for Practice's form-switch tray (RadicalForms/ScriptForms,
// layout="switch"). With at most 4 tiles per row, wraps are split evenly — five forms
// wrap 3+2 instead of 4+1 — so no row holds a lone stretched tile. The tray's CSS grid
// (styles.css .form-switch .radical-form-list[style]) reads the result via --form-cols,
// which also keeps every tile the same width.
export function formSwitchColumns(count: number): number {
  if (count <= 4) return Math.max(count, 1);
  const rows = Math.ceil(count / 4);
  return Math.ceil(count / rows);
}
