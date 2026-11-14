// Display stand-ins for abstract Kangxi radical variants (康熙部首異體) that Unicode encodes as
// radical symbols but that are not characters in use. Each entry is owner-reviewed (never
// derived from shape or a mapping table alone): the box shows the stand-in so learners see the
// shape they will draw, while the record, links, saves, URLs, stroke data and outline lookup
// keep the exact symbol. The stand-in is presentation only and never lends its own reading or
// meaning (冗 rǒng "superfluous" is a different character).
//
// ⺴ U+2EB4 CJK RADICAL NET FOUR: a rare top placement of 网; fonts draw it as 冖 over 儿, the
// same shape as 冗, and Practice uses 冗's four-stroke outline (import-supplementary-outlines.py).
export type RadicalDisplayGlyph = { shown: string; codePoint: string; label: string; family: string; rows: string[]; source: string };

const REVIEWED: Record<string, RadicalDisplayGlyph> = {
  '⺴': {
    shown: '冗',
    codePoint: 'U+2EB4',
    label: 'Unicode variant (U+2EB4)',
    family: '网',
    rows: [
      'An abstract Kangxi radical variant of 网, not a character in use.',
      'Fonts draw it like 冗, so 冗 is shown and its handwriting outline is used.',
      'It is not the character 冗 (rǒng, “superfluous”).',
    ],
    source: 'Unicode EquivalentUnifiedIdeograph 17.0.0 · outline AnimCJK 冗',
  },
};

/** The reviewed stand-in for an exact radical symbol, or undefined for every other glyph. */
export function radicalDisplayGlyph(glyph: string): RadicalDisplayGlyph | undefined {
  return REVIEWED[glyph];
}

/** The glyph to draw in a box: the reviewed stand-in, otherwise the exact glyph itself. */
export function shownGlyph(glyph: string): string {
  return REVIEWED[glyph]?.shown ?? glyph;
}
