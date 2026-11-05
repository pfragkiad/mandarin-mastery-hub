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
/** Presentation priority only: keep the imported sequence and duplicate form keys intact. */
export function orderedRadicalForms(family: RadicalFamily): RadicalForm[] {
  const priority = (form: RadicalForm) => form.character === family.canonical ? 0 : form.formKind === 'kangxi-heading' ? 1 : 2;
  return [...family.forms].sort((a, b) => priority(a) - priority(b));
}
/** Historical colour is scoped to an exact recorded heading with a distinct Mainland form. */
export function historicalRadicalHeading(glyph: string, familyId?: number): boolean {
  return (catalog.radicalStrokes.families ?? []).some(family => (familyId === undefined || family.id === familyId) && family.kangxiHeading === glyph && family.canonical !== glyph && family.forms.some(form => form.character === family.canonical));
}
export function radicalForm(id: number, key?: string) { return key ? radicalFamily(id)?.forms.find(form => form.key === key) : undefined; }
export function radicalForms(glyph: string) { return catalog.radicalStrokes.families?.flatMap(family => family.forms.filter(form => form.character === glyph).map(form => ({ family, form }))) ?? []; }