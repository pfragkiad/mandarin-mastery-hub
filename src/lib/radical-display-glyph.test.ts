import { describe, expect, it } from 'vitest';
import { radicalDisplayGlyph, shownGlyph } from './radical-display-glyph';

describe('radical display stand-ins', () => {
  it('draws ⺴ as 冗 with the Unicode variant label', () => {
    expect(shownGlyph('⺴')).toBe('冗');
    expect(radicalDisplayGlyph('⺴')?.label).toBe('Unicode variant (U+2EB4)');
  });

  it('leaves every other form, including the other net forms and 冗 itself, unchanged', () => {
    for (const glyph of ['网', '罓', '罒', '⺳', '冗', '⺁', '⺷']) expect(shownGlyph(glyph)).toBe(glyph);
    expect(radicalDisplayGlyph('冗')).toBeUndefined();
  });
});
