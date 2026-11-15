import { catalog } from './catalog-store';
import { libraryEntries, radicalVariantFallback, type LibraryKind } from './character-library';
import { cardMeaning, glyphPresentation } from './glyph-presentation';
import { usageRank } from './usage-frequency';
import type { CharacterScript } from './learning-preferences';

/**
 * Data for the lesson hint card (components/tutor/lesson-hints.tsx): the short facts a
 * learner needs when tapping one hanzi inside a lesson. Browser-safe and pure over the
 * lazily hydrated catalogue; returns null until it loads or when no exact record exists.
 *
 * Record choice is by exact written form only — the Characters record first (the lexical
 * character a lesson's prose is about), then Components, then a Radicals card whose own
 * glyph is the clicked form. Unlike libraryDestination, no canonical-identity link or
 * look-alike stands in, so the card never shows another glyph's reading or meaning.
 */
export type LessonGlyphHint = {
  glyph: string; kind: LibraryKind; id: string;
  /** Lexical reading(s) as recorded ("gān / gàn" keeps its separator); '' when none. */
  pinyin: string;
  /** Spoken text for that reading (the glyph, or a variant's family heading). */
  spoken: string;
  /** A pure component's recorded name ("Name · zhútóu"), shown instead of pinyin. */
  componentName?: string | undefined;
  meaning: string;
  strokes?: number | undefined;
  rank: number | null;
  script?: CharacterScript | undefined;
  /** Kangxi number when the record is (or is the canonical form of) a radical. */
  radicalNumber?: number | undefined;
  /** Full-card destination: the exact record ID (an explicit ID beats any page number). */
  search: { tab: LibraryKind; id: string };
};

const ORDER: LibraryKind[] = ['Characters', 'Components', 'Radicals'];

export function lessonGlyphHint(glyph: string, includeTraditional: boolean): LessonGlyphHint | null {
  if (Array.from(glyph).length !== 1) return null;
  for (const kind of ORDER) {
    const entry = libraryEntries(kind).find(item => item.hanzi === glyph);
    if (!entry) continue;
    const row = (kind === 'Characters' ? catalog.characters : kind === 'Components' ? catalog.components : catalog.radicals).find(item => item[0] === glyph);
    const info = glyphPresentation(glyph, kind, row?.[1] ?? '', row?.[2] ?? '');
    // Components with no own reading inherit their radical family's reading, as in reference cards.
    const fallback = kind === 'Components' && !entry.pinyin ? radicalVariantFallback(glyph, '') : null;
    const meaning = kind === 'Characters' && row ? cardMeaning(glyph, row[1], row[2]) : fallback ? `${fallback.meaning}; component form of ${fallback.headingGlyph}` : entry.meaning;
    return {
      glyph, kind, id: entry.id,
      pinyin: fallback?.pinyin ?? entry.pinyin,
      spoken: fallback?.spoken ?? glyph,
      componentName: !fallback && info.componentName ? info.componentName.pinyin : undefined,
      meaning,
      strokes: entry.strokes,
      rank: usageRank(entry, kind, includeTraditional),
      script: entry.script,
      radicalNumber: entry.kangxiIndex ?? info.canonicalRadical?.number,
      search: { tab: kind, id: entry.id },
    };
  }
  return null;
}
