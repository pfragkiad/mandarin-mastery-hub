import { describe, expect, it } from 'vitest';
import inventory from '@/data/pinyin/inventory.json';
import { alignPhrasePinyin } from './phrase-pinyin-align';

const syllables = new Set((inventory.syllables as { base: string }[]).map(s => s.base));
const syllableTexts = (hanzi: string, pinyin: string) =>
  alignPhrasePinyin(hanzi, pinyin, syllables)?.tokens.map(t => t.pieces.filter(p => p.pair != null).map(p => `${p.pair}:${p.text}`));

describe('alignPhrasePinyin', () => {
  it('splits word-grouped pinyin into one syllable per character', () => {
    expect(syllableTexts('不好意思', 'bù hǎoyìsi')).toEqual([['0:bù'], ['1:hǎo', '2:yì', '3:si']]);
  });

  it('skips headword punctuation and keeps token punctuation outside the syllable', () => {
    const pairing = alignPhrasePinyin('谢谢你！', 'Xièxie nǐ!', syllables);
    expect(pairing?.glyphPairs).toEqual([0, 1, 2, null]);
    expect(pairing?.tokens[1]).toEqual({ leading: '', trailing: '!', pieces: [{ text: 'nǐ', pair: 2 }] });
  });

  it('pairs a token-final erhua r with 儿', () => {
    expect(syllableTexts('一点儿', 'yìdiǎnr')).toEqual([['0:yì', '1:diǎn', '2:r']]);
  });

  it('treats an apostrophe as a syllable boundary', () => {
    expect(syllableTexts('西安', "Xī'ān")).toEqual([['0:Xī', '1:ān']]);
  });

  it('fails closed when two different splits fit (fang|an vs fan|gan)', () => {
    expect(alignPhrasePinyin('方案', 'fangan', syllables)).toBeNull();
  });

  it('fails closed when the syllables cannot cover the characters', () => {
    expect(alignPhrasePinyin('你好吗', 'nǐ hǎo', syllables)).toBeNull();
  });
});
