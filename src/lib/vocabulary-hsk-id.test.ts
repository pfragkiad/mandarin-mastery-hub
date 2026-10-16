import { describe, expect, it } from 'vitest';
import { vocabularyData, entryToWord, fixtureEntries, fixtureCategories } from './data-contract';
import { words } from './mandarin';

describe('Official HSK syllabus id on word cards', () => {
  it('carries the official id exactly when the entry records one', () => {
    const adapted = vocabularyData.entries.map(e => entryToWord(e, vocabularyData.categories));
    expect(adapted.every(w => w.hskId === (vocabularyData.entries.find(e => e.id === w.id)?.hsk_index ?? null))).toBe(true);
    expect(adapted.filter(w => w.hskId != null)).toHaveLength(500);
    // Entries without an official id must stay empty, never show a placeholder.
    expect(adapted.filter(w => w.hskId == null)).toHaveLength(245);
    expect(words.every(w => w.hskId === (w.entry?.hsk_index ?? null))).toBe(true);
  });
  it('keeps the id a positive syllabus index and the fixture id intact', () => {
    expect(words.filter(w => w.hskId != null).every(w => w.hskId! > 0)).toBe(true);
    expect(entryToWord(fixtureEntries[0]!, fixtureCategories).hskId).toBe(289);
  });
});
