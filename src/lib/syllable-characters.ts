// Characters for one Pinyin syllable + tone (the Sound chart's "In a character" list).
// Matching is exact on the catalogue's recorded readings only: "nai3" matches 奶 (nǎi)
// but never 耐 (nài) or a reading that merely contains "nai"; tone 5 matches readings
// recorded without a tone mark (吗 ma, 了 le). Multi-reading rows (e.g. "bǐ / bì")
// match each listed reading on its own. Nothing is inferred from the glyph or a word.
import { filterLibrary, LIBRARY_PAGE_SIZE, type LibraryEntry } from './character-library';
import type { Tone } from './pinyin-guide';
import { radicalIdentity } from './radical-identities';
import { radicalFamily } from './radical-strokes';
import { scriptGroup, scriptHead } from './character-variants';

/** One "In a character" row: a single record, or simplified + traditional forms shown together. */
export type SyllableRow<T> = { key: string; forms: T[] };

/** Group listed forms into shared rows only when (a) they belong to the same ordinary
 *  simplified ↔ traditional card group (scriptHead — context-dependent pairs such as
 *  了 ↔ 瞭 are never in one, see character-variants.ts), (b) every form is itself in the
 *  list, i.e. records this exact syllable + tone, and (c) their recorded meanings for this
 *  reading are identical. Anything else (郁 / 鬱 with different senses) stays its own row,
 *  so a partial or different-sense correspondence is never presented as one word.
 *  A row sits at its best-listed member's position; forms keep script-group order
 *  (simplified first) and each keeps its own record, link and rank. */
export function groupScriptForms<T extends { id: string; hanzi: string }>(rows: T[], meaning: (row: T) => string, head: (glyph: string) => string = scriptHead, order: (glyph: string) => string[] = scriptGroup): SyllableRow<T>[] {
  const keyOf = (row: T) => `${head(row.hanzi)}\u0000${meaning(row).trim()}`;
  const byKey = new Map<string, T[]>();
  for (const row of rows) byKey.set(keyOf(row), [...(byKey.get(keyOf(row)) ?? []), row]);
  const out: SyllableRow<T>[] = [];
  const done = new Set<string>();
  for (const row of rows) {
    const key = keyOf(row);
    if (done.has(key)) continue;
    done.add(key);
    const members = byKey.get(key)!;
    const position = order(row.hanzi);
    const forms = members.length > 1 ? [...members].sort((a, b) => position.indexOf(a.hanzi) - position.indexOf(b.hanzi)) : members;
    out.push({ key: forms.map(form => form.id).join('|'), forms });
  }
  return out;
}

/** Characters-tab entries reading exactly `base` in `tone`, most used first (supplied corpus ranks). */
export function syllableCharacters(entries: LibraryEntry[], base: string, tone: Tone, includeTraditional = false): LibraryEntry[] {
  return filterLibrary(entries, `${base}${tone}`, '', false, includeTraditional, undefined, undefined, true, true);
}

export type RadicalCardSearch = { tab: 'Radicals'; id: string; page?: number; variant?: string };
type RadicalCard = { search: RadicalCardSearch; entry: LibraryEntry };

/** Sound-card order: characters that resolve to a radical card come first (by the radical
 *  family's own supplied rank, unranked radicals after ranked ones), then ordinary
 *  characters in their existing order. Stable, so equal ranks keep catalogue order. */
export function radicalsFirst<T>(rows: T[], radicalRank: (row: T) => number | null | undefined): T[] {
  const key = (row: T) => { const rank = radicalRank(row); return rank === undefined ? 2 : rank === null ? 1 : 0; };
  return [...rows].sort((a, b) => key(a) - key(b) || (key(a) === 0 ? (radicalRank(a) as number) - (radicalRank(b) as number) : 0));
}

/** Resolver from a character to its radical card, so a character that is itself a Kangxi
 *  radical opens the Radicals tab instead of Characters. Resolution, exact only:
 *  1. a radical card whose own glyph is this character (丿 → card 丿);
 *  2. otherwise one unique sourced Kangxi identity (马 → #187), opening that family's card
 *     with the variant selected when exactly one recorded family form is this character
 *     (duplicate forms keep the heading, never a guessed one).
 *  Anything else returns undefined and the caller keeps the Characters link. */
export function radicalDestinations(radicalEntries: LibraryEntry[], includeTraditional = false) {
  const visible = filterLibrary(radicalEntries, '', '', false, includeTraditional);
  const byGlyph = new Map<string, RadicalCard>();
  const byNumber = new Map<number, RadicalCard>();
  visible.forEach((entry, index) => {
    const page = Math.floor(index / LIBRARY_PAGE_SIZE) + 1;
    const card: RadicalCard = { search: { tab: 'Radicals', id: entry.id, ...(page > 1 ? { page } : {}) }, entry };
    if (!byGlyph.has(entry.hanzi)) byGlyph.set(entry.hanzi, card);
    if (entry.kangxiIndex && !byNumber.has(entry.kangxiIndex)) byNumber.set(entry.kangxiIndex, card);
  });
  // Returns the radical card's URL search plus its entry (whose family index gives the rank).
  return (glyph: string): RadicalCard | undefined => {
    const radicals = radicalIdentity(glyph).radicals;
    if (!radicals.length) return undefined;
    const exact = byGlyph.get(glyph);
    if (exact) return exact;
    const only = radicals.length === 1 ? radicals[0] : undefined;
    const heading = only ? byNumber.get(only.number) : undefined;
    if (!only || !heading) return undefined;
    const forms = radicalFamily(only.number)?.forms.filter(form => form.character === glyph) ?? [];
    return forms.length === 1 && forms[0] ? { ...heading, search: { ...heading.search, variant: forms[0].key } } : heading;
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
