import { referenceCatalog } from '@/components/tutor/references';

export type LibraryKind = 'Characters' | 'Radicals' | 'Components' | 'Strokes';
export type DecompositionNode = { glyph: string; position: string; children?: DecompositionNode[] };
export type LibraryEntry = { id: string; hanzi: string; pinyin: string; meaning: string; note: string; strokes?: number; decomposition?: { root: DecompositionNode; source: string; status: string } };
export const plannedCounts: Record<LibraryKind, number> = { Strokes: 18, Radicals: 214, Components: 1843, Characters: 9564 };
const strokeSamples = [ ['丶', 'diǎn', 'Dot'], ['一', 'héng', 'Horizontal'], ['丨', 'shù', 'Vertical'], ['丿', 'piě', 'Left-falling'], ['㇏', 'nà', 'Right-falling'], ['㇀', 'tí', 'Rising'] ];
export function libraryEntries(kind: LibraryKind): LibraryEntry[] {
  const rows = kind === 'Strokes' ? strokeSamples.map(row => [...row, 'Basic stroke form']) : referenceCatalog.find(group => `${group.kind}s` === kind)?.entries ?? [];
  return rows.map(([hanzi = '', pinyin = '', meaning = '', note = '']) => ({ id: `${kind}:${hanzi}`, hanzi, pinyin, meaning, note, strokes: kind === 'Strokes' ? undefined : Number(note.match(/^(\d+) strokes?/)?.[1]) || undefined,
    ...(kind === 'Characters' && hanzi === '我' ? { decomposition: { root: { glyph: '⿰', position: 'root', children: [{ glyph: '才', position: 'left' }, { glyph: '戈', position: 'right' }] }, source: 'Provided reference screenshot', status: 'Illustrative reference only · source file pending' } } : {}),
  }));
}
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
export function filterLibrary(entries: LibraryEntry[], query: string, strokeCount = '', sourceOnly = false) {
  return entries.filter(entry => normalize([entry.hanzi, entry.pinyin, entry.meaning, entry.note].join(' ')).includes(normalize(query)) && (!strokeCount || entry.strokes === Number(strokeCount)) && (!sourceOnly || Boolean(entry.decomposition)));
}
export function libraryPage(entries: LibraryEntry[], page: number, size = 24) {
  const pages = Math.max(1, Math.ceil(entries.length / size));
  const current = Math.max(1, Math.min(page, pages));
  return { entries: entries.slice((current - 1) * size, current * size), pages, current };
}