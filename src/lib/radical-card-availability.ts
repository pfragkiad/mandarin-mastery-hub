import type { LibraryEntry } from './character-library';
import { glyphParentCharacters } from './glyph-usage';
import { radicalFamily, radicalForm, radicalStrokes } from './radical-strokes';

/** Family cards advertise their displayed forms; saved variant cards stay exact-form scoped. */
export function radicalCardAvailability(entry: LibraryEntry, characters: LibraryEntry[], includeTraditional: boolean) {
  const family = entry.kangxiIndex ? radicalFamily(entry.kangxiIndex) : undefined;
  const selected = entry.kangxiIndex ? radicalForm(entry.kangxiIndex, entry.radicalVariant) : undefined;
  const forms = entry.radicalVariant ? (selected ? [selected] : []) : family?.forms ?? [];
  const candidates = forms.length ? forms.map(form => ({ entry: { ...entry, hanzi: form.character }, record: radicalStrokes(form.character, form) })) : [{ entry, record: radicalStrokes(entry.hanzi) }];
  return {
    example: candidates.some(candidate => glyphParentCharacters(candidate.entry, 'Radicals', characters, includeTraditional, family?.kangxiHeading ?? entry.hanzi).length > 0),
    decomposition: candidates.some(candidate => candidate.record?.status === 'recorded'),
  };
}