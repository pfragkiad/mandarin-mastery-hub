import { describe, expect, it } from 'vitest';
import { soundChartTarget, type PinyinSyllable } from './pinyin-guide';

const syllables: PinyinSyllable[] = [
  { base: 'ma', initial: 'm', final: 'a', tones: [1, 2, 3, 4, 5], note: null },
  { base: 'le', initial: 'l', final: 'e', tones: [4, 5], note: null },
  { base: 'liao', initial: 'l', final: 'iao', tones: [1, 2, 3, 4], note: null },
  { base: 'lü', initial: 'l', final: 'ü', tones: [2, 3, 4], note: null },
];
const data = { syllables };

describe('soundChartTarget', () => {
  it('opens the exact syllable and tone of a tone-marked reading', () => {
    expect(soundChartTarget(data, 'mā')).toEqual({ base: 'ma', tone: 1 });
    expect(soundChartTarget(data, 'liǎo')).toEqual({ base: 'liao', tone: 3 });
    expect(soundChartTarget(data, 'lǜ')).toEqual({ base: 'lü', tone: 4 });
  });
  it('treats an unmarked reading as the neutral tone only when the syllable has one', () => {
    expect(soundChartTarget(data, 'le')).toEqual({ base: 'le', tone: 5 });
    expect(soundChartTarget(data, 'liao')).toBeNull();
  });
  it('gives no link for unattested tones, unknown syllables or several syllables', () => {
    expect(soundChartTarget(data, 'lē')).toBeNull();
    expect(soundChartTarget(data, 'nǎr')).toBeNull();
    expect(soundChartTarget(data, 'dāo zì páng')).toBeNull();
    expect(soundChartTarget(data, '')).toBeNull();
  });
});
