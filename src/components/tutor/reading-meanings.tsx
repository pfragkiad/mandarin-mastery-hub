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
// No state; the speakers stay in the pinyin row above, so this only labels each meaning.
export function ReadingMeanings({ items }: { items: { reading: string; meaning: string; parts?: MeaningPart[] | null }[] }) {
  return <h2 className="reading-meanings pointed-meaning">
    {items.map(item => <span key={item.reading} className="reading-meaning">
      <span className="pinyin reading-meaning-label" lang="zh-Latn-pinyin">{item.reading}</span>
      <span>{item.parts ? <PointedParts parts={item.parts}/> : <MeaningText text={item.meaning}/>}</span>
    </span>)}
  </h2>;
}
