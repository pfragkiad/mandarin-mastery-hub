import { catalog } from './catalog-store';
import { relatedGroup } from './character-variants';

/**
 * Owner-reviewed pointers from one sense of a character's recorded meaning to the related
 * character that owns it (干's Unihan meaning "…; dried" is the sense of 乾). Stored in
 * catalog.json `meaningPointers`; the recorded meaning text is never rewritten — the sense
 * stays visible and the detail card adds a link to the related card beside it.
 */
export type MeaningPointerRecord = { combined: string; segments: { text: string; related: string }[]; source: string; sourceUrl?: string; date?: string; approvedBy?: string };

/** One "; "-separated part of the meaning, with the related character it points to (if any). */
export type MeaningPart = { text: string; related?: string };

/**
 * The meaning split into its "; " parts with reviewed pointers attached, or null when no
 * reviewed pointer applies. Fails closed: the record applies only while `meaning` is exactly
 * the reviewed combined text, and each pointer only when its text is one whole part and its
 * related character is in the glyph's recorded related-characters set, so a data correction
 * or a dropped association never leaves a stale link.
 */
export function meaningPointers(glyph: string, meaning: string): MeaningPart[] | null {
  const record = catalog.meaningPointers[glyph];
  if (!record || meaning !== record.combined) return null;
  const related = new Set(relatedGroup(glyph));
  const parts = meaning.split(/;\s*/);
  let linked = false;
  const result = parts.map(text => {
    const pointer = record.segments.find(segment => segment.text === text && segment.related !== glyph && related.has(segment.related));
    if (pointer) linked = true;
    return pointer ? { text, related: pointer.related } : { text };
  });
  return linked ? result : null;
}
