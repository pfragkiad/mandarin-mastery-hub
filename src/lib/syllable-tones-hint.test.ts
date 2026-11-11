// The Sound chart grid card's hover hint must name only the tones the inventory
// attests for that syllable, as real spellings, and end with the click action —
// never invent a tone, and never mention recording status.
import { describe, expect, it } from 'vitest';
import { syllableTonesHint, type PinyinSyllable } from './pinyin-guide';

const syl = (base: string, tones: PinyinSyllable['tones']): PinyinSyllable => ({ base, initial: base.charAt(0), final: base.slice(1), tones, note: null });

describe('Sound chart grid card hover hint', () => {
  it('lists every attested tone as its real spelling', () => {
    expect(syllableTonesHint(syl('ba', [1, 2, 3, 4])))
      .toBe('Available tones: bā, bá, bǎ, bà · click to open its sound card');
  });
  it('names only the tones this syllable has, never the missing ones', () => {
    expect(syllableTonesHint(syl('bao', [1, 4])))
      .toBe('Available tones: bāo, bào · click to open its sound card');
  });
  it('lists the attested neutral tone without saying anything about recordings', () => {
    expect(syllableTonesHint(syl('ma', [1, 2, 3, 4, 5])))
      .toBe('Available tones: mā, má, mǎ, mà, ma · click to open its sound card');
  });
  it('says nothing about recordings for a syllable whose tones were never recorded', () => {
    expect(syllableTonesHint(syl('ba', [1, 2])))
      .toBe('Available tones: bā, bá · click to open its sound card');
  });
  it('keeps tones in tone order whatever order the inventory lists them in', () => {
    expect(syllableTonesHint(syl('ba', [4, 1])))
      .toBe('Available tones: bā, bà · click to open its sound card');
  });
  it('gives only the click action when the syllable attests no tone', () => {
    expect(syllableTonesHint(syl('ba', []))).toBe('Click to open its sound card');
  });
  it('never mentions recording status in any hint', () => {
    const hints = [syl('ba', [1, 2]), syl('ma', [1, 2, 3, 4, 5]), syl('ba', []), syl('nv', [3])]
      .map(syllableTonesHint);
    expect(hints.some(h => /record/i.test(h))).toBe(false);
  });
});
