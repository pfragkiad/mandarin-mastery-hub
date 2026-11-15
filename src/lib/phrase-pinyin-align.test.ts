import { describe, expect, it } from 'vitest';
import inventory from '@/data/pinyin/inventory.json';
import { alignPhrasePinyin, alignSentence } from './phrase-pinyin-align';

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

  it('never starts an a/o/e syllable inside a run without an apostrophe (hǎo is not hǎ|o)', () => {
    expect(syllableTexts('你好', 'nǐhǎo')).toEqual([['0:nǐ', '1:hǎo']]);
    expect(alignPhrasePinyin('你好吗', 'nǐ hǎo', syllables)).toBeNull();
  });

  it('fails closed when the syllables cannot cover the characters', () => {
    expect(alignPhrasePinyin('你好吗', 'nǐ hǎo', syllables)).toBeNull();
  });
});

describe('alignSentence', () => {
  const pieces = (sentence: string, pinyin: string, inv: ReadonlySet<string> | null = syllables) =>
    alignSentence(sentence, pinyin, inv)?.tokens.flatMap(t => t.pieces.filter(p => p.pair != null).map(p => `${p.pair}:${p.text}`));

  it('pairs one-token-per-character pinyin by position, even without the inventory', () => {
    expect(pieces('上一次我没听懂。', 'Shàng yí cì wǒ méi tīng dǒng.', null)).toEqual(['0:Shàng', '1:yí', '2:cì', '3:wǒ', '4:méi', '5:tīng', '6:dǒng']);
  });

  it('splits word-joined sentence pinyin such as Běijīng into syllables', () => {
    expect(pieces('我去过北京一次。', 'Wǒ qù guo Běijīng yí cì.')).toEqual(['0:Wǒ', '1:qù', '2:guo', '3:Běi', '4:jīng', '5:yí', '6:cì']);
    const pairing = alignSentence('每一次见到你，我都很开心。', 'Měi yí cì jiàn dào nǐ, wǒ dōu hěn kāixīn.', syllables);
    expect(pairing?.glyphPairs).toEqual([0, 1, 2, 3, 4, 5, null, 6, 7, 8, 9, 10, null]);
  });

  it('fails closed for word-joined pinyin until the inventory is available, and on a count mismatch', () => {
    expect(alignSentence('我去过北京一次。', 'Wǒ qù guo Běijīng yí cì.', null)).toBeNull();
    expect(alignSentence('我去过北京一次。', 'Wǒ qù Běijīng yí cì.', syllables)).toBeNull();
  });
});
