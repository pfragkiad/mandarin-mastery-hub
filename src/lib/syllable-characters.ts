// Characters for one Pinyin syllable + tone (the Sound chart's "In a character" list).
// Matching is exact on the catalogue's recorded readings only: "nai3" matches 奶 (nǎi)
// but never 耐 (nài) or a reading that merely contains "nai"; tone 5 matches readings
// recorded without a tone mark (吗 ma, 了 le). Multi-reading rows (e.g. "bǐ / bì")
// match each listed reading on its own. Nothing is inferred from the glyph or a word.
import { filterLibrary, LIBRARY_PAGE_SIZE, type LibraryEntry } from './character-library';
import type { Tone } from './pinyin-guide';

/** Characters-tab entries reading exactly `base` in `tone`, most used first (supplied corpus ranks). */
export function syllableCharacters(entries: LibraryEntry[], base: string, tone: Tone, includeTraditional = false): LibraryEntry[] {
  return filterLibrary(entries, `${base}${tone}`, '', false, includeTraditional, undefined, undefined, true, true);
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
