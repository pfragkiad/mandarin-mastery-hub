import { vocabularyKind, type Word } from './mandarin';

/** Pick from real word records, excluding the previous pick when possible. */
export function randomOverviewWord(items: Word[], previousId?: string, random = Math.random): Word | undefined {
  const words = items.filter(word => vocabularyKind(word) === 'word');
  const alternatives = words.filter(word => word.id !== previousId);
  const pool = alternatives.length ? alternatives : words;
  return pool[Math.floor(random() * pool.length)];
}

export function overviewWordDestination(word: Word) {
  return { word: word.id, tab: vocabularyKind(word) };
}