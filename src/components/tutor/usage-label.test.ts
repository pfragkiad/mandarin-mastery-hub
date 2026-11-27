import { describe, expect, it } from 'vitest';
import { rankTierClass, usageRankTier } from './usage-label';

describe('usageRankTier', () => {
  it('uses the default glyph thresholds (300 / 500 / 1000)', () => {
    expect(usageRankTier(null)).toBe('none');
    expect(usageRankTier(300)).toBe('top');
    expect(usageRankTier(301)).toBe('inter');
    expect(usageRankTier(500)).toBe('inter');
    expect(usageRankTier(501)).toBe('mid');
    expect(usageRankTier(1000)).toBe('mid');
    expect(usageRankTier(1001)).toBe('low');
  });

  it('extends the green and middle tiers for idioms (1000 / 2000 / 3500)', () => {
    expect(usageRankTier(null, 'idiom')).toBe('none');
    expect(usageRankTier(1, 'idiom')).toBe('top');
    expect(usageRankTier(1000, 'idiom')).toBe('top');
    expect(usageRankTier(1001, 'idiom')).toBe('inter');
    expect(usageRankTier(2000, 'idiom')).toBe('inter');
    expect(usageRankTier(2001, 'idiom')).toBe('mid');
    expect(usageRankTier(3500, 'idiom')).toBe('mid');
    expect(usageRankTier(3501, 'idiom')).toBe('low');
  });
});
describe('rank colour classes (cards, rank dropdowns and range controls)', () => {
  it('names the class for every glyph tier and leaves unranked records plain', () => {
    expect(rankTierClass(300)).toBe('usage-top');
    expect(rankTierClass(500)).toBe('usage-inter');
    expect(rankTierClass(1000)).toBe('usage-mid');
    expect(rankTierClass(9933)).toBe('usage-low');
    expect(rankTierClass(null)).toBeUndefined();
  });
  it('keeps the wider idiom bands green', () => {
    expect(rankTierClass(1000, 'idiom')).toBe('usage-top');
    expect(rankTierClass(2000, 'idiom')).toBe('usage-inter');
    expect(rankTierClass(3500, 'idiom')).toBe('usage-mid');
    expect(rankTierClass(8519, 'idiom')).toBe('usage-low');
  });
});
