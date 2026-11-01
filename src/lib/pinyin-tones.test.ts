import { describe, expect, it } from 'vitest';
import { pinyinNumbered, pinyinReadingMatches } from './pinyin-tones';

describe('pinyinNumbered', () => {
  it('converts tone marks to trailing digits', () => {
    expect(pinyinNumbered('shī')).toBe('shi1');
    expect(pinyinNumbered('Zhōngguó')).toBe('zhong1guo2');
    expect(pinyinNumbered('nǐ hǎo')).toBe('ni3hao3');
    expect(pinyinNumbered('nǚ')).toBe('nü3');
  });
  it('marks neutral syllables with 5', () => {
    expect(pinyinNumbered('yìsi')).toBe('yi4si5');
  });
});

describe('pinyinReadingMatches', () => {
  it('exact mode accepts tone numbers and rejects other tones', () => {
    expect(pinyinReadingMatches('shī', 'shi1', true)).toBe(true);
    expect(pinyinReadingMatches('shí', 'shi1', true)).toBe(false);
    expect(pinyinReadingMatches('shì', 'shi1', true)).toBe(false);
  });
  it('exact mode still accepts tone-less queries', () => {
    expect(pinyinReadingMatches('qī', 'qi', true)).toBe(true);
    expect(pinyinReadingMatches('qiǎn', 'qi', true)).toBe(false);
    expect(pinyinReadingMatches('qiǎn', 'qian3', true)).toBe(true);
  });
  it('loose mode accepts tone numbers as substrings', () => {
    expect(pinyinReadingMatches('qiǎn', 'qian3', false)).toBe(true);
    expect(pinyinReadingMatches('qiǎn', 'qian2', false)).toBe(false);
  });
  it('accepts v for ü and ignores spaces', () => {
    expect(pinyinReadingMatches('nǚ', 'nv3', true)).toBe(true);
    expect(pinyinReadingMatches('Zhōng guó', 'zhong1guo2', true)).toBe(true);
  });
});
