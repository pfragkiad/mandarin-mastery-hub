import { describe, expect, it } from 'vitest';
import { DEFAULT_SPEED_INDEX, SPEEDS, speedLabel, strokeSpeed } from '@/lib/practice-speed';

describe('writing practice animation speed', () => {
  it('offers only 0.25× and 0.5×', () => {
    expect(SPEEDS).toEqual([0.25, 0.5]);
    expect(SPEEDS.map(speedLabel)).toEqual(['0.25×', '0.5×']);
  });

  it('defaults to 0.5× when the slower switch is off', () => {
    expect(SPEEDS[DEFAULT_SPEED_INDEX]).toBe(0.5);
    expect(strokeSpeed(undefined)).toBe(0.5);
    expect(strokeSpeed(0.5)).toBe(0.5);
  });

  it('slower switch uses 0.25×, and an old saved 1× falls back to 0.5×', () => {
    expect(strokeSpeed(0.25)).toBe(0.25);
    expect(strokeSpeed(1)).toBe(0.5);
  });
});
