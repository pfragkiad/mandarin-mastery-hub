import { describe, expect, it } from 'vitest';
import { chartFilterOptions, directSoundMatch, type PinyinSyllable } from './pinyin-guide';

const syl = (base: string, initial: string | null, final: string): PinyinSyllable => ({ base, initial, final, tones: [1] } as PinyinSyllable);
const all = [syl('ba', 'b', 'a'), syl('bi', 'b', 'i'), syl('zha', 'zh', 'a'), syl('zhi', 'zh', 'i'), syl('ju', 'j', 'ü'), syl('a', null, 'a')];

describe('Sound chart direct match on search', () => {
  const ma = { base: 'ma', initial: 'm', final: 'a', tones: [1, 2, 3, 4, 5] } as PinyinSyllable;
  it('selects the syllable and tone for a numbered search with one result', () => {
    expect(directSoundMatch([ma], 'ma1')).toEqual({ base: 'ma', tone: 1 });
  });
  it('accepts tone marks too', () => {
    expect(directSoundMatch([ma], 'mǎ')).toEqual({ base: 'ma', tone: 3 });
  });
  it('selects nothing for a bare spelling', () => {
    expect(directSoundMatch([ma], 'ma')).toBeNull();
  });
  it('selects nothing when several tiles remain', () => {
    expect(directSoundMatch([ma, syl('ba', 'b', 'a')], 'ma1')).toBeNull();
  });
});

describe('Sound chart dropdown narrowing', () => {
  it('limits finals to those existing with the chosen initial', () => {
    expect([...chartFilterOptions(all, '', 'j', '').finals]).toEqual(['ü']);
  });
  it('limits initials to those existing with the chosen final', () => {
    expect([...chartFilterOptions(all, '', '', 'ü').initials]).toEqual(['j']);
  });
  it('never narrows a dropdown by its own value', () => {
    expect(chartFilterOptions(all, '', 'j', '').initials.size).toBe(4);
  });
  it('narrows both dropdowns by the applied search', () => {
    const o = chartFilterOptions(all, 'zh', '', '');
    expect([...o.initials]).toEqual(['zh']);
    expect([...o.finals].sort()).toEqual(['a', 'i']);
  });
});
