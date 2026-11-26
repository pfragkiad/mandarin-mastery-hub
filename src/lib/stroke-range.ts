/**
 * Stroke count filter parsing, formatting and matching.
 * Supports exact counts ("4"), legacy cumulative counts ("4" + strokesUpTo),
 * inclusive ranges ("4-9"), and open-ended upper bounds ("11+").
 */
export const STROKE_SLIDER_MIN = 1;
export const STROKE_SLIDER_MAX = 20;

export type StrokeRange = { min: number; max: number | null };

export function parseStrokeRange(strokes?: string, strokesUpTo = false): StrokeRange | null {
  const raw = (strokes ?? '').trim();
  if (!raw) return null;
  const plus = raw.match(/^([1-9]\d*)\+$/);
  if (plus) return { min: Number(plus[1]), max: null };
  const range = raw.match(/^([1-9]\d*)-([1-9]\d*)$/);
  if (range) {
    const min = Number(range[1]);
    const max = Number(range[2]);
    return min <= max ? { min, max } : null;
  }
  if (/^[1-9]\d*$/.test(raw)) {
    const count = Number(raw);
    return strokesUpTo ? { min: 1, max: count } : { min: count, max: count };
  }
  return null;
}

export function isValidStrokeFilter(strokes?: string): boolean {
  return parseStrokeRange(strokes) !== null;
}

export function formatStrokeRangeValue(min: number, max: number | null): string {
  const lo = Math.max(STROKE_SLIDER_MIN, Math.round(min));
  if (max === null) return lo <= STROKE_SLIDER_MIN ? '' : `${lo}+`;
  const hi = Math.max(lo, Math.round(max));
  return lo === hi ? String(lo) : `${lo}-${hi}`;
}

export function formatStrokeRangeLabel(strokes?: string, strokesUpTo = false, minStrokes = STROKE_SLIDER_MIN, maxStrokes = STROKE_SLIDER_MAX): string {
  const range = parseStrokeRange(strokes, strokesUpTo);
  if (!range) {
    if (minStrokes === maxStrokes) return `${minStrokes} ${minStrokes === 1 ? 'stroke' : 'strokes'}`;
    return `${minStrokes} – ${maxStrokes} strokes`;
  }
  if (range.max === null) return `${range.min}+ strokes`;
  if (range.min === range.max) return `${range.min} ${range.min === 1 ? 'stroke' : 'strokes'}`;
  return `${range.min} – ${range.max} strokes`;
}

export function matchesStrokeFilter(entryStrokes: number | undefined, strokes?: string, strokesUpTo = false): boolean {
  if (!strokes) return true;
  const range = parseStrokeRange(strokes, strokesUpTo);
  if (!range) return true;
  if (entryStrokes === undefined) return false;
  return entryStrokes >= range.min && (range.max === null || entryStrokes <= range.max);
}