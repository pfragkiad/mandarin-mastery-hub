import { describe, expect, it } from 'vitest';
import { DEFAULT_SPEED_INDEX, SPEEDS } from './writing-practice';

describe('writing practice animation speed', () => {
  it('offers exactly the five speeds, slowest to fastest', () => {
    expect(SPEEDS).toEqual([0.25, 0.5, 1, 1.5, 2]);
  });

  it('defaults to 0.5×', () => {
    expect(SPEEDS[DEFAULT_SPEED_INDEX]).toBe(0.5);
  });
});
