import type { Word } from './mandarin';

export const VOCABULARY_PAGE_SIZES = { word: 24, phrase: 8 } as const;

export function vocabularyPage(entries: Word[], kind: 'word' | 'phrase', requestedPage?: number, selectedId = '') {
  const size = VOCABULARY_PAGE_SIZES[kind];
  const pages = Math.max(1, Math.ceil(entries.length / size));
  const selectedIndex = entries.findIndex(entry => entry.id === selectedId);
  const target = selectedIndex >= 0 ? Math.floor(selectedIndex / size) + 1 : requestedPage ?? 1;
  const current = Math.max(1, Math.min(pages, Number.isFinite(target) ? Math.floor(target) : 1));
  return { entries: entries.slice((current - 1) * size, current * size), current, pages, size };
}