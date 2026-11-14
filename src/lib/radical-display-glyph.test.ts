import { describe, expect, it } from 'vitest';
import { radicalDisplayGlyph, shownGlyph, standInFormLabel } from './radical-display-glyph';

describe('radical display stand-ins', () => {
  it('draws ⺴ as 冗 with the Unicode variant label', () => {
    expect(shownGlyph('⺴')).toBe('冗');
    expect(radicalDisplayGlyph('⺴')?.label).toBe('Unicode variant (U+2EB4)');
    expect(standInFormLabel('⺴')).toBe('Unicode variant (U+2EB4)');
  });

  it('leaves every other form, including the other net forms and 冗 itself, unchanged', () => {
    for (const glyph of ['网', '罓', '罒', '⺳', '冗', '⺁', '⺷', '⺪', '⻊']) expect(shownGlyph(glyph)).toBe(glyph);
    expect(radicalDisplayGlyph('冗')).toBeUndefined();
  });

  // Borrowed outlines keep their own glyph and usual form label; only the hint names the source.
  it.each([['⺪', '𤴔'], ['⺷', '𦍌'], ['⻊', '𧾷']])('notes that %s borrows the %s outline', (glyph, ideograph) => {
    const entry = radicalDisplayGlyph(glyph);
    expect(entry?.kind).toBe('borrowed-outline');
    expect(entry?.rows[0]).toBe(`Abstract Unicode variant. Handwriting outline borrowed from ${ideograph}.`);
    expect(standInFormLabel(glyph)).toBeUndefined();
  });

  it('gives ⻊ the positional-variant note pointing at 足', () => {
    expect(radicalDisplayGlyph('⻊')?.rows[1]).toBe('Positional variant. See 足 for the standalone form.');
  });

  // ⺁'s recorded first stroke is 撇 while 厂's outline starts with 横, so no note or link exists.
  it('has no note for ⺁', () => {
    expect(radicalDisplayGlyph('⺁')).toBeUndefined();
  });
});
