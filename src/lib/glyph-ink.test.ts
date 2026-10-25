import { describe, expect, it } from 'vitest';
import { measureGlyphInk, opticalMargins, type GlyphInk } from './glyph-ink';

const ink = (left: number, right: number, advance = 36): GlyphInk => ({ advance, left, right });

describe('opticalMargins', () => {
  it('never moves the first glyph', () => {
    expect(opticalMargins([ink(2, 2), ink(13, 13)], 14)[0]).toBe(0);
  });

  it('pulls a narrow component form towards the main character', () => {
    const margins = opticalMargins([ink(2, 2), ink(13, 13)], 14);
    expect(margins[1]).toBe(14 - 2 - 13);
  });

  it('makes every visible gap exactly the target', () => {
    const inks = [ink(1, 3), ink(12, 10), ink(4, 6), ink(9, 9)];
    const margins = opticalMargins(inks, 16);
    inks.slice(1).forEach((glyph, index) => {
      expect(margins[index + 1] + inks[index].right + glyph.left).toBe(16);
    });
  });

  it('falls back to plain spacing when a glyph cannot be measured', () => {
    expect(opticalMargins([ink(1, 1), null], 14)[1]).toBe(14);
    expect(opticalMargins([null, ink(1, 1)], 14)[1]).toBe(14);
  });

  it('keeps ink from overlapping when the target is zero', () => {
    expect(opticalMargins([ink(0, 0), ink(0, 0)], 0)[1]).toBe(0);
  });
});

describe('measureGlyphInk', () => {
  it('fails closed where ink bounds cannot be reported', () => {
    expect(measureGlyphInk('刂', 'sans-serif', 36)).toBeNull();
  });

  it('refuses an empty glyph', () => {
    expect(measureGlyphInk('', 'sans-serif', 36)).toBeNull();
  });
});
