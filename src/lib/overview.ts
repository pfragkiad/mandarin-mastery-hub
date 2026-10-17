import { vocabularyKind, type Word } from './mandarin';
import { filterLibrary, LIBRARY_PAGE_SIZE, type LibraryEntry, type LibraryKind } from './character-library';

/** Pick a real vocabulary record of the given kind, excluding the previous pick when possible. Traditional forms are never chosen at random. */
export function randomOverviewWord(items: Word[], previousId?: string, random = Math.random, kind: 'word' | 'phrase' = 'word'): Word | undefined {
  const words = items.filter(word => vocabularyKind(word) === kind && word.script !== 'Traditional');
  const alternatives = words.filter(word => word.id !== previousId);
  const pool = alternatives.length ? alternatives : words;
  return pool[Math.floor(random() * pool.length)];
}

export function overviewWordDestination(word: Word) {
  return { word: word.id, tab: vocabularyKind(word) };
}

/** Pick a real library record at random. Traditional forms are never chosen at random. */
export function randomOverviewCharacter(entries: LibraryEntry[], previousId?: string, random = Math.random) {
  const visible = filterLibrary(entries, '', '', false, false);
  const alternatives = visible.filter(entry => entry.id !== previousId);
  const pool = alternatives.length ? alternatives : visible;
  return pool[Math.floor(random() * pool.length)];
}

export function overviewCharacterDestination(entry: LibraryEntry, entries: LibraryEntry[], includeTraditional = false, tab: LibraryKind = 'Characters') {
  const visible = filterLibrary(entries, '', '', false, includeTraditional);
  const index = visible.findIndex(candidate => candidate.id === entry.id);
  const page = index < 0 ? 1 : Math.floor(index / LIBRARY_PAGE_SIZE) + 1;
  return { tab, id: entry.id, ...(page > 1 ? { page } : {}) };
}

/** Day number in the learner's local calendar, so everyone sees the same pick on a given date. */
export function localDayNumber(date: Date) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

/** Character of the day: a real simplified catalogue character that appears in imported vocabulary, chosen deterministically by date. */
export function dailyCharacter(entries: LibraryEntry[], vocabulary: Word[], date: Date) {
  const used = new Set(vocabulary.filter(word => word.script !== 'Traditional').flatMap(word => Array.from(word.hanzi)));
  const pool = filterLibrary(entries, '', '', false, false).filter(entry => used.has(entry.hanzi) && entry.pinyin && entry.meaning);
  const fallback = pool.length ? pool : filterLibrary(entries, '', '', false, false);
  if (!fallback.length) return undefined;
  const day = localDayNumber(date);
  return fallback[((day * 2654435761) >>> 0) % fallback.length];
}

export function greeting(hour: number) {
  if (hour >= 5 && hour < 12) return { hanzi: '早上好', pinyin: 'zǎoshang hǎo', english: 'Good morning' };
  if (hour >= 12 && hour < 18) return { hanzi: '下午好', pinyin: 'xiàwǔ hǎo', english: 'Good afternoon' };
  return { hanzi: '晚上好', pinyin: 'wǎnshang hǎo', english: 'Good evening' };
}
