import { describe, expect, it } from 'vitest';
import { labelColumnWidth } from './decomposition-labels';

describe('shared breakdown label column', () => {
  it('keeps the 42px default when every label fits', () => {
    expect(labelColumnWidth([24, 31, 40])).toBe(42);
  });
  it('widens the whole column to the widest label so no last word runs into a tile', () => {
    expect(labelColumnWidth([24, 57.2, 40])).toBe(58);
  });
  it('ignores unmeasurable labels', () => {
    expect(labelColumnWidth([Number.NaN])).toBe(42);
  });
});
