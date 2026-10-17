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
