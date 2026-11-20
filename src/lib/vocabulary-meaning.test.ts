import { describe, expect, it } from 'vitest';
import { characterMeaning, vocabularyLedMeaning } from './vocabulary-meaning';

describe('vocabulary-led character translations', () => {
  it('puts the same-glyph vocabulary translation before the character translation (和)', () => {
    expect(characterMeaning('和', 'hé', 'harmony, peace; peaceful, calm')).toBe('and; with; harmony, peace; peaceful, calm');
  });
  it('removes character meanings the vocabulary already gives (爱, 八)', () => {
    expect(vocabularyLedMeaning('爱', 'ài', 'love, be fond of, like', [{ pinyin: 'ài', meaning: 'love; like' }])).toBe('love; like; be fond of');
    expect(vocabularyLedMeaning('八', 'bā', 'eight; all around, all sides', [{ pinyin: 'bā', meaning: 'eight' }])).toBe('eight; all around, all sides');
  });
  it('leaves an identical translation unchanged', () => {
    expect(vocabularyLedMeaning('x', 'a', 'same', [{ pinyin: 'a', meaning: 'same' }])).toBe('same');
  });
  it('never fronts a word read differently from the card', () => {
    expect(vocabularyLedMeaning('长', 'zhǎng', 'grow; chief', [{ pinyin: 'cháng', meaning: 'long' }])).toBe('grow; chief');
  });
});
