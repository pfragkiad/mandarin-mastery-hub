import { describe, expect, it } from 'vitest';
import { entryToWord, vocabularyData } from './data-contract';
import { filterWords, vocabularyKind, words } from './mandarin';

describe('Unofficial Level 1 phrase import', () => {
  const phrases = vocabularyData.entries.filter(e => e.phraseMetadata);
  it('imports all 240 unique internal phrase IDs exactly once', () => {
    expect(phrases).toHaveLength(240);
    expect(new Set(phrases.map(e => e.id)).size).toBe(240);
    expect(phrases.map(e => e.phraseMetadata?.internalId)).toEqual(
      Array.from({ length: 240 }, (_, index) => `L1-P${String(index + 1).padStart(3, '0')}`),
    );
  });
  it('never treats internal phrase IDs or vocabulary matches as official HSK IDs', () => {
    for (const entry of phrases) {
      expect(entry.hsk_index).toBeNull();
      expect(entry.hskSource).toBeNull();
      expect(entry.sourceId).toBeNull();
      expect(entryToWord(entry, vocabularyData.categories).hskId).toBeNull();
    }
    expect(phrases[0]?.phraseMetadata?.matchedVocabularyIds).toEqual([71, 146, 147]);
  });
  it('classifies every supplied entry as a Level 1 phrase', () => {
    for (const entry of phrases) {
      expect(entry.entryKind).toBe('phrase');
      expect(entry.hskLevel).toBe(1);
      expect(entry.hskVersion).toBe('3.0');
      expect(vocabularyKind(entryToWord(entry, vocabularyData.categories))).toBe('phrase');
    }
  });
  it('retains pinyin and translations without inventing recordings or character readings', () => {
    expect(phrases[0]?.simplified).toBe('你好！');
    expect(phrases[0]?.pinyinDisplay).toBe('Nǐ hǎo!');
    expect(phrases[0]?.meanings).toEqual(['Hello!']);
    expect(phrases[239]?.pinyinDisplay).toBe('Wǒ xǐhuan gǒu, yě xǐhuan māo.');
    for (const entry of phrases) {
      expect(entry.audio).toBeNull();
      expect(entry.pinyinDisplay).not.toMatch(/[。？！]/);
      expect(entry.tokens.map(t => t.text).join('')).toBe(entry.simplified);
    }
    expect(filterWords(words, 'ni hao').map(w => w.hanzi)).toContain('你好！');
  });
  it('retains twelve topics with twenty phrases each and editorial provenance', () => {
    const counts = new Map<string | null, number>();
    for (const entry of phrases) counts.set(entry.categoryId, (counts.get(entry.categoryId) ?? 0) + 1);
    expect(counts.size).toBe(12);
    expect([...counts.values()]).toEqual(Array(12).fill(20));
    expect(phrases.find(e => e.phraseMetadata?.reviewNotes?.includes('欢迎'))?.contentStatus).toBe('draft');
    expect(phrases.every(e => e.secondarySources?.[0]?.sourceName === 'HSK3_Level1_240_Phrases_Pinyin_Translations.xlsx')).toBe(true);
  });
});