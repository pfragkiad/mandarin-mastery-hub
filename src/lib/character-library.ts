import { catalog, type CatalogRow } from './catalog-store';
import { includeScript, type CharacterScript } from './learning-preferences';
import { countComponentReuse, countRadicalUsage, reuseGroup, type ReuseGroup } from './component-reuse';

export type LibraryKind = 'Characters' | 'Radicals' | 'Components' | 'Strokes';
export type DecompositionNode = { glyph: string; position: string; children?: DecompositionNode[] };
export type LibraryEntry = { id: string; hanzi: string; pinyin: string; meaning: string; note: string; script?: CharacterScript; reuseCount?: number; strokes?: number | undefined; decomposition?: { root: DecompositionNode; source: string; status: string } };
export const plannedCounts: Record<LibraryKind, number> = { Strokes: 38, Radicals: 214, Components: 1843, Characters: 9575 };
// Catalogue rows as raw tuples, grouped for search, flashcard decks and practice facts.
export type ReferenceKind = 'Radical' | 'Component' | 'Character';
export const referenceCatalog: { kind: ReferenceKind; entries: CatalogRow[] }[] = [
  { kind: 'Radical', entries: catalog.radicals },
  { kind: 'Component', entries: catalog.components },
  { kind: 'Character', entries: catalog.characters },
];
const strokeSamples = [ ['丶', 'diǎn', 'Dot'], ['一', 'héng', 'Horizontal'], ['丨', 'shù', 'Vertical'], ['丿', 'piě', 'Left-falling'], ['㇏', 'nà', 'Right-falling'], ['㇀', 'tí', 'Rising'] ];
const cache = new Map<LibraryKind, { version: number; entries: LibraryEntry[] }>();
export const TREE_SOURCE = 'Make Me a Hanzi IDS (bddc96d)';
export function libraryEntries(kind: LibraryKind): LibraryEntry[] {
  const hit = cache.get(kind);
  if (hit && hit.version === catalog.version) return hit.entries;
  const source = kind === 'Strokes' ? catalog.strokes : kind === 'Radicals' ? catalog.radicals : kind === 'Components' ? catalog.components : catalog.characters;
  const rows = source.length ? source : kind === 'Strokes' ? strokeSamples.map(row => [...row, 'Basic stroke form']) : [];
  const reuse = kind === 'Components' ? countComponentReuse(catalog.components.map(row => row[0]), catalog.characters.map(row => row[0]), catalog.trees) : kind === 'Radicals' ? countRadicalUsage(catalog.radicals.map(row => row[0]), catalog.characters) : undefined;
  const entries = rows.map(([hanzi = '', pinyin = '', meaning = '', note = '', script]) => {
    const tree = kind === 'Strokes' ? undefined : catalog.trees[hanzi];
    return { id: `${kind}:${hanzi}`, hanzi, pinyin, meaning, note, ...(reuse ? { reuseCount: reuse[hanzi] ?? 0 } : {}), ...(script ? { script: script as CharacterScript } : {}), strokes: kind === 'Strokes' ? undefined : Number(note.match(/^(\d+) strokes?/)?.[1]) || undefined,
      ...(tree ? { decomposition: { root: tree, source: TREE_SOURCE, status: 'Imported graphical structure · not verified etymology' } } : {}) };
  });
  cache.set(kind, { version: catalog.version, entries });
  return entries;
}
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
export function filterLibrary(entries: LibraryEntry[], query: string, strokeCount = '', sourceOnly = false, includeTraditional = false, reuse?: ReuseGroup) {
  return entries.filter(entry => includeScript(entry.script, includeTraditional) && normalize([entry.hanzi, entry.pinyin, entry.meaning, entry.note].join(' ')).includes(normalize(query)) && (!strokeCount || entry.strokes === Number(strokeCount)) && (!sourceOnly || Boolean(entry.decomposition)) && (!reuse || (entry.reuseCount !== undefined && reuseGroup(entry.reuseCount).value === reuse)));
}
export const LIBRARY_PAGE_SIZE = 48;
export function libraryPage(entries: LibraryEntry[], page: number, size = LIBRARY_PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(entries.length / size));
  const current = Math.max(1, Math.min(page, pages));
  return { entries: entries.slice((current - 1) * size, current * size), pages, current };
}

const glyphCache = { version: -1, index: null as null | Record<string, { kind: LibraryKind; id: string; pinyin: string; meaning: string }> };
// Glyphs inside a sourced tree point at real library records. This resolves a glyph to
// its card; when a glyph exists as several records, the radical card wins.
export function glyphIndex(): Record<string, { kind: LibraryKind; id: string; pinyin: string; meaning: string }> {
  if (glyphCache.version === catalog.version && glyphCache.index) return glyphCache.index;
  const index: Record<string, { kind: LibraryKind; id: string; pinyin: string; meaning: string }> = {};
  for (const kind of ['Radicals', 'Characters', 'Components'] as LibraryKind[]) {
    for (const entry of libraryEntries(kind)) if (!(entry.hanzi in index)) index[entry.hanzi] = { kind, id: entry.id, pinyin: entry.pinyin, meaning: entry.meaning };
  }
  glyphCache.version = catalog.version;
  glyphCache.index = index;
  return index;
}

/** Open the exact sourced record on its visible page, without carrying unrelated filters. */
export function libraryDestination(glyph: string, includeTraditional = false) {
  const hit = glyphIndex()[glyph];
  if (!hit) return undefined;
  const entries = filterLibrary(libraryEntries(hit.kind), '', '', false, includeTraditional);
  const index = entries.findIndex(entry => entry.id === hit.id);
  const page = index < 0 ? 1 : Math.floor(index / LIBRARY_PAGE_SIZE) + 1;
  return { tab: hit.kind, id: hit.id, ...(page > 1 ? { page } : {}) };
}