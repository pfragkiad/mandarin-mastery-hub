import { radicalFamily } from './radical-strokes';
import { radicalIdentity } from './radical-identities';
import type { LibraryEntry, LibraryKind } from './character-library';

/** The identity class that sets `--card-ink` (styles.css): purple, gold, green or foreground. */
export type CardInk = 'is-traditional' | 'card-ink-radical' | 'card-ink-character' | 'card-ink-component' | '';

/**
 * Whether a glyph record reads as a radical: a Radicals family heading, or a glyph
 * that is itself a sourced Kangxi radical (白, 口, 刀). Exact source identities only,
 * never shape — so Characters/Components that are radicals wear gold too.
 */
export function isRadicalGlyph(entry: Pick<LibraryEntry, 'hanzi' | 'radicalVariant' | 'kangxiIndex'>, kind: LibraryKind): boolean {
  const family = kind === 'Radicals' && !entry.radicalVariant && entry.kangxiIndex ? radicalFamily(entry.kangxiIndex) : undefined;
  return Boolean(family) || radicalIdentity(entry.hanzi).radicals.length > 0;
}

/**
 * One identity ink for every glyph card (library grid and Start's random cards), so
 * the colours never drift between them: Traditional wins, then radical, then the
 * library kind (Characters green, Components foreground). Strokes and unidentified
 * Radicals records keep the default accent ('').
 */
export function glyphCardInk(kind: LibraryKind, script: LibraryEntry['script'], radical: boolean): CardInk {
  if (script === 'Traditional') return 'is-traditional';
  if (radical) return 'card-ink-radical';
  if (kind === 'Characters') return 'card-ink-character';
  if (kind === 'Components') return 'card-ink-component';
  return '';
}
