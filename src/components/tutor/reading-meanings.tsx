import { MeaningText } from './meaning-text';

// Meaning line of a detail heading for a character whose dictionary meaning has an
// owner-reviewed split by reading (了: le "particle of completed action", liǎo "to finish;
// to understand"). Purpose: never pair one reading with another reading's sense.
// Input: `items`, the exact recorded readings in their catalogue order with their reviewed
// meanings (catalog-store readingMeanings, which fails closed to the combined meaning).
// No state; the speakers stay in the pinyin row above, so this only labels each meaning.
export function ReadingMeanings({ items }: { items: { reading: string; meaning: string }[] }) {
  return <h2 className="reading-meanings">
    {items.map(item => <span key={item.reading} className="reading-meaning">
      <span className="pinyin reading-meaning-label" lang="zh-Latn-pinyin">{item.reading}</span>
      <MeaningText text={item.meaning}/>
    </span>)}
  </h2>;
}
