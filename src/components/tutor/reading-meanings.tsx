import type { ReactNode } from 'react';
import { MeaningText } from './meaning-text';
import { PointedParts } from './pointed-meaning';
import type { MeaningPart } from '@/lib/meaning-pointers';

// Meaning line of a detail heading for a character whose dictionary meaning has an
// owner-reviewed split by reading (了: le "particle of completed action", liǎo "to finish;
// to understand"). Purpose: never pair one reading with another reading's sense.
// Input: `items`, the exact recorded readings in their catalogue order with their reviewed
// meanings (catalog-store readingMeanings, which fails closed to the combined meaning).
// An item may carry `parts` (meaningPointers for that reading) to add "→ 幹" links to
// senses owned by a related character (干 gàn shows 幹's recorded "trunk of tree or of human body").
// `speaker(reading)` renders that exact reading's own audio (and Sound chart link) right after its
// pinyin label, so the detail heading drops its separate pinyin line instead of listing readings twice.
// No state. Lines sit in a two-column grid so meanings align even when labels differ in width.
export function ReadingMeanings({ items, speaker }: { items: { reading: string; meaning: string; parts?: MeaningPart[] | null }[]; speaker?: (reading: string) => ReactNode }) {
  return <h2 className="reading-meanings pointed-meaning">
    {items.map(item => <span key={item.reading} className="reading-meaning">
      <span className="reading-meaning-label"><span className="pinyin" lang="zh-Latn-pinyin">{item.reading}</span>{speaker?.(item.reading)}</span>
      <span>{item.parts ? <PointedParts parts={item.parts}/> : <MeaningText text={item.meaning}/>}</span>
    </span>)}
  </h2>;
}
