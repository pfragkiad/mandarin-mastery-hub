import { describe, expect, it } from 'vitest';
import { ROUND_SIZES, dealRound, mixedRound, reviewRound } from './pinyin-round';
import type { PinyinSound, Tone } from './pinyin-guide';

const sounds = (n: number): PinyinSound[] => Array.from({ length: n }, (_, i) => ({ id: `s${i}`, base: `s${i}`, tone: 1 as Tone }));

describe('Pinyin game rounds', () => {
  it('offers rounds of 5, 10, 15, 20, 30, 40 and 50', () => {
    expect([...ROUND_SIZES]).toEqual([5, 10, 15, 20, 30, 40, 50]);
  });
  it.each(ROUND_SIZES)('deals exactly %i distinct sounds from a larger pool', size => {
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
  it('a new round with missed keeps every missed sound and fills up to the round size with others', () => {
    const pool = sounds(100);
    const missed = [pool[3]!, pool[7]!, pool[3]!];
    const round = mixedRound(pool, 10, missed);
    expect(round).toHaveLength(10);
    expect(new Set(round.map(s => s.id)).size).toBe(10);
    expect(round.map(s => s.id)).toEqual(expect.arrayContaining(['s3', 's7']));
  });
  it('a new round with more missed sounds than the round size deals all of them', () => {
    const pool = sounds(100);
    expect(mixedRound(pool, 10, pool.slice(0, 12))).toHaveLength(12);
  });
});
