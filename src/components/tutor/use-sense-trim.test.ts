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
  it('always keeps the first sense, even when everything past it is trimmed', () => {
    const senses = splitSenses('west(ern); westward; occident');
    // The hook renders senses.slice(0, Math.max(1, shown)): a single-entry translation is never removed.
    expect(joinSenses(senses.slice(0, Math.max(1, 0)))).toBe('west(ern)');
    expect(splitSenses('one single sense')).toHaveLength(1);
  });
  it('drops only trailing senses, so a long translation shortens from the end', () => {
    const senses = splitSenses('to understand; bright, clear; clear-sighted; to look from afar');
    expect(joinSenses(senses.slice(0, Math.max(1, senses.length - 1)))).toBe('to understand; bright, clear; clear-sighted');
    expect(joinSenses(senses.slice(0, Math.max(1, senses.length - 3)))).toBe('to understand');
  });
});
