import { describe, expect, it } from 'vitest';
import { words, vocabularyKind } from './mandarin';
import { vocabularyPage } from './vocabulary-page';

describe('vocabulary pagination', () => {
  const wordEntries = words.filter(word => vocabularyKind(word) === 'word');
  const phraseEntries = words.filter(word => vocabularyKind(word) === 'phrase');
  it('bounds word pages to 24 entries without overlaps', () => {
    const first = vocabularyPage(wordEntries, 'word', 1);
    const second = vocabularyPage(wordEntries, 'word', 2);
    expect(first.entries).toEqual(wordEntries.slice(0, 24));
    expect(second.entries).toEqual(wordEntries.slice(24, 48));
  });
  it('uses smaller pages for wider phrase cards', () => {
    expect(vocabularyPage(phraseEntries, 'phrase', 2).entries).toEqual(phraseEntries.slice(8, 16));
  });
  it('opens the page containing an exact dictionary selection', () => {
    const target = wordEntries[70];
    if (!target) throw new Error('Missing imported word');
    const page = vocabularyPage(wordEntries, 'word', undefined, target.id);
    expect(page.current).toBe(3);
    expect(page.entries).toContain(target);
  });
  it('clamps invalid pages and handles empty filtered results', () => {
    expect(vocabularyPage(wordEntries, 'word', -2).current).toBe(1);
    expect(vocabularyPage(wordEntries, 'word', Infinity).current).toBe(1);
    expect(vocabularyPage(wordEntries.slice(0, 2), 'word', 100).current).toBe(1);
    expect(vocabularyPage([], 'phrase', 4)).toMatchObject({ current: 1, pages: 1, entries: [] });
  });
  for (const kind of ['word', 'phrase'] as const) {
    it(`keeps a selected ${kind} visible despite an outdated explicit page`, () => {
      const entries = kind === 'word' ? wordEntries : phraseEntries;
      const target = entries[70];
      if (!target) throw new Error('Missing imported entry');
      expect(vocabularyPage(entries, kind, 1, target.id).entries).toContain(target);
    });
  }
});