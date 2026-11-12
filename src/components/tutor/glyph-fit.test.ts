import { describe, expect, it } from 'vitest';
import { glyphFitScale, glyphInkShift } from './glyph-fit';

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

describe('glyphInkShift', () => {
  it('leaves ink that is already centred in its tile untouched', () => {
    // A full-width ideograph: ink spans -18..18 horizontally and -20..20 vertically.
    expect(glyphInkShift({ left: -18, right: 18, top: -20, bottom: 20 })).toEqual({ dx: 0, dy: 0 });
  });

  it('pulls a question mark back onto the tile centre', () => {
    // The handwriting font draws ? from -2 to 17 of its advance and -23 to 0 in height.
    expect(glyphInkShift({ left: -2, right: 17, top: -23, bottom: 0 })).toEqual({ dx: -7.5, dy: 11.5 });
  });

  it('drops nudges smaller than a pixel so the mark never jitters between fonts', () => {
    expect(glyphInkShift({ left: -9, right: 8, top: -12, bottom: 12 })).toEqual({ dx: 0, dy: 0 });
    expect(glyphInkShift({ left: -10, right: 9, top: -11, bottom: 13 })).toEqual({ dx: 0, dy: -1 });
  });
});
