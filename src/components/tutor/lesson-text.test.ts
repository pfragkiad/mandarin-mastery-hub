import { describe, expect, it } from 'vitest';
import { inlineSegments, sameReading } from './lesson-text';

describe('inlineSegments', () => {
  it('finds a Han run followed by its bracketed pinyin', () => {
    expect(inlineSegments('compare 我去过北京一次 (Wǒ qù guo Běijīng yí cì), which counts')).toEqual([
      { kind: 'text', text: 'compare ' },
      { kind: 'term', hanzi: '我去过北京一次', gap: ' ', open: '(', pinyin: 'Wǒ qù guo Běijīng yí cì', close: ')' },
      { kind: 'text', text: ', which counts' },
    ]);
  });

  it('handles several terms and full-width brackets', () => {
    const segs = inlineSegments('过 (guo) marks aspect, while 一次（yí cì） counts');
    expect(segs.filter(s => s.kind === 'term').map(s => s.kind === 'term' && `${s.hanzi}|${s.pinyin}`)).toEqual(['过|guo', '一次|yí cì']);
  });

  it('leaves brackets that are not pinyin as plain text', () => {
    expect(inlineSegments('以 (see the note on 用)')).toEqual([{ kind: 'text', text: '以 (see the note on 用)' }]);
    expect(inlineSegments('次 (2)')).toEqual([{ kind: 'text', text: '次 (2)' }]);
  });
});

describe('sameReading (lesson speakers borrow a card recording only for its own reading)', () => {
  it('matches the same reading despite spacing, case and punctuation', () => {
    expect(sameReading('nǐ hǎo', 'Nǐhǎo!')).toBe(true);
    expect(sameReading('xièxie', 'xiè xie')).toBe(true);
  });
  it('rejects a different tone spelling or reading', () => {
    expect(sameReading('bù kèqi', 'bú kèqi')).toBe(false);
    expect(sameReading('xièxie', 'xièxiè')).toBe(false);
  });
  it('never matches an unknown card reading', () => {
    expect(sameReading(undefined, 'nǐ hǎo')).toBe(false);
    expect(sameReading('', '')).toBe(false);
  });
});
