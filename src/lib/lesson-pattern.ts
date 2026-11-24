/**
 * Pattern headings (Mandarin Core v3.6.0 migration report, reports/Frontend_Migration_Report_Core_v3.6.0.md).
 *
 * HSK topic patterns, Conversational grammar_pattern blocks and character constructions all record
 * pattern_hanzi / pattern_pinyin / pattern_pseudo_translation; legacy HSK topic 3.3.0 cards record a
 * one-line formula_en instead. The pseudo-translation is plain text: English placeholders in angle
 * brackets (<subject>) and fixed Mandarin, which is shown bold. Splitting is display-only — joining
 * the parts always reconstructs the recorded string exactly (spacing, punctuation, alternatives).
 */

export type PseudoPart = { kind: 'slot' | 'mandarin' | 'text'; text: string };

// From the report: a slot is <…> without nested brackets; fixed Mandarin is a Han run, optionally
// with /-separated alternatives (会/能) and one trailing full-width sentence mark.
const SPLIT = /(<[^<>]+>|\p{Script=Han}+(?:\/\p{Script=Han}+)*[！？。]?)/u;
const SLOT = /^<[^<>]+>$/;
const HAN_START = /^\p{Script=Han}/u;

/** The recorded pseudo-translation split into slots, fixed Mandarin and connecting text. */
export function pseudoTranslationParts(value: string): PseudoPart[] {
  return value.split(SPLIT).filter(part => part !== '').map(part => ({
    kind: SLOT.test(part) ? 'slot' : HAN_START.test(part) ? 'mandarin' : 'text',
    text: part,
  }));
}

/** Which heading a pattern record carries: the modern three-line one, the legacy formula, or none. */
export type PatternHeadingSource = { pattern_hanzi?: string | undefined; pattern_pinyin?: string | undefined; pattern_pseudo_translation?: string | undefined; formula_en?: string | undefined };
export type PatternHeading =
  | { kind: 'modern'; hanzi: string; pinyin: string; pseudoTranslation: string }
  | { kind: 'legacy'; formula: string }
  | { kind: 'none' };

/** Normalises only the heading; explanations and examples stay with each family's own renderer. */
export function toPatternHeading(card: PatternHeadingSource): PatternHeading {
  const hanzi = card.pattern_hanzi?.trim() ?? '';
  if (hanzi) return { kind: 'modern', hanzi: card.pattern_hanzi ?? '', pinyin: card.pattern_pinyin ?? '', pseudoTranslation: card.pattern_pseudo_translation ?? '' };
  const formula = card.formula_en?.trim() ?? '';
  return formula ? { kind: 'legacy', formula: card.formula_en ?? '' } : { kind: 'none' };
}
