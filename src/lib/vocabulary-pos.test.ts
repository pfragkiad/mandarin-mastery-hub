import { describe, expect, it } from 'vitest';
import { vocabularyData, entryToWord } from './data-contract';

describe('HSK spreadsheet parts of speech', () => {
  const l1 = vocabularyData.entries.filter(e => e.partOfSpeechSource?.sourceName === 'HSK3_Level1_300_Official_IDs_POS_Examples_Classified.xlsx');
  const l2 = vocabularyData.entries.filter(e => e.partOfSpeechSource?.sourceName === 'HSK3_Level2_200_Official_IDs_POS_Examples_Classified.xlsx');
  it('enriches all 300 HSK 1 and 200 HSK 2 entries without adding duplicates', () => {
    expect(l1).toHaveLength(300);
    expect(l2).toHaveLength(200);
    expect(vocabularyData.entries.filter(e => !e.phraseMetadata)).toHaveLength(505);
    expect(l1.every(e => e.hskLevel === 1 && e.hskVersion === '3.0' && e.partOfSpeechSource?.sourceId === String(e.hsk_index))).toBe(true);
    expect(l2.every(e => e.hskLevel === 2 && e.hskVersion === '3.0' && e.partOfSpeechSource?.sourceId === String(e.hsk_index))).toBe(true);
  });
  it.each([['爱', 'Verb'], ['八', 'Numeral'], ['爸爸', 'Noun'], ['半', 'Numeral / Adverb'], ['本', 'Measure word']])('adapts %s with its supplied classification', (hanzi, pos) => {
    const entry = l1.find(e => e.simplified === hanzi);
    if (!entry) throw new Error(`Missing imported entry: ${hanzi}`);
    expect(entryToWord(entry, vocabularyData.categories).type).toBe(pos);
  });
  it('uses the reuploaded Level 1 classifications for the six previously unclassified entries', () => {
    const expected: Record<string, string> = { 不客气: 'Polite expression', 打电话: 'Verb phrase', 没关系: 'Polite expression', 你好: 'Greeting expression', 下雨: 'Verb phrase', 做饭: 'Verb phrase' };
    for (const [hanzi, pos] of Object.entries(expected)) {
      expect(l1.find(e => e.simplified === hanzi)?.partOfSpeech).toBe(pos);
    }
  });
  it('adds Level 2 entries with POS, example sentences, and example pinyin', () => {
    const a = l2.find(e => e.simplified === '啊');
    expect(a?.partOfSpeech).toBe('Particle');
    expect(a?.examples[0]?.simplified).toBe('啊，原来是你！');
    expect(a?.examples[0]?.tokens.filter(t => t.kind === 'hanzi').every(t => t.pinyin)).toBe(true);
    expect(l2.every(e => e.examples[0]?.tokens.some(t => t.kind === 'hanzi' && t.pinyin))).toBe(true);
  });
});
