import { pinyinNumbered } from './pinyin-tones';
export type LibrarySort = 'rank' | 'pinyin' | 'hsk' | 'random';
export function shuffleSeed(value: unknown): number | undefined {
  const seed = Number(value);
  return Number.isInteger(seed) && seed > 0 && seed <= 0xffffffff ? seed : undefined;
}
export function newShuffleSeed(previous = 1): number {
  const seed = Math.floor(Math.random() * 0xffffffff) + 1;
  return seed === previous ? (seed % 0xffffffff) + 1 : seed;
}
/** Each exact card ID gets a seeded random whole-deck position. Filtering only
 * removes positions, so pages and history never re-deal surviving cards. */
function randomPosition(id: string, seed: number) {
  let value = (2166136261 ^ seed) >>> 0;
  for (let index = 0; index < id.length; index++) value = Math.imul(value ^ id.charCodeAt(index), 16777619) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  return (value ^ (value >>> 16)) >>> 0;
}
function readingKey(reading: string) {
  const first = reading.split(/[,/;]/)[0]?.trim().normalize('NFC') ?? '';
  const numbered = pinyinNumbered(first);
  return { base: numbered.replace(/[1-5]/g, ''), tones: numbered.replace(/[^1-5]/g, '') };
}
/** Presentation-only ordering of whole grouped cards, never mutating source rows.
 * Rank keeps the caller's recorded frequency order; missing ranks are not inferred. */
export function orderLibrary<T extends { id: string; pinyin: string }>(entries: readonly T[], sort: LibrarySort = 'rank', seed = 1, hskIndex?: (entry: T) => number | null | undefined): T[] {
  if (sort === 'rank') return [...entries];
  const keyed = entries.map(entry => ({ entry, random: sort === 'random' ? randomPosition(entry.id, seed) : 0, reading: sort === 'pinyin' ? readingKey(entry.pinyin) : { base: '', tones: '' } }));
  keyed.sort((a, b) => {
    const difference = sort === 'random' ? a.random - b.random : sort === 'hsk' ? (hskIndex?.(a.entry) ?? Infinity) - (hskIndex?.(b.entry) ?? Infinity) : Number(!a.reading.base) - Number(!b.reading.base) || a.reading.base.localeCompare(b.reading.base, 'en') || a.reading.tones.localeCompare(b.reading.tones, 'en');
    return difference || a.entry.id.localeCompare(b.entry.id, 'en');
  });
  return keyed.map(item => item.entry);
}

/** Vocabulary's default: recorded HSK entries alphabetically, followed by non-HSK
 * entries in their existing source order. Explicit options order the whole pool. */
export function orderVocabulary<T extends { id: string; pinyin: string; hskId?: number | null }>(entries: readonly T[], sort: LibrarySort = 'rank', seed = 1): T[] {
  if (sort !== 'rank') return orderLibrary(entries, sort, seed, entry => entry.hskId);
  const hsk = entries.filter(entry => entry.hskId != null);
  const nonHsk = entries.filter(entry => entry.hskId == null);
  return [...orderLibrary(hsk, 'pinyin'), ...nonHsk];
}
