import { radicalFamily } from './radical-strokes';
import { radicalIdentity } from './radical-identities';
import { glyphPresentation } from './glyph-presentation';
import type { LibraryEntry, LibraryKind } from './character-library';

/** The identity class that sets `--card-ink` (styles.css): purple, gold, green or foreground. */
export type CardInk = 'is-traditional' | 'card-ink-radical' | 'card-ink-character' | 'card-ink-component' | 'card-ink-substitute' | '';

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

/** The one written form of a Vocabulary headword, or null for multi-character words/phrases. */
function singleGlyph(hanzi: string): string | null {
  const glyphs = Array.from(hanzi.replace(/\s/g, ''));
  return glyphs.length === 1 ? glyphs[0]! : null;
}

/**
 * The Radical #N pill a one-character Vocabulary word carries: exactly the pill its own
 * Characters card shows (glyphPresentation `characterRadical` — canonical radicals such as
 * 八/心 and the simplified dual forms 门/马), so a word never names a radical its glyph card
 * does not. Multi-character words and phrases have none.
 */
export function wordRadicalNumber(hanzi: string): number | undefined {
  const glyph = singleGlyph(hanzi);
  return glyph ? glyphPresentation(glyph, 'Characters').characterRadical?.number : undefined;
}

/**
 * Identity ink for a Vocabulary record, following the glyph-card rule above: Traditional
 * purple wins, then a one-character word whose glyph is itself a sourced Kangxi radical
 * (八, 口, 门) wears the radical gold its Characters card wears. Everything else keeps the
 * default word colouring (''). Exact source identities only, never shape.
 */
export function wordInk(word: { hanzi: string; script?: LibraryEntry['script'] | undefined }): CardInk {
  if (word.script === 'Traditional') return 'is-traditional';
  const glyph = singleGlyph(word.hanzi);
  return glyph && radicalIdentity(glyph).radicals.length > 0 ? 'card-ink-radical' : '';
}

/**
 * Ink for a glyph detail title's single hanzi (Characters/Components): radical gold when the
 * glyph is a sourced Kangxi radical, matching its grid card. Traditional records keep their
 * own purple (RecordDetailTitle adds it), so this returns '' for them — Traditional wins, as
 * on the cards. Radicals detail titles have their own family/form ink in characters-page.tsx.
 */
export function glyphTitleInk(entry: Pick<LibraryEntry, 'hanzi' | 'radicalVariant' | 'kangxiIndex' | 'script'>, kind: LibraryKind): CardInk {
  if (entry.script === 'Traditional' || (kind !== 'Characters' && kind !== 'Components')) return '';
  return isRadicalGlyph(entry, kind) ? 'card-ink-radical' : '';
}
