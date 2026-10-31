import { radicalFamily } from './radical-strokes';
import type { DecompositionNode, LibraryEntry, LibraryKind } from './character-library';
import { gSourceDecompositions, loadRecord, type CharacterEnrichment } from './character-enrichment';
import { includeScript } from './learning-preferences';
import type { Word } from './mandarin';
import { sortByUsage } from './usage-frequency';

export type GlyphUsage = { word: Word; sentence: boolean; matchedGlyph: string };
const containsComponent = (node: DecompositionNode, glyph: string): boolean => node.glyph === glyph || Boolean(node.children?.some(child => containsComponent(child, glyph)));

export type EnrichmentLoader = (character: string) => Promise<CharacterEnrichment | null>;

/** Component parents come only from recorded BabelStone direct-G trees, never the Hanzi structure. */
export async function glyphParentCharactersGSource(entry: LibraryEntry, characters: LibraryEntry[], includeTraditional = false, load: EnrichmentLoader = loadRecord): Promise<LibraryEntry[]> {
  const seen = new Set<string>();
  const candidates = characters.filter(parent => {
    if (parent.hanzi === entry.hanzi || seen.has(parent.id) || !includeScript(parent.script, includeTraditional)) return false;
    seen.add(parent.id);
    return true;
  });
  const matches = await Promise.all(candidates.map(async parent => {
    const record = await load(parent.hanzi);
    const related = gSourceDecompositions(record).some(alternative => alternative.tree && containsComponent(alternative.tree, entry.hanzi));
    return related ? parent : null;
  }));
  return sortByUsage(matches.filter((parent): parent is LibraryEntry => parent !== null), 'Characters', includeTraditional);
}

/** Exact recorded relationships only; exclude self, hidden scripts and duplicate records. */
/** Radical examples: characters whose dictionary radical is the family heading. When the
 * family has several forms (刀 / 刂 / ⺈), the parent must also contain the exact selected
 * form in its recorded breakdown, so each variant only lists characters that use that form. */
export function glyphParentCharacters(entry: LibraryEntry, kind: LibraryKind, characters: LibraryEntry[], includeTraditional = false, familyGlyph?: string): LibraryEntry[] {
  if (kind !== 'Components' && kind !== 'Radicals') return [];
  const seen = new Set<string>();
  const assigned = familyGlyph ?? entry.hanzi;
  const multiForm = kind === 'Radicals' && entry.kangxiIndex !== undefined && new Set(radicalFamily(entry.kangxiIndex)?.forms.map(form => form.character) ?? []).size > 1;
  return sortByUsage(characters.filter(parent => {
    if (parent.hanzi === entry.hanzi || seen.has(parent.id) || !includeScript(parent.script, includeTraditional)) return false;
    const related = kind === 'Radicals'
      ? parent.note.match(/·\s*(.+?) radical$/)?.[1] === assigned && (!multiForm || Boolean(parent.decomposition && containsComponent(parent.decomposition.root, entry.hanzi)))
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