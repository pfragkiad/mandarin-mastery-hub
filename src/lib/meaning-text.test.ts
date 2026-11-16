import { describe, expect, it } from 'vitest';
import { meaningParts, trimTranslationPeriod } from '@/components/tutor/meaning-text';

describe('meaningParts', () => {
  it('italicizes parenthesised spans and keeps surrounding text', () => {
    const parts = meaningParts('friend (also companion) warmth');
    expect(parts).toEqual(['friend ', '(also companion)', ' warmth']);
    expect((parts[1] ?? '').startsWith('(')).toBe(true);
  });

  it('still splits component form descriptions', () => {
    const parts = meaningParts('Component form of 爪 friend');
    expect(parts[1]).toMatch(/^component form of/i);
  });

  it('treats text without parentheses or descriptions as a single part', () => {
    expect(meaningParts('friend, companion; fraternity')).toEqual(['friend, companion; fraternity']);
  });
});

describe('trimTranslationPeriod', () => {
  it('drops one trailing period from a translation', () => {
    expect(trimTranslationPeriod('King, ruler, surname.')).toBe('King, ruler, surname');
    expect(trimTranslationPeriod('Kunlun mountains in Jiangsu province.')).toBe('Kunlun mountains in Jiangsu province');
  });

  it('keeps abbreviations and ellipses intact', () => {
    expect(trimTranslationPeriod('divide; small unit of time etc.')).toBe('divide; small unit of time etc.');
    expect(trimTranslationPeriod('exceed, go beyond; the more ...')).toBe('exceed, go beyond; the more ...');
  });

  it('leaves translations without a final period unchanged', () => {
    expect(trimTranslationPeriod('jade; precious stone')).toBe('jade; precious stone');
  });
});

describe('sentence phrase translations', () => {
  // The keep-the-period rule covers translations of entries whose Chinese ends with
  // sentence punctuation (我姓王。). The current HSK 1 revision has no such entry, so
  // this iterates whatever the data holds: any qualifying translation must keep its
  // period, and the same text without a qualifying entry must trim.
  it('keeps the period exactly for translations of sentence-punctuation entries', () => {
    const sentenceEntries = vocabularyData.entries.filter(entry => /[。！？.!?]$/.test(entry.simplified.trim()));
    for (const entry of sentenceEntries) {
      for (const meaning of entry.meanings) {
        const text = meaning.trim();
        expect(trimTranslationPeriod(text)).toBe(text);
      }
    }
    expect(trimTranslationPeriod('My surname is Wang.')).toBe('My surname is Wang');
  });
});
