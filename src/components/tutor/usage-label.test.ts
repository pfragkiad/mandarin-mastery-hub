import { describe, expect, it } from 'vitest';
import { usageRankTier } from './usage-label';

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