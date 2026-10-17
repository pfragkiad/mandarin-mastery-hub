import { describe, expect, it } from 'vitest';
import { words } from './mandarin';
import { phraseParts, wordCharacters } from './vocabulary-decomposition';

describe('vocabulary decomposition', () => {
  it('preserves repeated characters and their contextual readings in 爸爸', () => {
    const word = words.find(item => item.hanzi === '爸爸');
    if (!word) throw new Error('Missing 爸爸');
    expect(wordCharacters(word)).toEqual([{ text: '爸', pinyin: 'bà' }, { text: '爸', pinyin: 'ba' }]);
  });
  it('matches phrase words to real records while retaining punctuation', () => {
    const phrase = words.find(item => item.hanzi === '你好！');
    if (!phrase) throw new Error('Missing 你好！');
    const parts = phraseParts(phrase, words);
    expect(parts.map(part => part.text).join('')).toBe('你好！');
    expect(parts.filter(part => part.word).map(part => part.word?.hanzi)).toEqual(['你好']);
    expect(parts.at(-1)).toEqual({ text: '！' });
  });
  it('never presents unknown text as a vocabulary record', () => {
    const phrase = { ...words[0], id: 'unknown', hanzi: '龘！' };
    if (!phrase.pinyin) throw new Error('Missing fixture');
    expect(phraseParts(phrase as typeof words[number], words)).toEqual([{ text: '龘' }, { text: '！' }]);
  });
});