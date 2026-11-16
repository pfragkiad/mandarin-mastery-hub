import { describe, expect, it } from 'vitest';
import { vocabularyData } from './data-contract';
import { vocabularyKind, words } from './mandarin';

describe('Full Level 1 replacement', () => {
  it('removes all unofficial Level 1 phrase records and their orphan collections', () => {
    expect(vocabularyData.entries.filter(e => e.hskLevel === 1)).toHaveLength(300);
    expect(vocabularyData.entries.some(e => e.phraseMetadata || (e.hskLevel === 1 && e.entryKind === 'phrase'))).toBe(false);
    expect(vocabularyData.categories.some(c => c.name.includes('L1 practice phrases'))).toBe(false);
  });
  it('keeps the four Level 2 phrases and the unclassified phrase', () => {
    const phrases = vocabularyData.entries.filter(e => e.entryKind === 'phrase');
    expect(phrases).toHaveLength(5);
    expect(phrases.filter(e => e.hskLevel === 2).map(e => e.simplified)).toEqual(['不好意思', '没意思', '为什么', '有意思']);
    expect(phrases.find(e => e.hskLevel == null)?.id).toBe('63c1c762-a714-4778-a662-718f2872c8ef');
  });
  it('keeps the greeting headword as its exact word record', () => {
    const greeting = words.find(w => w.hanzi === '你好')!;
    expect(vocabularyKind(greeting)).toBe('word');
    expect(words.some(w => w.hanzi === '你好！')).toBe(false);
  });
});
