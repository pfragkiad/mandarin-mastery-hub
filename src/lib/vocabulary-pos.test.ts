import { describe, expect, it } from 'vitest';
import { vocabularyData, entryToWord } from './data-contract';

describe('HSK 1 spreadsheet parts of speech', () => {
  const imported = vocabularyData.entries.filter(e => e.partOfSpeechSource?.sourceName === 'HSK3_Level1_300_Examples.xlsx');
  it('enriches all 300 matching HSK 1 entries without adding words', () => {
    expect(imported).toHaveLength(300);
    expect(vocabularyData.entries).toHaveLength(305);
    expect(imported.every(e => e.hskLevel === 1 && e.hskVersion === '3.0' && e.partOfSpeechSource?.sourceId === String(e.hsk_index))).toBe(true);
  });
  it.each([['爱', 'Verb'], ['八', 'Numeral'], ['爸爸', 'Noun'], ['半', 'Numeral / Adverb'], ['本', 'Measure word']])('adapts %s with its supplied classification', (hanzi, pos) => {
    const entry = imported.find(e => e.simplified === hanzi);
    if (!entry) throw new Error(`Missing imported entry: ${hanzi}`);
    expect(entryToWord(entry, vocabularyData.categories).type).toBe(pos);
  });
  it('retains the six explicitly unclassified syllabus entries instead of guessing', () => {
    expect(imported.filter(e => e.partOfSpeech === 'Not specified in syllabus').map(e => e.simplified).sort()).toEqual(['不客气', '打电话', '没关系', '你好', '下雨', '做饭'].sort());
  });
});