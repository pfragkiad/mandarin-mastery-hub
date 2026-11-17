import { glyphIndex, libraryEntries, type LibraryEntry, type LibraryKind } from './character-library';
import { includeScript } from './learning-preferences';
import finderMissing from '@/data/finder-missing.json';

/**
 * Which library record a Hanzi finder match opens (browser-safe).
 *
 * One exact glyph is one result: in "All", a glyph recorded in several
 * libraries resolves like every glyph link (glyphIndex: the radical card wins,
 * then Characters, then Components), so the same form never appears twice.
 * A single-library scope only accepts glyphs that are records of that library.
 * The Traditional preference filters by the exact record's script. Returns null
 * for glyphs outside the scope, never a look-alike substitute.
 */
export type FinderScope = 'all' | 'Characters' | 'Components' | 'Radicals';
export const FINDER_SCOPES: { key: FinderScope; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'Characters', label: 'Characters' }, { key: 'Components', label: 'Components' }, { key: 'Radicals', label: 'Radicals' },
];
const kindLabels: Record<LibraryKind, string> = { Characters: 'Character', Components: 'Component', Radicals: 'Radical', Strokes: 'Stroke' };

const byKind = new WeakMap<LibraryEntry[], Map<string, LibraryEntry>>();
function record(kind: LibraryKind, glyph: string) {
  const all = libraryEntries(kind);
  let map = byKind.get(all);
  if (!map) { map = new Map(all.map(e => [e.hanzi, e])); byKind.set(all, map); }
  return map.get(glyph);
}

export function finderRecord(glyph: string, scope: FinderScope, includeTraditional: boolean): { kind: LibraryKind; kindLabel: string; entry: LibraryEntry } | null {
  const kind: LibraryKind | undefined = scope === 'all' ? glyphIndex()[glyph]?.kind : scope;
  const entry = kind ? record(kind, glyph) : undefined;
  if (!kind || !entry || !includeScript(entry.script, includeTraditional)) return null;
  return { kind, kindLabel: kindLabels[kind], entry };
}

const missing = new Set(finderMissing.missing);
/**
 * Whether the finder index holds recorded strokes for this exact glyph, decided
 * without fetching the index: the index covers exactly the Characters,
 * Components and Radicals record glyphs minus finder-missing.json (both written
 * by scripts/build-finder-medians.py). Radical-identity aliases and unrecorded
 * variant forms are not records, so they return false and offer no "Find similar".
 */
export function finderCoversGlyph(glyph: string): boolean {
  if (missing.has(glyph)) return false;
  return (['Radicals', 'Characters', 'Components'] as LibraryKind[]).some(kind => record(kind, glyph) !== undefined);
}
