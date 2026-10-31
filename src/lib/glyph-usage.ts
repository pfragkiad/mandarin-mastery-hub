import type { DecompositionNode, LibraryEntry, LibraryKind } from './character-library';
import { includeScript } from './learning-preferences';
import type { Word } from './mandarin';
import { sortByUsage } from './usage-frequency';

export type GlyphUsage = { word: Word; sentence: boolean; matchedGlyph: string };
const containsComponent = (node: DecompositionNode, glyph: string): boolean => node.glyph === glyph || Boolean(node.children?.some(child => containsComponent(child, glyph)));

/** Exact recorded relationships only; exclude self, hidden scripts and duplicate records. */
export function glyphParentCharacters(entry: LibraryEntry, kind: LibraryKind, characters: LibraryEntry[], includeTraditional = false): LibraryEntry[] {
  if (kind !== 'Components' && kind !== 'Radicals') return [];
  const seen = new Set<string>();
  return sortByUsage(characters.filter(parent => {
    if (parent.hanzi === entry.hanzi || seen.has(parent.id) || !includeScript(parent.script, includeTraditional)) return false;
    const related = kind === 'Radicals'
      ? parent.note.match(/·\s*(.+?) radical$/)?.[1] === entry.hanzi
      : Boolean(parent.decomposition && containsComponent(parent.decomposition.root, entry.hanzi));
    if (related) seen.add(parent.id);
    return related;
  }), 'Characters', includeTraditional);
}

/** Existing text and explicit source relationships only; no inferred stroke shapes. */
export function glyphUsage(entry: LibraryEntry, kind: LibraryKind, items: Word[], characters: LibraryEntry[], includeTraditional = false): GlyphUsage[] {
  if (kind === 'Strokes') return [];
  const glyphs = new Set(kind === 'Characters' ? [entry.hanzi] : []);
  if (kind === 'Radicals' || kind === 'Components') {
    for (const parent of glyphParentCharacters(entry, kind, characters, includeTraditional)) glyphs.add(parent.hanzi);
  }
  const seen = new Set<string>();
  const results: GlyphUsage[] = [];
  for (const sentence of [true, false]) {
    for (const word of items) {
      if (!includeScript(word.script, includeTraditional)) continue;
      const text = sentence ? word.sentence : word.hanzi;
      const matchedGlyph = Array.from(text).find(glyph => glyphs.has(glyph));
      if (!text || !matchedGlyph || seen.has(text) || results.some(result => result.word.id === word.id)) continue;
      seen.add(text);
      results.push({ word, sentence, matchedGlyph });
      if (results.length === 1) return results;
    }
  }
  return results;
}