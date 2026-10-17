import type { DecompositionNode, LibraryEntry, LibraryKind } from './character-library';
import { includeScript } from './learning-preferences';
import type { Word } from './mandarin';

export type GlyphUsage = { word: Word; sentence: boolean; matchedGlyph: string };
const containsComponent = (node: DecompositionNode, glyph: string): boolean => node.glyph === glyph || Boolean(node.children?.some(child => containsComponent(child, glyph)));

/** Existing text and explicit source relationships only; no inferred stroke shapes. */
export function glyphUsage(entry: LibraryEntry, kind: LibraryKind, items: Word[], characters: LibraryEntry[], includeTraditional = false): GlyphUsage[] {
  if (kind === 'Strokes') return [];
  const glyphs = new Set(kind === 'Characters' ? [entry.hanzi] : []);
  if (kind === 'Radicals' || kind === 'Components') {
    for (const parent of characters) {
      if (!includeScript(parent.script, includeTraditional)) continue;
      const related = kind === 'Radicals'
        ? parent.note.match(/·\s*(.+?) radical$/)?.[1] === entry.hanzi
        : parent.hanzi !== entry.hanzi && Boolean(parent.decomposition && containsComponent(parent.decomposition.root, entry.hanzi));
      if (related) glyphs.add(parent.hanzi);
    }
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