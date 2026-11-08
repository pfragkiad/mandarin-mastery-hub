// Characters for one Pinyin syllable + tone (the Sound chart's "In a character" list).
// Matching is exact on the catalogue's recorded readings only: "nai3" matches 奶 (nǎi)
// but never 耐 (nài) or a reading that merely contains "nai"; tone 5 matches readings
// recorded without a tone mark (吗 ma, 了 le). Multi-reading rows (e.g. "bǐ / bì")
// match each listed reading on its own. Nothing is inferred from the glyph or a word.
import { filterLibrary, LIBRARY_PAGE_SIZE, type LibraryEntry } from './character-library';
import type { Tone } from './pinyin-guide';
import { radicalIdentity } from './radical-identities';
import { radicalFamily } from './radical-strokes';

/** Characters-tab entries reading exactly `base` in `tone`, most used first (supplied corpus ranks). */
export function syllableCharacters(entries: LibraryEntry[], base: string, tone: Tone, includeTraditional = false): LibraryEntry[] {
  return filterLibrary(entries, `${base}${tone}`, '', false, includeTraditional, undefined, undefined, true, true);
}

export type RadicalCardSearch = { tab: 'Radicals'; id: string; page?: number; variant?: string };

/** Resolver from a character to its radical card, so a character that is itself a Kangxi
 *  radical opens the Radicals tab instead of Characters. Resolution, exact only:
 *  1. a radical card whose own glyph is this character (丿 → card 丿);
 *  2. otherwise one unique sourced Kangxi identity (马 → #187), opening that family's card
 *     with the variant selected when exactly one recorded family form is this character
 *     (duplicate forms keep the heading, never a guessed one).
 *  Anything else returns undefined and the caller keeps the Characters link. */
export function radicalDestinations(radicalEntries: LibraryEntry[], includeTraditional = false) {
  const visible = filterLibrary(radicalEntries, '', '', false, includeTraditional);
  const byGlyph = new Map<string, RadicalCardSearch>();
  const byNumber = new Map<number, RadicalCardSearch>();
  visible.forEach((entry, index) => {
    const page = Math.floor(index / LIBRARY_PAGE_SIZE) + 1;
    const search: RadicalCardSearch = { tab: 'Radicals', id: entry.id, ...(page > 1 ? { page } : {}) };
    if (!byGlyph.has(entry.hanzi)) byGlyph.set(entry.hanzi, search);
    if (entry.kangxiIndex && !byNumber.has(entry.kangxiIndex)) byNumber.set(entry.kangxiIndex, search);
  });
  return (glyph: string): RadicalCardSearch | undefined => {
    const radicals = radicalIdentity(glyph).radicals;
    if (!radicals.length) return undefined;
    const exact = byGlyph.get(glyph);
    if (exact) return exact;
    const only = radicals.length === 1 ? radicals[0] : undefined;
    const heading = only ? byNumber.get(only.number) : undefined;
    if (!only || !heading) return undefined;
    const forms = radicalFamily(only.number)?.forms.filter(form => form.character === glyph) ?? [];
    return forms.length === 1 && forms[0] ? { ...heading, variant: forms[0].key } : heading;
  };
}

/** Characters-tab URL search for every visible entry (exact record ID plus its grid page), built once per list. */
export function characterDestinations(entries: LibraryEntry[], includeTraditional = false) {
  const visible = filterLibrary(entries, '', '', false, includeTraditional);
  const out = new Map<string, { tab: 'Characters'; id: string; page?: number }>();
  visible.forEach((entry, index) => {
    const page = Math.floor(index / LIBRARY_PAGE_SIZE) + 1;
    out.set(entry.id, { tab: 'Characters', id: entry.id, ...(page > 1 ? { page } : {}) });
  });
  return out;
}
