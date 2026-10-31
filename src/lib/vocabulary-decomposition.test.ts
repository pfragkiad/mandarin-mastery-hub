import { describe, expect, it } from 'vitest';
import { words } from './mandarin';
import { phraseParts, wordCharacters } from './vocabulary-decomposition';

describe('vocabulary decomposition', () => {
  it('does not offer the disputed recording for neutral-tone 了 in 我受够了', () => {
    const phrase = words.find(item => item.hanzi === '我受够了');
    if (!phrase) throw new Error('Missing 我受够了');
    const particle = phraseParts(phrase, words).find(part => part.text === '了')?.word;
    expect(particle?.id).toBe('4acf54bb-a35e-41cf-8844-51c11d4af89f');
    expect(particle?.pinyin).toBe('le');
    expect(particle?.audio).toBeNull();
  });
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