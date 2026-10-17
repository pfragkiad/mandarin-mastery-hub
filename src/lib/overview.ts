import { vocabularyKind, type Word } from './mandarin';
import { filterLibrary, LIBRARY_PAGE_SIZE, type LibraryEntry } from './character-library';

/** Pick from real word records, excluding the previous pick when possible. Traditional forms are never chosen at random. */
export function randomOverviewWord(items: Word[], previousId?: string, random = Math.random): Word | undefined {
  const words = items.filter(word => vocabularyKind(word) === 'word' && word.script !== 'Traditional');
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

export function overviewCharacterDestination(entry: LibraryEntry, entries: LibraryEntry[], includeTraditional = false, tab: 'Characters' | 'Components' = 'Characters') {
  const visible = filterLibrary(entries, '', '', false, includeTraditional);
  const index = visible.findIndex(candidate => candidate.id === entry.id);
  const page = index < 0 ? 1 : Math.floor(index / LIBRARY_PAGE_SIZE) + 1;
  return { tab, id: entry.id, ...(page > 1 ? { page } : {}) };
}