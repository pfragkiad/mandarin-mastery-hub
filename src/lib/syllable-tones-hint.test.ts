// The Sound chart grid card's hover hint must name only the tones the inventory
// attests for that syllable, as real spellings, and say which of them have no
// recording — never invent a tone or promise a sound that does not exist.
import { describe, expect, it } from 'vitest';
import { syllableTonesHint, type PinyinData, type PinyinSyllable } from './pinyin-guide';

const syl = (base: string, tones: PinyinSyllable['tones']): PinyinSyllable => ({ base, initial: base.charAt(0), final: base.slice(1), tones, note: null });
const data = (recorded: string[]): Pick<PinyinData, 'recordings'> => ({ recordings: Object.fromEntries(recorded.map(id => [id, { url: `/${id}.mp3`, ms: 400 }])) });

describe('Sound chart grid card hover hint', () => {
  it('lists every attested tone as its real spelling when all are recorded', () => {
    expect(syllableTonesHint(data(['ba1', 'ba2', 'ba3', 'ba4']), syl('ba', [1, 2, 3, 4])))
      .toBe('Available tones: bā, bá, bǎ, bà · click to open its sound card');
  });
  it('names only the tones this syllable has, never the missing ones', () => {
    expect(syllableTonesHint(data(['bao1', 'bao4']), syl('bao', [1, 4])))
      .toBe('Available tones: bāo, bào · click to open its sound card');
  });
  it('flags an attested tone that has no recording', () => {
    expect(syllableTonesHint(data(['ma1', 'ma2', 'ma4']), syl('ma', [1, 2, 3, 4])))
      .toBe('Available tones: mā, má, mǎ, mà · no recording for mǎ · click to open its sound card');
  });
  it('names the attested neutral tone but never calls it playable', () => {
    expect(syllableTonesHint(data(['ma1', 'ma2', 'ma3', 'ma4']), syl('ma', [1, 2, 3, 4, 5])))
      .toBe('Available tones: mā, má, mǎ, mà, ma · no recording for ma · click to open its sound card');
  });
  it('says so when nothing was recorded for this syllable', () => {
    expect(syllableTonesHint(data([]), syl('ba', [1, 2])))
      .toBe('Available tones: bā, bá · no recordings yet · click to open its sound card');
  });
  it('keeps tones in tone order whatever order the inventory lists them in', () => {
    expect(syllableTonesHint(data(['ba4', 'ba1']), syl('ba', [4, 1])))
      .toBe('Available tones: bā, bà · click to open its sound card');
  });
});
