import { describe, expect, it } from 'vitest';
import { joinSenses, splitSenses } from './use-sense-trim';

describe('card translation senses', () => {
  it('splits a translation at its semicolons so the last sense can be dropped', () => {
    const senses = splitSenses('"ears-out" component used in some Chinese characters (for example, 兑); archaic form of 八; kwukyel, an archaic hanja-based writing system used in Korea before the invention of hangul');
    expect(senses).toHaveLength(3);
    expect(joinSenses(senses.slice(0, 2))).toBe('"ears-out" component used in some Chinese characters (for example, 兑); archaic form of 八');
  });
  it('never splits at a semicolon inside brackets', () => {
    expect(splitSenses('to go (lit.; fig.); to leave')).toEqual(['to go (lit.; fig.)', 'to leave']);
  });
});
