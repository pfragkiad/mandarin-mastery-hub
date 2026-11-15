import { describe, expect, it } from 'vitest';
import { alignSentencePinyin, splitPinyinTokens } from './sentence-align';

describe('alignSentencePinyin', () => {
  it('pairs each hanzi with the pinyin token at the same position', () => {
    const pairs = alignSentencePinyin('我爱你', 'Wǒ ài nǐ');
    expect(pairs).toEqual([
      { charIndex: 0, syllableIndex: 0 },
      { charIndex: 1, syllableIndex: 1 },
      { charIndex: 2, syllableIndex: 2 },
    ]);
  });

  it('skips sentence punctuation when indexing characters', () => {
    const pairs = alignSentencePinyin('你好！', 'Nǐ hǎo!');
    expect(pairs).toEqual([
      { charIndex: 0, syllableIndex: 0 },
      { charIndex: 1, syllableIndex: 1 },
    ]);
  });

  it('strips punctuation attached to a pinyin token', () => {
    expect(splitPinyinTokens('Nǐ hǎo!')).toEqual([
      { syllable: 'Nǐ', leading: '', trailing: '' },
      { syllable: 'hǎo', leading: '', trailing: '!' },
    ]);
  });

  it('fails closed when token and hanzi counts differ', () => {
    expect(alignSentencePinyin('我爱你', 'Wǒ ài')).toBeNull();
    expect(alignSentencePinyin('西安', "Xī'ān")).toBeNull();
  });

  it('fails closed when the sentence has no hanzi', () => {
    expect(alignSentencePinyin('OK', 'OK')).toBeNull();
  });
});
