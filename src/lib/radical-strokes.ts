import { catalog } from './catalog-store';
export type RadicalStrokeFile = {
  schemaVersion: 1;
  source: string;
  records: Record<string, { status: 'recorded' | 'unrecorded' | 'count-mismatch'; strokes: { name: string; pinyin: string; glyph: string | null }[] }>;
};
/** Exact canonical radical only; variants never inherit another glyph's stroke order. */
export function radicalStrokes(glyph: string) {
  return catalog.radicalStrokes.records[glyph];
}