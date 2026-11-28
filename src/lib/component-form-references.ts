import data from '@/data/component-form-references.json';
import { catalog, type CatalogRow } from './catalog-store';

type FormReference = {
  glyph: string; relation: 'old-variant' | 'phonetic-component';
  recordedRows: Partial<Record<'Characters' | 'Components', CatalogRow>>;
  targetKind: 'Characters'; targetRow: CatalogRow;
  meaningMode: 'shared' | 'related-only'; description: string;
  evidence: { source: string; sourceUrl: string };
};
const references = data.references as unknown as Record<string, FormReference>;
const sameRow = (left: CatalogRow | undefined, right: CatalogRow) => JSON.stringify(left) === JSON.stringify(right);

/** Resolve only reviewed exact tuples, independently of script/radical/geometry identity.
 * Source and target edits invalidate the annotation. Targets are read directly from the
 * catalogue, so links never recursively inherit meanings or turn a phonetic relation lexical.
 */
export function componentFormReference(glyph: string) {
  const record = references[glyph];
  if (!record) return null;
  for (const [kind, row] of Object.entries(record.recordedRows)) {
    const current = (kind === 'Characters' ? catalog.characters : catalog.components).find(item => item[0] === glyph);
    if (!sameRow(current, row)) return null;
  }
  const target = catalog.characters.find(row => row[0] === record.targetRow[0]);
  if (!target || !sameRow(target, record.targetRow)) return null;
  if (record.meaningMode === 'shared' && Object.values(record.recordedRows).some(row => row[1] !== target[1])) return null;
  const [targetGlyph, reading, meaning] = target;
  const primaryMeaning = record.meaningMode === 'shared' ? meaning : `Related ${targetGlyph}: ${meaning}`;
  return { ...record, target: { glyph: targetGlyph, id: `Characters:${targetGlyph}`, reading, meaning },
    meaning: `${primaryMeaning}; (${record.description})` };
}

/** Idempotent over raw and already-presented values; unrelated caller text stays intact. */
export function componentFormMeaning(glyph: string, reading: string, meaning: string): string | null {
  const reference = componentFormReference(glyph);
  if (!reference) return null;
  const matches = Object.values(reference.recordedRows).some(row => row[1] === reading && (row[2] === meaning || reference.meaning === meaning));
  return matches ? reference.meaning : null;
}
