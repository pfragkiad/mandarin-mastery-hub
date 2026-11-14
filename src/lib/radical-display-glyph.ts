// Owner-reviewed presentation notes for abstract Unicode radical symbols (康熙部首異體) that are
// encoded as radical symbols but are not characters in use. Nothing here is derived from shape
// or a mapping table alone: each entry was checked by hand. Two kinds exist:
//
// - 'font-relic': the box draws a stand-in shape so learners see what they will write (⺴ → 冗),
//   and the stand-in's label replaces the usual form label. Fonts draw both identically.
// - 'borrowed-outline': the box keeps the exact symbol (fonts already draw it like the mapped
//   ideograph) and only the hint explains that Practice's outline is borrowed from that
//   ideograph (import-supplementary-outlines.py). The usual form label stays.
//
// Either way the record, links, saves, URLs, stroke data and outline lookup keep the exact
// symbol, and the mapped ideograph never lends its own reading or meaning.
export type RadicalDisplayGlyph = {
  kind: 'font-relic' | 'borrowed-outline';
  /** What the box draws; equals the exact symbol for borrowed outlines. */
  shown: string;
  codePoint: string;
  /** Hint head label; also the form label for font relics. */
  label: string;
  family: string;
  rows: string[];
  source: string;
};

// Borrowed-outline entries (Unicode EquivalentUnifiedIdeograph 17.0.0 mappings whose AnimCJK
// outline matched the radical file's recorded stroke names one by one, Nov 2026 review).
function borrowed(symbol: string, codePoint: string, ideograph: string, family: string, familyRow: string): [string, RadicalDisplayGlyph] {
  return [symbol, {
    kind: 'borrowed-outline', shown: symbol, codePoint, label: `Unicode variant (${codePoint})`, family,
    rows: [`Abstract Unicode variant. Handwriting outline borrowed from ${ideograph}.`, familyRow],
    source: `Unicode EquivalentUnifiedIdeograph 17.0.0 · outline AnimCJK ${ideograph}`,
  }];
}

const REVIEWED: Record<string, RadicalDisplayGlyph> = {
  // ⺴ U+2EB4 CJK RADICAL NET FOUR: a rare top placement of 网; fonts draw it as 冖 over 儿, the
  // same shape as 冗, and Practice uses 冗's four-stroke outline.
  '⺴': {
    kind: 'font-relic',
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
  ...Object.fromEntries([
    borrowed('⺪', 'U+2EAA', '𤴔', '疋', 'A form of Kangxi radical #103 疋. See 疋 for the standalone character.'),
    borrowed('⺷', 'U+2EB7', '𦍌', '羊', 'A form of Kangxi radical #123 羊. See 羊 for the standalone character.'),
    borrowed('⻊', 'U+2ECA', '𧾷', '足', 'Positional variant. See 足 for the standalone form.'),
  ]),
};

/** The reviewed note for an exact radical symbol, or undefined for every other glyph. */
export function radicalDisplayGlyph(glyph: string): RadicalDisplayGlyph | undefined {
  return REVIEWED[glyph];
}

/** The glyph to draw in a box: the reviewed stand-in, otherwise the exact glyph itself. */
export function shownGlyph(glyph: string): string {
  return REVIEWED[glyph]?.shown ?? glyph;
}

/** A form label that replaces the usual one (font relics only); borrowed outlines keep theirs. */
export function standInFormLabel(glyph: string): string | undefined {
  const entry = REVIEWED[glyph];
  return entry?.kind === 'font-relic' ? entry.label : undefined;
}
