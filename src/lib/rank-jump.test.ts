import { describe, expect, it } from 'vitest';
import { nearestRecordedRank } from './rank-jump';

describe('Recorded rank jumps', () => {
  it('resolves an absent rank to the closest recorded rank', () => {
    expect(nearestRecordedRank([500, 512, null, 540], 511)).toEqual({ rank: 512, index: 1 });
  });
  it('retains exact rank and result index', () => {
    expect(nearestRecordedRank([null, 512, 540], 512)).toEqual({ rank: 512, index: 1 });
  });
  it('never assigns a rank to unranked records', () => {
    expect(nearestRecordedRank([null, null], 512)).toBeUndefined();
  });
  it('resolves equal distance to the lower recorded rank', () => {
    expect(nearestRecordedRank([514, 510], 512)).toEqual({ rank: 510, index: 1 });
  });
});