import { catalog } from './catalog-store';
export type RadicalStrokeRecord = { status: 'recorded' | 'unrecorded' | 'count-mismatch' | 'derived' | 'ambiguous'; strokes: { name: string; pinyin: string; glyph: string | null }[]; source?: string; sourceStatus?: string; provenance?: unknown; officiallyVerified?: boolean };
export type RadicalForm = { key: string; character: string; aliases: string[]; formKind: string; strokeCount: number; record: RadicalStrokeRecord };
export type RadicalFamily = { id: number; canonical: string; kangxiHeading: string; familyPinyin: string; forms: RadicalForm[] };
export type RadicalStrokeFile = {
  schemaVersion: 1;
  source: string;
  records: Record<string, RadicalStrokeRecord>;
  families?: RadicalFamily[];
  exactForms?: Record<string, RadicalStrokeRecord>;
};
/** Exact canonical radical only; variants never inherit another glyph's stroke order. */
export function radicalStrokes(glyph: string, form?: RadicalForm) {
  return form?.character === glyph ? form.record : catalog.radicalStrokes.exactForms?.[glyph] ?? catalog.radicalStrokes.records[glyph];
}
export function radicalFamily(id: number) { return catalog.radicalStrokes.families?.find(family => family.id === id); }
export function radicalForm(id: number, key?: string) { return key ? radicalFamily(id)?.forms.find(form => form.key === key) : undefined; }
export function radicalForms(glyph: string) { return catalog.radicalStrokes.families?.flatMap(family => family.forms.filter(form => form.character === glyph).map(form => ({ family, form }))) ?? []; }