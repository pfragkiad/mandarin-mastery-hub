import type { LibraryEntry } from './character-library';
import { radicalParentCharacters, type EnrichmentLoader } from './glyph-usage';
import { loadRecord } from './character-enrichment';
import { radicalFamily, radicalForm } from './radical-strokes';

/** "In a character" availability for a radical card. Family cards advertise their displayed
 * forms; saved variant cards stay exact-form scoped. (The breakdown indicator reads the card's
 * own exact-glyph tree, entry.decomposition, like every other glyph card.)
 * Async because multi-form families check parents against lazily loaded BabelStone trees,
 * the same rule the detail sheet's "In a character" list uses, so the card's indicator
 * never promises examples the sheet would not show. */
export async function radicalCardAvailability(entry: LibraryEntry, characters: LibraryEntry[], includeTraditional: boolean, load: EnrichmentLoader = loadRecord) {
  const family = entry.kangxiIndex ? radicalFamily(entry.kangxiIndex) : undefined;
  const selected = entry.kangxiIndex ? radicalForm(entry.kangxiIndex, entry.radicalVariant) : undefined;
  const forms = entry.radicalVariant ? (selected ? [selected] : []) : family?.forms ?? [];
  const candidates = forms.length ? forms.map(form => ({ entry: { ...entry, hanzi: form.character } })) : [{ entry }];
  const examples = await Promise.all(candidates.map(candidate => radicalParentCharacters(candidate.entry, characters, includeTraditional, family?.kangxiHeading ?? entry.hanzi, load)));
  return { example: examples.some(rows => rows.length > 0) };
}
