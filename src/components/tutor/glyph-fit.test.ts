import { describe, expect, it } from 'vitest';
import { glyphFitScale } from './glyph-fit';

describe('glyphFitScale', () => {
  it('leaves ink that already fills the em untouched', () => {
    // 言 in the handwriting font: 40px ink at 44px font ≈ 0.91em.
    expect(glyphFitScale(40, 44, 62)).toBe(1);
  });

  it('lifts unusually small ink toward the shared visual size, capped at 1.45×', () => {
    // A phone fallback font drawing 辶 at 26px (0.59em) lifts to the 1.45× cap.
    expect(glyphFitScale(26, 44, 62)).toBeCloseTo(1.45);
  });

  it('never lets scaled ink overflow the tile box', () => {
    // 0.68em ink in a narrow 40px box: the 92%-of-box cap (1.23×) wins over 1.26×.
    expect(glyphFitScale(30, 44, 40)).toBeCloseTo(1.23, 2);
  });

  it('ignores tiny differences and broken measurements', () => {
    expect(glyphFitScale(35, 44, 62)).toBe(1); // 0.795em — above the 0.78 threshold
    expect(glyphFitScale(0, 44, 62)).toBe(1);
    expect(glyphFitScale(30, 0, 62)).toBe(1);
  });
});
