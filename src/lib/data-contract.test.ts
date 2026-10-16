import { describe, it, expect } from 'vitest';
import { entryToWord, fixtureEntries, fixtureCategories, posLabel, levelLabel, vocabularyData } from './data-contract';
describe('Entry adapter', () => {
  const w = entryToWord(fixtureEntries[0]!, fixtureCategories);
  it('keeps the server UUID as identity', () => { expect(w.id).toBe('5b1d3c2a-0000-4000-8000-000000000289'); });
  it('shows a missing part of speech as Unspecified', () => { expect(w.type).toBe('Unspecified'); expect(posLabel(null)).toBe('Unspecified'); });
  it('formats a versioned HSK level and Unclassified', () => { expect(w.level).toBe('HSK 3.0 · 1'); expect(levelLabel({ hskLevel: null, hskVersion: null })).toBe('Unclassified'); });
  it('does not invent an example from the headword', () => { expect(w.sentence).toBe(''); });
  it('renders sentence punctuation with Latin equivalents, not Chinese full stops', () => {
    const withExample = vocabularyData.entries.filter(e => e.examples[0]?.tokens.some(tok => tok.text === '。'));
    expect(withExample.length).toBeGreaterThan(0);
    for (const e of withExample.slice(0, 50)) {
      const pinyin = entryToWord(e, vocabularyData.categories).sentencePinyin;
      expect(pinyin, `${e.simplified} pinyin "${pinyin}"`).not.toMatch(/[。！？，、；：]/);
      expect(pinyin.endsWith('.')).toBe(true);
    }
  });
});
