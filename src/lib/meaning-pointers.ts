import { catalog } from './catalog-store';
import { relatedGroup } from './character-variants';

/**
 * Owner-reviewed pointers from one sense of a character's meaning to the related character
 * that owns it (干: "dried" is 乾's sense, gàn "trunk" is 幹's). Stored in catalog.json
 * `meaningPointers`; meaning text is never rewritten — the sense stays visible and the detail
 * card adds a "→ 乾" link beside it. A segment with `reading` applies only to that reading's
 * line of a reviewed per-reading split (readingMeanings), or to the single combined line.
 */
export type MeaningPointerRecord = { combined: string; segments: { text: string; related: string; reading?: string }[]; source: string; sourceUrl?: string; date?: string; approvedBy?: string };

/** One "; "-separated part of a meaning, with the related character it points to (if any). */
export type MeaningPart = { text: string; related?: string };

/**
 * `shown` (default: the recorded meaning) split into its "; " parts with reviewed pointers
 * attached, or null when none applies. Fails closed: the record applies only while
 * `recorded` is exactly the reviewed combined text, and each pointer only when its text is
 * one whole part, its reading matches the line (when both are given) and its related
 * character is in the glyph's recorded related-characters set, so a data correction or a
 * dropped association never leaves a stale link.
 */
export function meaningPointers(glyph: string, recorded: string, shown: string = recorded, reading?: string): MeaningPart[] | null {
  const record = catalog.meaningPointers[glyph];
  if (!record || recorded !== record.combined) return null;
  const related = new Set(relatedGroup(glyph));
  let linked = false;
  const result = shown.split(/;\s*/).map(text => {
    const pointer = record.segments.find(segment => segment.text === text && (!segment.reading || !reading || segment.reading === reading) && segment.related !== glyph && related.has(segment.related));
    if (pointer) linked = true;
    return pointer ? { text, related: pointer.related } : { text };
  });
  return linked ? result : null;
}
