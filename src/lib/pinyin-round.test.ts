import { describe, expect, it } from 'vitest';
import { ROUND_SIZES, dealRound, reviewRound } from './pinyin-round';
import type { PinyinSound, Tone } from './pinyin-guide';

const sounds = (n: number): PinyinSound[] => Array.from({ length: n }, (_, i) => ({ id: `s${i}`, base: `s${i}`, tone: 1 as Tone }));

describe('Pinyin game rounds', () => {
  it('offers rounds of 10, 20 and 50 sounds', () => {
    expect([...ROUND_SIZES]).toEqual([10, 20, 50]);
  });
  it.each([10, 20, 50] as const)('deals exactly %i distinct sounds from a larger pool', size => {
    const round = dealRound(sounds(1288), size);
    expect(round).toHaveLength(size);
    expect(new Set(round.map(s => s.id)).size).toBe(size);
  });
  it('deals the whole pool when it is smaller than the round size', () => {
    expect(dealRound(sounds(7), 10)).toHaveLength(7);
  });
  it('replays every missed sound once in a review round, even beyond the round size', () => {
    const missed = sounds(12);
    const review = reviewRound([...missed, missed[0]!]);
    expect(review).toHaveLength(12);
    expect(new Set(review.map(s => s.id))).toEqual(new Set(missed.map(s => s.id)));
  });
});
