import { describe, expect, it } from 'vitest';
import { vocabularyData, entryToWord } from './data-contract';

describe('HSK recorded parts of speech', () => {
  const l1 = vocabularyData.entries.filter(e => e.partOfSpeechSource?.sourceName === 'hsk3_level1_1.6.1.json');
  const l2 = vocabularyData.entries.filter(e => e.partOfSpeechSource?.sourceName === 'hsk3_level2_1.0.3.json');
  it('enriches all 300 HSK 1 and 200 HSK 2 entries without adding duplicates', () => {
    expect(l1).toHaveLength(300);
    expect(l2).toHaveLength(200);
    expect(vocabularyData.entries.filter(e => !e.phraseMetadata)).toHaveLength(2001);
    expect(l1.every(e => e.hskLevel === 1 && e.hskVersion === '3.0' && e.partOfSpeechSource?.sourceId === String(e.hsk_index))).toBe(true);
    expect(l2.every(e => e.hskLevel === 2 && e.hskVersion === '3.0' && e.partOfSpeechSource?.sourceId === String(e.hsk_index))).toBe(true);
  });
  it.each([['爱', 'Verb'], ['八', 'Numeral'], ['爸爸', 'Noun'], ['半', 'Numeral / Adverb'], ['本', 'Classifier / Measure Word']])('adapts %s with its supplied classification', (hanzi, pos) => {
    const entry = l1.find(e => e.simplified === hanzi);
    if (!entry) throw new Error(`Missing imported entry: ${hanzi}`);
    expect(entryToWord(entry, vocabularyData.categories).type).toBe(pos);
  });
  it('uses the new taxonomy for fixed expressions and verb phrases', () => {
    const expected: Record<string, string> = { 不客气: 'Fixed Expression', 打电话: 'Verb', 没关系: 'Fixed Expression', 你好: 'Fixed Expression', 下雨: 'Verb', 做饭: 'Verb' };
    for (const [hanzi, pos] of Object.entries(expected)) {
      expect(l1.find(e => e.simplified === hanzi)?.partOfSpeech).toBe(pos);
    }
  });
  it('adds Level 2 entries with POS, example sentences, and example pinyin', () => {
    const a = l2.find(e => e.simplified === '啊');
    expect(a?.partOfSpeech).toBe('Particle');
    expect(a?.examples[0]?.simplified).toBe('你来了啊！');
    expect(a?.examples[0]?.tokens.filter(t => t.kind === 'hanzi').every(t => t.pinyin)).toBe(true);
    expect(l2.every(e => e.examples[0]?.tokens.some(t => t.kind === 'hanzi' && t.pinyin))).toBe(true);
  });
});
