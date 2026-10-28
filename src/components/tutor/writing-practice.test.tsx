import { describe, expect, it } from 'vitest';
import { DEFAULT_SPEED_INDEX, SPEEDS, speedLabel } from '@/lib/practice-speed';

describe('writing practice animation speed', () => {
  it('offers exactly the three speeds, slowest to fastest', () => {
    expect(SPEEDS).toEqual([0.25, 0.5, 1]);
  });

  it('defaults to 0.5×', () => {
    expect(SPEEDS[DEFAULT_SPEED_INDEX]).toBe(0.5);
  });

  it('labels each speed with a multiplication sign', () => {
    expect(SPEEDS.map(speedLabel)).toEqual(['0.25×', '0.5×', '1×']);
  });
});
