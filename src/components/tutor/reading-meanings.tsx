import { Fragment, type ReactNode } from 'react';
import { MeaningText } from './meaning-text';
import { PointedParts } from './pointed-meaning';
import type { MeaningPart } from '@/lib/meaning-pointers';
import { groupReadingMeanings } from '@/lib/catalog-store';

// Meaning line of a detail heading for a character whose dictionary meaning has an
// owner-reviewed split by reading (了: le "particle of completed action", liǎo "to finish;
// to understand"). Purpose: never pair one reading with another reading's sense.
// Input: `items`, the exact recorded readings in their catalogue order with their reviewed
// meanings (catalog-store readingMeanings, which fails closed to the combined meaning).
// An item may carry `parts` (meaningPointers for that reading) to add "→ 幹" links to
// senses owned by a related character (干 gàn shows 幹's recorded "trunk of tree or of human body").
// `speaker(reading)` renders that exact reading's own audio (and Sound chart link) right after its
// pinyin label, so the detail heading drops its separate pinyin line instead of listing readings twice.
// Readings sharing one meaning (发 fà / fǎ "hair") share one line, each label keeping its own speaker.
// No state. Lines sit in a two-column grid so meanings align even when labels differ in width.
export function ReadingMeanings({ items, speaker }: { items: { reading: string; meaning: string; parts?: MeaningPart[] | null }[]; speaker?: ((reading: string) => ReactNode) | undefined }) {
  return <h2 className="reading-meanings pointed-meaning">
    {groupReadingMeanings(items).map(({ readings, first: item }) => <span key={readings.join('/')} className="reading-meaning">
      <span className="reading-meaning-label">{readings.map((reading, index) => <span key={reading} className="reading-meaning-reading">{index > 0 && <span className="pinyin reading-meaning-separator" aria-hidden="true">/</span>}<span className="pinyin" lang="zh-Latn-pinyin">{reading}</span>{speaker?.(reading)}</span>)}</span>
      <span>{item.parts ? <PointedParts parts={item.parts}/> : <MeaningText text={item.meaning}/>}</span>
    </span>)}
  </h2>;
}

// Inline one-line rendering of a reviewed per-reading split for grid cards, tooltips and search
// results: prefixes each grouped sense with its reading(s) in orange pinyin ink ("de: … / dì: …"),
// keeping fixed card heights intact. Optional `pointerLines` (aligned with `groupReadingMeanings`)
// adds plain "→ 乾" markers on characters that also carry reviewed meaning pointers. No state.
export function InlineReadingMeanings({ items, pointerLines }: { items: { reading: string; meaning: string }[]; pointerLines?: MeaningPart[][] | null }) {
  return <>{groupReadingMeanings(items).map((group, index) => {
    const pointed = pointerLines?.[index];
    return <Fragment key={group.readings.join('/')}>{index > 0 && ' / '}<span className="pinyin inline-reading-prefix" lang="zh-Latn-pinyin">{group.readings.join(' / ')}:</span> {pointed ? <PointedParts parts={pointed} plain/> : <MeaningText text={group.meaning}/>}</Fragment>;
  })}</>;
}
