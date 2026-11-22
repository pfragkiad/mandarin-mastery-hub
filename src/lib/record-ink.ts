import { glyphCardInk, isRadicalGlyph, type CardInk } from './card-ink';
import { isRadicalSubstitute } from './radical-substitute';
import type { LibraryEntry, LibraryKind } from './character-library';

/**
 * The identity ink of one exact glyph record, wherever it is drawn (library grid cards,
 * sentence/lesson hint popups and their "As a character/component/radical" rows):
 * a Radicals substitute (西 under 襾) wears its own olive-brown, otherwise glyphCardInk's
 * order applies — Traditional purple, then radical gold (any record whose glyph is a
 * sourced Kangxi radical, so 八 is gold as a character, component and radical alike),
 * then green Characters and foreground Components.
 *
 * Lives apart from card-ink.ts only because radical-substitute imports character-library,
 * which itself imports card-ink.
 */
export function glyphRecordInk(entry: Pick<LibraryEntry, 'hanzi' | 'radicalVariant' | 'kangxiIndex' | 'script'>, kind: LibraryKind): CardInk {
  if (kind === 'Radicals' && isRadicalSubstitute(entry.kangxiIndex, entry.radicalVariant)) return 'card-ink-substitute';
  return glyphCardInk(kind, entry.script, isRadicalGlyph(entry, kind));
}
